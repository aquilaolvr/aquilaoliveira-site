"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, slugify } from "@/lib/admin";
import { serviceClient, sessionClient } from "@/lib/supabase/server";
import { dispatchWorker } from "@/lib/worker";
import type { Results } from "@/lib/types";

const METRIC_KEYS = ["views", "alcance", "impressoes", "publico", "curtidas", "comentarios", "compartilhamentos", "salvamentos"] as const;
const str = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };

function refresh(slug?: string | null) {
  revalidatePath("/"); revalidatePath("/trabalhos");
  if (slug) revalidatePath(`/projeto/${slug}`);
  revalidatePath("/admin");
}

async function log(project_id: string, step: string, message: string) {
  await serviceClient().from("job_logs").insert({ project_id, step, message, level: "info" });
}

export async function saveProject(form: FormData) {
  const { email } = await requireAdmin();
  const id = String(form.get("id"));
  const intent = String(form.get("intent") || "save"); // save | publish | unpublish
  const db = serviceClient();
  const { data: cur, error: e0 } = await db.from("projects").select("status, slug").eq("id", id).single();
  if (e0 || !cur) throw new Error("Projeto não encontrado");

  const results: Results = {};
  for (const k of METRIC_KEYS) { const v = str(form, `r_${k}`); if (v && !isNaN(Number(v))) results[k] = Number(v); }
  const fonte = str(form, "r_fonte"); if (fonte) results.fonte = fonte;

  const title = str(form, "title");
  const patch: Record<string, unknown> = {
    title, slug: str(form, "slug") || (title ? slugify(title) : cur.slug),
    number: str(form, "number"), client: str(form, "client"), category: str(form, "category"),
    subgroup: str(form, "subgroup"), role: str(form, "role"), year: str(form, "year"),
    description: str(form, "description"), video_url: str(form, "video_url"),
    stills: String(form.get("stills") ?? "").split("\n").map(s => s.trim()).filter(Boolean),
    featured: form.get("featured") === "on",
    sort_order: str(form, "sort_order") ? Number(form.get("sort_order")) : null,
    results,
  };

  if (intent === "publish") {
    if (cur.status === "processando" || cur.status === "falhou") throw new Error("Só dá para publicar um rascunho pronto.");
    if (!patch.title || !patch.category || !patch.slug) throw new Error("Preencha título e frente antes de publicar.");
    patch.status = "publicado"; patch.published_at = new Date().toISOString();
  } else if (intent === "unpublish") {
    patch.status = "rascunho";
  }

  const { error } = await db.from("projects").update(patch).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Já existe um projeto com esse endereço (slug)." : error.message);
  await log(id, "admin", `${intent === "publish" ? "Publicado" : intent === "unpublish" ? "Despublicado" : "Salvo"} por ${email}`);
  refresh(String(patch.slug)); if (cur.slug !== patch.slug) refresh(cur.slug);
  redirect(`/admin/projetos/${id}?ok=${intent}`);
}

/** Enfileira um trabalho do worker para o projeto (nova thumb, tentar de novo, nova sugestão). */
async function enqueue(id: string, kind: "thumb" | "ingest" | "suggest", label: string) {
  const { email } = await requireAdmin();
  const db = serviceClient();
  const { data: p } = await db.from("projects").select("frameio_file_id, frameio_account_id, status").eq("id", id).single();
  if (!p?.frameio_file_id) throw new Error("Este projeto não veio do Frame.io — não há vídeo de origem.");
  const { error } = await db.from("jobs").insert({
    project_id: id, kind, frameio_file_id: kind === "ingest" ? null : p.frameio_file_id,
    payload: { account_id: p.frameio_account_id, file_id: p.frameio_file_id, requested_by: email },
  });
  if (error) throw new Error(error.message);
  if (kind === "ingest") await db.from("projects").update({ status: "processando", error: null }).eq("id", id);
  await log(id, "admin", `${label} pedido por ${email}`);
  await dispatchWorker(`${kind}:${id}`);
  revalidatePath("/admin");
  redirect(`/admin/projetos/${id}?ok=${kind}`);
}

export async function regenerateThumb(form: FormData) { await enqueue(String(form.get("id")), "thumb", "Nova thumb"); }
export async function retryIngest(form: FormData) { await enqueue(String(form.get("id")), "ingest", "Nova tentativa"); }
export async function regenerateSuggestion(form: FormData) { await enqueue(String(form.get("id")), "suggest", "Nova sugestão"); }

export async function createManual() {
  await requireAdmin();
  const { data, error } = await serviceClient().from("projects")
    .insert({ status: "rascunho", source: "manual", title: "Novo projeto" }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/admin/projetos/${data.id}`);
}

export async function signOut() {
  await (await sessionClient()).auth.signOut();
  redirect("/admin/login");
}
