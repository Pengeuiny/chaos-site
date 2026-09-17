import { createHash, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Ludus automation — shared by the admin page, its server actions, and the
// worker API routes. See supabase/migrations/20260916200000_ludus_automation.sql
// for the data model and tools/ludus-worker for the process that polls us.

export type LudusRowStatus = "new" | "interpreting" | "proposed" | "stale" | "error";
export type LudusJobKind = "collection" | "event" | "skip";
export type LudusJobStatus = "proposed" | "approved" | "rejected" | "running" | "done" | "failed";

export type LudusSettings = {
  id: 1;
  sheet_url: string | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  last_sync_rows: number | null;
  worker_last_seen_at: string | null;
  worker_status: "ok" | "needs_attention" | null;
  worker_message: string | null;
  worker_version: string | null;
  updated_at: string;
};

export type LudusRow = {
  id: string;
  row_number: number;
  row_hash: string;
  raw: Record<string, string>;
  status: LudusRowStatus;
  error: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

/** What the worker executes for a `collection` job (the only kind implemented so far). */
export type CollectionSpec = {
  name: string;
  /** YYYY-MM-DD */
  deadline_date: string;
  /** HH:MM, 24-hour, Eastern; Ludus only offers 15-minute slots. */
  deadline_time: string;
  fees: { name: string; price: number; description?: string }[];
  form: {
    name: string;
    fields: {
      type: "text" | "paragraph" | "dropdown" | "checkboxes" | "radio";
      label: string;
      required: boolean;
      options?: string[];
    }[];
  } | null;
};

export type LudusJob = {
  id: string;
  row_id: string | null;
  kind: LudusJobKind;
  spec: CollectionSpec | Record<string, unknown>;
  notes: string | null;
  confidence: number | null;
  status: LudusJobStatus;
  attempts: number;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  result: { links?: Record<string, string>; ids?: Record<string, string> } | null;
  error: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LudusJobStep = {
  id: string;
  job_id: string;
  step_no: number;
  label: string;
  screenshot_path: string | null;
  created_at: string;
};

export const SCREENSHOT_BUCKET = "ludus-screenshots";

/** Constant-time check of the worker's bearer token against LUDUS_WORKER_TOKEN. */
export function verifyWorkerToken(request: Request): boolean {
  const expected = process.env.LUDUS_WORKER_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!expected || !presented) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Turn whatever an admin pastes into a URL that returns CSV. Google Sheets
 * share links become the sheet's CSV export (keeping the tab `gid` if one is in
 * the link); anything else is assumed to already serve CSV.
 */
export function sheetCsvUrl(input: string): string {
  const url = input.trim();
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return url;
  const gid = url.match(/[?#&]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

/** Small RFC 4180 parser: quoted fields, doubled quotes, embedded newlines, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function rowHash(raw: Record<string, string>): string {
  const canonical = JSON.stringify(Object.entries(raw).sort(([a], [b]) => (a < b ? -1 : 1)));
  return createHash("sha256").update(canonical).digest("hex");
}

export type SyncResult = { inserted: number; seen: number; stale: number };

/**
 * Pull the sheet, turn each non-empty data row into {header: value}, and
 * reconcile with ludus_rows by content hash: unseen hashes become `new` rows
 * (the worker will propose jobs for them), known hashes get last_seen_at
 * bumped, and rows that vanished from the sheet are marked `stale` unless a
 * job already ran for them (done/failed history is kept as-is).
 */
export async function syncSheet(admin: SupabaseClient, sheetUrl: string): Promise<SyncResult> {
  const res = await fetch(sheetCsvUrl(sheetUrl), { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  const ctype = res.headers.get("content-type") || "";
  const text = await res.text();
  if (/text\/html/i.test(ctype) && /<html/i.test(text.slice(0, 500))) {
    throw new Error("The link returned a web page, not CSV — is the sheet shared as 'Anyone with the link can view'?");
  }
  const table = parseCsv(text);
  if (table.length < 2) throw new Error("Sheet has no data rows (first row must be headers).");

  const headers = table[0].map((h, i) => (h.trim() || `column_${i + 1}`));
  const seenHashes: string[] = [];
  let inserted = 0;
  const now = new Date().toISOString();

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    if (cells.every((c) => !c.trim())) continue;
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = (cells[i] ?? "").trim(); });
    const hash = rowHash(raw);
    seenHashes.push(hash);

    const { data: existing } = await admin.from("ludus_rows").select("id, status").eq("row_hash", hash).maybeSingle();
    if (existing) {
      await admin.from("ludus_rows").update({
        last_seen_at: now,
        row_number: r + 1,
        // A row that disappeared and came back is fresh work again.
        ...(existing.status === "stale" ? { status: "new", error: null } : {}),
      }).eq("id", existing.id);
    } else {
      const { error } = await admin.from("ludus_rows").insert({ row_number: r + 1, row_hash: hash, raw, status: "new", last_seen_at: now });
      if (error) throw new Error(`Insert failed: ${error.message}`);
      inserted++;
    }
  }

  // Rows no longer in the sheet: stale, unless they already produced a run.
  const { data: candidates } = await admin
    .from("ludus_rows")
    .select("id, ludus_jobs(status)")
    .in("status", ["new", "interpreting", "proposed"]);
  let stale = 0;
  for (const c of (candidates ?? []) as { id: string; ludus_jobs: { status: string }[] }[]) {
    const { data: rowRec } = await admin.from("ludus_rows").select("row_hash").eq("id", c.id).single();
    if (!rowRec || seenHashes.includes(rowRec.row_hash)) continue;
    const ran = c.ludus_jobs?.some((j) => ["running", "done", "failed"].includes(j.status));
    if (ran) continue;
    await admin.from("ludus_rows").update({ status: "stale" }).eq("id", c.id);
    // Proposals for a vanished row shouldn't sit in the approval queue.
    await admin.from("ludus_jobs").update({ status: "rejected", notes: "Row removed from sheet before approval." })
      .eq("row_id", c.id).in("status", ["proposed", "approved"]);
    stale++;
  }

  await admin.from("ludus_settings").update({
    last_synced_at: now, last_sync_error: null, last_sync_rows: seenHashes.length, updated_at: now,
  }).eq("id", 1);

  return { inserted, seen: seenHashes.length, stale };
}
