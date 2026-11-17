import Link from "next/link";
import { notFound } from "next/navigation";
import Thumb from "@/components/Thumb";
import { requireAdmin } from "@/lib/admin";
import { CATS, METRICS, SUBS } from "@/lib/content";
import { serviceClient } from "@/lib/supabase/server";
import type { JobLog, Project } from "@/lib/types";
import { regenerateSuggestion, regenerateThumb, retryIngest, saveProject } from "../../actions";
import UseSuggestion from "./UseSuggestion";

export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  save: "Salvo.", publish: "Publicado — aparece no site em até 1 minuto.", unpublish: "Voltou para rascunho.",
  thumb: "Nova thumb pedida. Atualize a página em alguns minutos.", ingest: "Nova tentativa na fila.", suggest: "Nova sugestão pedida.",
};

export default async function Edit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const { id } = await params; const { ok } = await searchParams;
  const db = serviceClient();
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Project;
  const { data: logs } = await db.from("job_logs").select("*").eq("project_id", id).order("id", { ascending: false }).limit(40);
  const { data: jobs } = await db.from("jobs").select("id, kind, status, error").eq("project_id", id).in("status", ["pendente", "rodando"]);
  const fromFrameio = !!p.frameio_file_id;
  const r = p.results || {};

  return (
    <main className="adm">
      <p><Link href="/admin" className="cap">← Projetos</Link></p>
      <div className="adm-top">
        <h1>{p.title || p.suggested_title || p.frameio_file_name || "Sem título"}</h1>
        <span className={`badge b-${p.status}`}>{p.status}</span>
      </div>
      {ok && OK[ok] && <p className="adm-ok">{OK[ok]}</p>}
      {p.status === "falhou" && <p className="adm-err"><b>Falhou:</b> {p.error}</p>}
      {jobs && jobs.length > 0 && <p className="adm-note">Na fila do worker: {jobs.map(j => `${j.kind} (${j.status})`).join(", ")}</p>}

      <div className="adm-grid">
        <div>
          <div className="adm-media"><Thumb p={p} autoPlay /></div>
          {fromFrameio && (
            <div className="adm-actions">
              <form action={regenerateThumb}><input type="hidden" name="id" value={id} /><button className="btn">↻ Gerar nova thumb</button></form>
              {p.status === "falhou" && <form action={retryIngest}><input type="hidden" name="id" value={id} /><button className="btn">Tentar de novo</button></form>}
            </div>
          )}
          <p className="adm-small">
            {p.frameio_file_name && <>Frame.io: {p.frameio_folder_name ? `${p.frameio_folder_name} / ` : ""}{p.frameio_file_name}<br /></>}
            {p.duration_seconds ? <>Duração: {Number(p.duration_seconds).toFixed(1)} s<br /></> : null}
            {p.clip_mp4_url && <>MP4: <a href={p.clip_mp4_url} target="_blank">abrir</a> · </>}
            {p.clip_webm_url && <>WebM: <a href={p.clip_webm_url} target="_blank">abrir</a> · </>}
            {p.cover_url && <>Fallback: <a href={p.cover_url} target="_blank">abrir</a></>}
          </p>

          {(p.suggested_title || p.suggested_description) && (
            <div className="adm-suggest">
              <span className="cap">Sugestão do Claude (não publicada)</span>
              {p.suggested_title && <p><b>{p.suggested_title}</b></p>}
              {p.suggested_description && <p>{p.suggested_description}</p>}
              <div className="adm-actions">
                <UseSuggestion title={p.suggested_title} description={p.suggested_description} />
                {fromFrameio && <form action={regenerateSuggestion}><input type="hidden" name="id" value={id} /><button className="btn ghost">Sugerir outra</button></form>}
              </div>
            </div>
          )}

          <h3>Registro</h3>
          <ol className="adm-log">
            {((logs ?? []) as JobLog[]).map(l => (
              <li key={l.id} className={`lv-${l.level}`}><time>{new Date(l.created_at).toLocaleString("pt-BR")}</time> <b>{l.step}</b> {l.message}</li>
            ))}
            {!logs?.length && <li>Sem registros.</li>}
          </ol>
        </div>

        <form action={saveProject} className="adm-form">
          <input type="hidden" name="id" value={id} />
          <label>Título<input name="title" defaultValue={p.title ?? ""} placeholder={p.suggested_title ?? ""} /></label>
          <label>Endereço (slug)<input name="slug" defaultValue={p.slug ?? ""} placeholder="gerado a partir do título" /></label>
          <div className="row2">
            <label>Nº do portfólio<input name="number" defaultValue={p.number ?? ""} placeholder="03.12" /></label>
            <label>Ano / período<input name="year" defaultValue={p.year ?? ""} /></label>
          </div>
          <label>Cliente<input name="client" defaultValue={p.client ?? ""} /></label>
          <div className="row2">
            <label>Frente
              <select name="category" defaultValue={p.category ?? ""}>
                <option value="">—</option>
                {Object.entries(CATS).filter(([k]) => k !== "todos").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Grupo
              <select name="subgroup" defaultValue={p.subgroup ?? ""}>
                <option value="">—</option>
                {Object.entries(SUBS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <label>Função<input name="role" defaultValue={p.role ?? ""} placeholder="Direção, montagem…" /></label>
          <label>Descrição<textarea name="description" rows={4} defaultValue={p.description ?? ""} placeholder={p.suggested_description ?? ""} /></label>
          <label>Vídeo completo (link do YouTube/Vimeo ou arquivo)<input name="video_url" defaultValue={p.video_url ?? ""} /></label>
          <label>Fotos extras (uma URL por linha)<textarea name="stills" rows={3} defaultValue={(p.stills || []).join("\n")} /></label>
          <div className="row2">
            <label>Ordem<input name="sort_order" type="number" defaultValue={p.sort_order ?? ""} /></label>
            <label className="check"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Destaque na Home</label>
          </div>
          <fieldset>
            <legend>Resultados (opcional)</legend>
            <div className="row4">
              {METRICS.map(([k, label]) => <label key={k}>{label}<input name={`r_${k}`} type="number" min={0} defaultValue={(r as Record<string, number>)[k] ?? ""} /></label>)}
            </div>
            <label>Fonte<input name="r_fonte" defaultValue={r.fonte ?? ""} placeholder="YouTube, Instagram do cliente…" /></label>
          </fieldset>
          <div className="adm-actions">
            <button className="btn" name="intent" value="save">Salvar</button>
            {p.status === "publicado"
              ? <button className="btn ghost" name="intent" value="unpublish">Despublicar</button>
              : <button className="btn primary" name="intent" value="publish" disabled={p.status === "processando" || p.status === "falhou"}>Publicar</button>}
            {p.status === "publicado" && p.slug && <Link className="btn ghost" href={`/projeto/${p.slug}`} target="_blank">Ver no site ↗</Link>}
          </div>
        </form>
      </div>
    </main>
  );
}
