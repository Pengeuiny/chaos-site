"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function str(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function addBoardMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/board?error=nodb");

  const name = str(formData.get("name"));
  const role = str(formData.get("role"));
  if (!name) redirect("/admin/board?error=name");
  if (!role) redirect("/admin/board?error=role");

  const { data: last } = await admin
    .from("people")
    .select("sort_order")
    .eq("group_name", "board")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await admin.from("people").insert({
    group_name: "board",
    name,
    role,
    email: str(formData.get("email")),
    image_url: str(formData.get("image_url")),
    sort_order,
  });

  if (error) redirect("/admin/board?error=save");
  revalidatePath("/");
  redirect("/admin/board?ok=added");
}

export async function updateBoardMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/board?error=nodb");

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const role = str(formData.get("role"));
  if (!id) redirect("/admin/board?error=save");
  if (!name) redirect("/admin/board?error=name");
  if (!role) redirect("/admin/board?error=role");

  const { error } = await admin
    .from("people")
    .update({
      name,
      role,
      email: str(formData.get("email")),
      image_url: str(formData.get("image_url")),
    })
    .eq("id", id);

  if (error) redirect("/admin/board?error=save");
  revalidatePath("/");
  redirect("/admin/board?ok=updated");
}

export async function deleteBoardMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/board?error=nodb");
  const id = str(formData.get("id"));
  if (id) await admin.from("people").delete().eq("id", id);
  revalidatePath("/");
  redirect("/admin/board?ok=deleted");
}

/** Swap a board member's sort_order with the neighbor above/below it. */
export async function moveBoardMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/board?error=nodb");

  const id = str(formData.get("id"));
  const direction = str(formData.get("direction"));
  if (!id || (direction !== "up" && direction !== "down")) {
    redirect("/admin/board?error=save");
  }

  const { data } = await admin
    .from("people")
    .select("id, sort_order")
    .eq("group_name", "board")
    .order("sort_order", { ascending: true });
  const list = data ?? [];
  const idx = list.findIndex((p) => p.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;

  if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
    const a = list[idx];
    const b = list[swapIdx];
    await admin.from("people").update({ sort_order: b.sort_order }).eq("id", a.id);
    await admin.from("people").update({ sort_order: a.sort_order }).eq("id", b.id);
  }

  revalidatePath("/");
  redirect("/admin/board?ok=reordered");
}

export async function addItsMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/its?error=nodb");

  const name = str(formData.get("name"));
  const role = str(formData.get("role"));
  if (!name) redirect("/admin/its?error=name");
  if (!role) redirect("/admin/its?error=role");

  const { data: last } = await admin
    .from("people")
    .select("sort_order")
    .eq("group_name", "its")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await admin.from("people").insert({
    group_name: "its",
    name,
    role,
    email: str(formData.get("email")),
    image_url: str(formData.get("image_url")),
    sort_order,
  });

  if (error) redirect("/admin/its?error=save");
  revalidatePath("/");
  redirect("/admin/its?ok=added");
}

export async function updateItsMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/its?error=nodb");

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const role = str(formData.get("role"));
  if (!id) redirect("/admin/its?error=save");
  if (!name) redirect("/admin/its?error=name");
  if (!role) redirect("/admin/its?error=role");

  const { error } = await admin
    .from("people")
    .update({
      name,
      role,
      email: str(formData.get("email")),
      image_url: str(formData.get("image_url")),
    })
    .eq("id", id);

  if (error) redirect("/admin/its?error=save");
  revalidatePath("/");
  redirect("/admin/its?ok=updated");
}

export async function deleteItsMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/its?error=nodb");
  const id = str(formData.get("id"));
  if (id) await admin.from("people").delete().eq("id", id);
  revalidatePath("/");
  redirect("/admin/its?ok=deleted");
}

/** Swap an ITS board member's sort_order with the neighbor above/below it. */
export async function moveItsMember(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) redirect("/admin/its?error=nodb");

  const id = str(formData.get("id"));
  const direction = str(formData.get("direction"));
  if (!id || (direction !== "up" && direction !== "down")) {
    redirect("/admin/its?error=save");
  }

  const { data } = await admin
    .from("people")
    .select("id, sort_order")
    .eq("group_name", "its")
    .order("sort_order", { ascending: true });
  const list = data ?? [];
  const idx = list.findIndex((p) => p.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;

  if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
    const a = list[idx];
    const b = list[swapIdx];
    await admin.from("people").update({ sort_order: b.sort_order }).eq("id", a.id);
    await admin.from("people").update({ sort_order: a.sort_order }).eq("id", b.id);
  }

  revalidatePath("/");
  redirect("/admin/its?ok=reordered");
}
