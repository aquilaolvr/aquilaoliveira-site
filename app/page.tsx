import Link from "next/link";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import Manifesto from "@/components/Manifesto";
import { FORMACAO, LOGOS, SET, TRAJ } from "@/lib/content";
import { getPublished } from "@/lib/projects";
import T from "@/lib/texts.json";

export const revalidate = 60; // projetos publicados aparecem em até 1 minuto

export default async function Home() {
  const projects = await getPublished();
  const featured = projects.filter(p => p.featured);
  const strip = SET.map(s => {
    const p = projects.find(x => x.slug === s.to);
    return { img: s.img, href: p ? `/projeto/${p.slug}` : "/#sobre", label: p?.title ?? s.label ?? "" };
  });
  const clients = [...LOGOS, ...LOGOS];

  return (
    <main>
      <section className="hero" id="hero">
        <Link className="ph im kb-l" href="/projeto/delacruz" data-hover aria-label="Ver projeto" style={{ "--bp": "66% 45%" } as React.CSSProperties}>
          <i className="sl on" style={{ backgroundImage: "url(/media/images/head.jpg)" }} />
        </Link>
        <div className="hero-txt">
          <h1><span className="ln"><span>Áquila</span></span><span className="ln"><span>Oliveira</span></span></h1>
          <div className="roles cap"><span>{T.r1}</span><span>{T.r2}</span><span>{T.r3}</span></div>
        </div>
        <span className="scrollcue cap mute">Role ↓</span>
      </section>

      <Manifesto text={T.manifesto} />

      <section className="feat">
        <div className="sec-head rv"><span className="cap">Trabalhos selecionados</span><span className="cap mute">2014 — 2026</span></div>
        <div className="grid3">{featured.map(p => <Card key={p.slug} p={p} />)}</div>
        <Link href="/trabalhos" className="all-link cap rv">Ver todos os trabalhos →</Link>
      </section>

      <section className="strip" aria-label="Galeria">
        <div className="sec-head rv"><span className="cap">Em cena</span><span className="cap mute">Clique numa foto para ver o projeto</span></div>
        <div className="strip-view"><div className="strip-track">
          {[...strip, ...strip].map((s, i) => (
            <Link key={i} className={`shot ${i % 3 === 1 ? "tall" : i % 3 === 2 ? "wide" : ""}`} href={s.href} data-hover>
              <i style={{ backgroundImage: `url(${s.img})` }} /><span className="cap">{s.label}</span>
            </Link>
          ))}
        </div></div>
      </section>

      <section className="vert" id="sobre">
        <span className="cap rv">Sobre</span>
        <div className="about">
          <div className="ph clip im kb-r" style={{ "--bp": "50% 22%" } as React.CSSProperties}><i className="sl on" style={{ backgroundImage: "url(/media/images/retrato.jpg)" }} /></div>
          <div className="about-col">
            <p className="about-txt rv">{T.aboutTxt}</p>
            <div className="about-body"><p className="rv">{T.aboutP1}</p><p className="rv">{T.aboutP2}</p><p className="rv">{T.aboutP3}</p></div>
            <span className="cap traj-h">Trajetória</span>
            <ul className="traj">{TRAJ.map(x => <li key={x.y} className="rv"><span className="cap mute">{x.y}</span><p>{x.pt}</p></li>)}</ul>
            <span className="cap traj-h">Formação</span><p className="form rv">{FORMACAO}</p>
          </div>
        </div>
        <span className="cap rv">Prática</span>
        <div className="vert-grid">
          {([1, 2, 3] as const).map(n => (
            <div key={n} className="vert-col rv">
              <span className="cap mute">0{n}</span>
              <h4>{T[`v${n}t`]}</h4><p>{T[`v${n}p`]}</p>
              <ul className="cap mute"><li>{T[`v${n}a`]}</li><li>{T[`v${n}b`]}</li><li>{T[`v${n}c`]}</li></ul>
            </div>
          ))}
        </div>
      </section>

      <section className="clients">
        <span className="cap mute rv">Clientes &amp; parceiros</span>
        <div className="marquee"><div className="marquee-track">{clients.map((c, i) => <span key={i}>{c}</span>)}</div></div>
      </section>

      <section className="closing" id="contato">
        <h2 className="rv" dangerouslySetInnerHTML={{ __html: T.closing }} />
        <a className="mail rv" href="mailto:contato@aquilaoliveira.com">contato@aquilaoliveira.com</a>
        <a className="whats cap rv" href="https://wa.me/5571986744015" target="_blank" rel="noopener">WhatsApp · +55 71 98674-4015</a>
      </section>
      <Footer />
    </main>
  );
}
