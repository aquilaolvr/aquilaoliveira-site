import content from "./site-content.json";

export const CATS: Record<string, string> = Object.fromEntries(Object.entries(content.cats).map(([k, v]) => [k, v.pt]));
export const SUBS: Record<string, string> = Object.fromEntries(Object.entries(content.subs).map(([k, v]) => [k, v.pt]));
export const TRAJ = content.traj;
export const FORMACAO = content.formacao.pt;
export const LOGOS: string[] = content.logos;
export const SET = content.set as { img: string; to: string; label?: string }[];

export const METRICS: [string, string][] = [
  ["views", "Views"], ["alcance", "Alcance"], ["impressoes", "Impressões"], ["publico", "Público"],
  ["curtidas", "Curtidas"], ["comentarios", "Comentários"], ["compartilhamentos", "Compartilhamentos"], ["salvamentos", "Salvamentos"],
];

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export function vimeoId(url: string | null | undefined): string | null {
  const m = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
