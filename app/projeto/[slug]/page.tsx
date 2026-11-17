import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Thumb from "@/components/Thumb";
import { CATS, METRICS, SUBS, vimeoId, youtubeId } from "@/lib/content";
import { getPublished } from "@/lib/projects";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getPublished()).find(x => x.slug === slug);
  return { title: p ? `${p.title} — Áquila Oliveira` : "Projeto — Áquila Oliveira" };
}

export default async function Projeto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await getPublished();
  const i = all.findIndex(x => x.slug === slug);
  if (i < 0) notFound();
  const p = all[i], next = all[(i + 1) % all.length];
  const yt = youtubeId(p.video_url), vm = vimeoId(p.video_url);
  const embed = yt ? `https://www.youtube.com/embed/${yt}?rel=0` : vm ? `https://player.vimeo.com/video/${vm}` : null;
  const hosted = !embed && p.video_url && /\.(mp4|webm|mov)(\?|$)/i.test(p.video_url) ? p.video_url : null;
  const metrics = METRICS.filter(([k]) => typeof p.results?.[k as keyof typeof p.results] === "number");

  return (
    <main>
      <section className="p-head"><span className="cap rv">{p.number} · {p.category ? CATS[p.category] : ""}</span><h1 className="rv">{p.title}</h1></section>
      <section className="p-hero"><Thumb p={p} autoPlay /></section>
      <section className="ficha">
        <div className="rv"><span className="cap mute">Cliente</span><p>{p.client}</p></div>
        <div className="rv"><span className="cap mute">Grupo</span><p>{p.subgroup ? SUBS[p.subgroup] : "—"}</p></div>
        <div className="rv"><span className="cap mute">Função</span><p>{p.role}</p></div>
        <div className="rv"><span className="cap mute">Ano</span><p>{p.year || "—"}</p></div>
      </section>
      {metrics.length > 0 && (
        <section className="results">
          <span className="cap rv">Resultados</span>
          <div className="res-grid">
            {metrics.map(([k, label]) => {
              const v = p.results[k as keyof typeof p.results] as number;
              return <div key={k} className="res rv"><b data-count={v}>{v.toLocaleString("pt-BR")}</b><span className="cap mute">{label}</span></div>;
            })}
          </div>
          {p.results.fonte && <p className="cap mute res-src rv">Fonte: {p.results.fonte}</p>}
        </section>
      )}
      <section className="p-body">
        <p className="lead rv">{p.description || p.role}</p>
        {embed && <div className="video rv"><iframe src={embed} title={p.title ?? ""} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>}
        {hosted && <div className="video rv"><video src={hosted} controls playsInline poster={p.cover_url ?? undefined} /></div>}
        {p.stills.length > 0 && (
          <div className="stills">{p.stills.map(s => <div key={s} className="ph clip im"><i className="sl on" style={{ backgroundImage: `url(${s})` }} /></div>)}</div>
        )}
        {!embed && !hosted && p.stills.length === 0 && <p className="soon cap mute rv">Vídeo e imagens em breve.</p>}
      </section>
      <Link className="next" href={`/projeto/${next.slug}`} data-hover><span className="cap mute">Próximo projeto · {next.number}</span><h2>{next.title}</h2></Link>
      <Footer />
    </main>
  );
}
