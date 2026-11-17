import Link from "next/link";
import { SUBS } from "@/lib/content";
import type { Project } from "@/lib/types";
import Thumb from "./Thumb";

export default function Card({ p }: { p: Project }) {
  return (
    <Link className="card" href={`/projeto/${p.slug}`} data-hover>
      <Thumb p={p} />
      <div className="meta rv"><h3>{p.title}</h3><span className="cap mute">{p.number}</span></div>
      <div className="sub cap mute rv">{[p.client, p.subgroup ? SUBS[p.subgroup] : null, p.year].filter(Boolean).join(" · ")}</div>
    </Link>
  );
}
