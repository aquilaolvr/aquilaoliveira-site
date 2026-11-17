"use client";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";

export default function WorksGrid({ projects, cats, children }: { projects: Project[]; cats: Record<string, string>; children: React.ReactNode[] }) {
  const [filter, setFilter] = useState("todos");
  const count = useMemo(() => {
    const c: Record<string, number> = { todos: projects.length };
    projects.forEach(p => { if (p.category) c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }, [projects]);
  return (
    <>
      <div className="filters">
        {Object.entries(cats).map(([k, label]) => (
          <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>{label}<sup>{count[k] || 0}</sup></button>
        ))}
      </div>
      <section id="grid"><div className="grid3">
        {/* tudo fica montado (para as animações já estarem observadas); o filtro só esconde */}
        {projects.map((p, i) => {
          const show = filter === "todos" || p.category === filter;
          return <div key={p.slug} hidden={!show} style={show ? { display: "contents" } : undefined}>{children[i]}</div>;
        })}
      </div></section>
    </>
  );
}
