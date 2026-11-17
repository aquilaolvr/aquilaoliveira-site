export type ProjectStatus = "processando" | "rascunho" | "publicado" | "falhou";
export type Category = "tv" | "eventos" | "publicidade" | "politica";

export type Results = Partial<Record<
  "views" | "alcance" | "impressoes" | "publico" | "curtidas" | "comentarios" | "compartilhamentos" | "salvamentos",
  number
>> & { fonte?: string };

export interface Project {
  id?: string;
  slug: string;
  number: string | null;
  title: string | null;
  client: string | null;
  category: Category | null;
  subgroup: string | null;
  role: string | null;
  role_en?: string | null;
  year: string | null;
  description?: string | null;
  cover_url: string | null;
  clip_mp4_url: string | null;
  clip_webm_url: string | null;
  stills: string[];
  video_url: string | null;
  results: Results;
  featured: boolean;
  sort_order: number | null;
  status: ProjectStatus;
  error?: string | null;
  source?: string;
  suggested_title?: string | null;
  suggested_description?: string | null;
  frameio_file_id?: string | null;
  frameio_file_name?: string | null;
  frameio_folder_name?: string | null;
  duration_seconds?: number | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

export interface JobLog {
  id: number;
  project_id: string | null;
  job_id: number | null;
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  created_at: string;
}
