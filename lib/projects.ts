import seed from "./seed-projects.json";
import { hasSupabase } from "./env";
import { publicClient } from "./supabase/server";
import type { Project } from "./types";

const SEED = (seed as unknown as Project[]);

/** Projetos publicados, na ordem do portfólio. */
export async function getPublished(): Promise<Project[]> {
  if (!hasSupabase) return SEED;
  const { data, error } = await publicClient()
    .from("projects").select("*").eq("status", "publicado")
    .order("sort_order", { ascending: true, nullsFirst: false }).order("published_at", { ascending: false });
  if (error) { console.error("[projects] erro ao ler do Supabase, usando dados de exemplo:", error.message); return SEED; }
  return (data ?? []) as Project[];
}

export async function getBySlug(slug: string): Promise<Project | null> {
  const all = await getPublished();
  return all.find(p => p.slug === slug) ?? null;
}
