// Turns one sheet row into proposed Ludus jobs using a local Ollama model.
// Output is constrained with a JSON schema so the site can validate it, and a
// human approves every proposal on /admin/ludus before anything runs.
//
//   node interpret.mjs '{"Item":"Participation Fee - Gatsby","Amount":"75","Due":"10/1"}'

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:120b";

const FIELD_TYPES = ["text", "paragraph", "dropdown", "checkboxes", "radio"];

export const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["collection", "skip"] },
          confidence: { type: "number" },
          notes: { type: "string" },
          spec: {
            type: "object",
            properties: {
              name: { type: "string" },
              deadline_date: { type: "string" },
              deadline_time: { type: "string" },
              fees: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, price: { type: "number" }, description: { type: "string" } },
                  required: ["name", "price"],
                },
              },
              form: {
                type: ["object", "null"],
                properties: {
                  name: { type: "string" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: FIELD_TYPES },
                        label: { type: "string" },
                        required: { type: "boolean" },
                        options: { type: "array", items: { type: "string" } },
                      },
                      required: ["type", "label", "required"],
                    },
                  },
                },
                required: ["name", "fields"],
              },
            },
            required: ["name", "deadline_date", "deadline_time", "fees", "form"],
          },
        },
        required: ["kind", "confidence", "notes", "spec"],
      },
    },
  },
  required: ["jobs"],
};

function systemPrompt(today) {
  return `You convert one row of a booster club's planning spreadsheet into things to create in Ludus, a school ticketing system. Today is ${today} (Eastern time, USA).

You can propose:
- "collection": a fee parents pay online (participation fee, dues, trip payment, uniform cost). Spec fields:
  name (public title, keep the row's wording; include the show/trip name),
  deadline_date (YYYY-MM-DD; parents cannot pay online after it),
  deadline_time (HH:MM 24-hour Eastern, rounded DOWN to a 15-minute slot; use "23:45" for "end of day" or when no time is given),
  fees: one or more {name, price (number, USD), description?}. A single-price row gets one fee named for what is paid (e.g. "Participation Fee"). Separate options (e.g. "$50 without shirt / $65 with shirt") become separate fees.
  form: null unless the row asks for information from the family (t-shirt size, allergies, dietary needs, grade, emergency contact, etc.). Then {name, fields[]}. Field types: text (short answer), paragraph, dropdown/radio (single choice, needs options), checkboxes (multi). Never add name, email, phone, or address fields — Ludus collects those at checkout. Ask for the student's name only as "Student Name" (text, required) when the payer is a parent paying on a student's behalf.
- "skip": the row is not something to create (a note, a heading, a to-do, an event without any payment, or already handled). Explain why in notes.

Rules:
- One job per row unless the row clearly describes several separate fees.
- If the year is missing, pick the next occurrence on or after today.
- If the deadline is missing, still propose the collection with your best estimate (two weeks before any event date in the row, else 30 days from today) and say so in notes with confidence <= 0.5.
- Prices are numbers, no "$".
- confidence is 0..1: how sure you are that a board member would approve this unchanged.
- notes: 1-3 short sentences: what you inferred or could not tell. Plain language.
Return only JSON matching the schema.`;
}

/**
 * @param {Record<string,string>} raw  the sheet row as {header: value}
 * @returns {Promise<{jobs: {kind:string, spec:any, notes:string, confidence:number}[]}>}
 */
export async function interpretRow(raw, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const body = {
    model: OLLAMA_MODEL,
    stream: false,
    format: PROPOSAL_SCHEMA,
    options: { temperature: 0 },
    messages: [
      { role: "system", content: systemPrompt(today) },
      { role: "user", content: `Spreadsheet row (column: value):\n${JSON.stringify(raw, null, 2)}` },
    ],
  };
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data?.message?.content ?? "";
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error(`Model returned non-JSON: ${content.slice(0, 300)}`); }
  const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  return { jobs: jobs.map(normalizeJob).filter(Boolean) };
}

function normalizeJob(j) {
  if (!j || typeof j !== "object") return null;
  const kind = j.kind === "collection" ? "collection" : "skip";
  const notes = String(j.notes ?? "").trim();
  const confidence = Math.max(0, Math.min(1, Number(j.confidence) || 0));
  if (kind === "skip") return { kind, notes, confidence, spec: {} };
  const s = j.spec ?? {};
  const spec = {
    name: String(s.name ?? "").trim(),
    deadline_date: String(s.deadline_date ?? "").trim(),
    deadline_time: roundToSlot(String(s.deadline_time ?? "23:45").trim()),
    fees: (Array.isArray(s.fees) ? s.fees : []).map((f) => ({
      name: String(f?.name ?? "").trim(),
      price: Math.round(Number(f?.price) * 100) / 100,
      ...(f?.description ? { description: String(f.description).trim() } : {}),
    })).filter((f) => f.name && Number.isFinite(f.price)),
    form: s.form && Array.isArray(s.form.fields) && s.form.fields.length
      ? {
          name: String(s.form.name || `${s.name} Form`).trim(),
          fields: s.form.fields
            .map((f) => ({
              type: FIELD_TYPES.includes(f?.type) ? f.type : "text",
              label: String(f?.label ?? "").trim(),
              required: Boolean(f?.required),
              ...(Array.isArray(f?.options) && f.options.length ? { options: f.options.map(String) } : {}),
            }))
            .filter((f) => f.label && !/^(name|email|e-mail|phone|address)$/i.test(f.label)),
        }
      : null,
  };
  return { kind, notes, confidence, spec };
}

/** Ludus deadline times are 15-minute slots; round down so a deadline is never later than asked. */
function roundToSlot(hhmm) {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "23:45";
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.floor(Math.min(59, Number(m[2])) / 15) * 15;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

if (process.argv[1] && process.argv[1].endsWith("interpret.mjs") && process.argv[2]) {
  const raw = JSON.parse(process.argv[2]);
  console.log(JSON.stringify(await interpretRow(raw), null, 2));
}
