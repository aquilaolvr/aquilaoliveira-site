import Card from "@/components/Card";
import Footer from "@/components/Footer";
import WorksGrid from "@/components/WorksGrid";
import { CATS } from "@/lib/content";
import { getPublished } from "@/lib/projects";

export const revalidate = 60;
export const metadata = { title: "Trabalhos — Áquila Oliveira" };

export default async function Trabalhos() {
  const projects = await getPublished();
  return (
    <main>
      <section className="works-top">
        <h1 className="rv">Trabalhos</h1>
        <p className="stats cap mute rv">{projects.length} obras · 4 frentes · 2014 — 2026</p>
        <WorksGrid projects={projects} cats={CATS}>{projects.map(p => <Card key={p.slug} p={p} />)}</WorksGrid>
      </section>
      <Footer />
    </main>
  );
}
