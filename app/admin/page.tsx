import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import type { Project, ProjectStatus } from "@/lib/types";
import { createManual, signOut } from "./actions";

export const dynamic = "force-dynamic";

const ORDER: [ProjectStatus, string][] = [["falhou", "Falharam"], ["processando", "Processando"], ["rascunho", "Rascunhos"], ["publicado", "Publicados"]];

export default async function Admin() {
  const { email } = await requireAdmin();
  const { data, error } = await serviceClient().from("projects")
    .select("id, slug, number, title, status, error, source, cover_url, clip_mp4_url, frameio_file_name, suggested_title, updated_at")
    .order("updated_at", { ascending: false });
  const list = (data ?? []) as Project[];

  return (
    <main className="adm">
      <div className="adm-top">
        <h1>Projetos</h1>
        <div className="adm-actions">
          <form action={createManual}><button className="btn">+ Novo projeto manual</button></form>
          <form action={signOut}><button className="btn ghost">Sair ({email})</button></form>
        </div>
      </div>
      {error && <p className="adm-err">Erro ao ler o banco: {error.message}</p>}
      {ORDER.map(([st, label]) => {
        const items = list.filter(p => p.status === st);
        if (!items.length) return null;
        return (
          <section key={st} className="adm-group">
            <h2>{label} <sup>{items.length}</sup></h2>
            <div className="adm-list">
              {items.map(p => (
                <Link key={p.id} href={`/admin/projetos/${p.id}`} className={`adm-item st-${p.status}`}>
                  <span className="adm-thumb" style={{ backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined }} />
                  <span className="adm-info">
                    <b>{p.title || p.suggested_title || p.frameio_file_name || "Sem título"}</b>
                    <small>{[p.number, p.source === "frameio" ? "Frame.io" : null, new Date(p.updated_at!).toLocaleString("pt-BR")].filter(Boolean).join(" · ")}</small>
                    {p.status === "falhou" && <small className="adm-err">{p.error}</small>}
                  </span>
                  <span className={`badge b-${p.status}`}>{p.status}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
