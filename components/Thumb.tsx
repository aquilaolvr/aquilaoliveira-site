import type { Project } from "@/lib/types";

/** Thumb 16:9: vídeo em loop (WebM + MP4) com a imagem estática como poster/fallback. */
export default function Thumb({ p, autoPlay = false }: { p: Pick<Project, "clip_mp4_url" | "clip_webm_url" | "cover_url" | "title">; autoPlay?: boolean }) {
  if (p.clip_mp4_url || p.clip_webm_url) {
    return (
      <div className="ph clip vthumb">
        <video muted loop playsInline preload="none" poster={p.cover_url ?? undefined} data-autoplay autoPlay={autoPlay}>
          {p.clip_webm_url && <source src={p.clip_webm_url} type="video/webm" />}
          {p.clip_mp4_url && <source src={p.clip_mp4_url} type="video/mp4" />}
        </video>
        <span className="live cap">● Vídeo</span>
      </div>
    );
  }
  return (
    <div className="ph clip im">
      {p.cover_url ? <i className="sl on art" style={{ backgroundImage: `url(${p.cover_url})` }} /> : <i className="drift" />}
    </div>
  );
}
