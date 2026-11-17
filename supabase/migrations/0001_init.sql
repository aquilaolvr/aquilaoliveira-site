-- =====================================================================
-- Áquila Oliveira — banco do site (Supabase / Postgres)
-- Rode no SQL Editor do Supabase (ou `supabase db push`), depois seed.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Projetos ----------
do $$ begin
  create type public.project_status as enum ('processando', 'rascunho', 'publicado', 'falhou');
exception when duplicate_object then null; end $$;

create table if not exists public.projects (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique,                          -- endereço: /projeto/<slug>
  number                text,                                 -- nº do portfólio (ex.: 02.05)
  title                 text,
  client                text,
  category              text check (category in ('tv', 'eventos', 'publicidade', 'politica')),
  subgroup              text,                                 -- televisao, clipe, cobertura, doc…
  role                  text,                                 -- função / descrição curta (PT)
  role_en               text,
  year                  text,
  description           text,

  -- mídia
  cover_url             text,                                 -- imagem estática (fallback) 16:9
  clip_mp4_url          text,                                 -- thumb animada 640×360 H.264
  clip_webm_url         text,                                 -- thumb animada 640×360 VP9
  stills                text[] not null default '{}',
  video_url             text,                                 -- YouTube/Vimeo ou arquivo hospedado

  results               jsonb not null default '{}',          -- {views, alcance, curtidas, …, fonte}
  featured              boolean not null default false,
  sort_order            integer,

  -- fluxo
  status                public.project_status not null default 'rascunho',
  error                 text,
  source                text not null default 'manual',      -- manual | frameio
  suggested_title       text,                                 -- sugestão do Claude (nunca publica sozinha)
  suggested_description text,

  -- Frame.io
  frameio_file_id       text unique,                          -- impede duplicar se o webhook repetir
  frameio_account_id    text,
  frameio_file_name     text,
  frameio_folder_name   text,
  duration_seconds      numeric,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  published_at          timestamptz
);

create index if not exists projects_status_idx on public.projects (status, sort_order);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------- Fila de trabalhos do worker ----------
create table if not exists public.jobs (
  id               bigserial primary key,
  project_id       uuid references public.projects (id) on delete cascade,
  kind             text not null check (kind in ('ingest', 'thumb', 'suggest')),
  status           text not null default 'pendente' check (status in ('pendente', 'rodando', 'concluido', 'falhou')),
  frameio_file_id  text,
  payload          jsonb not null default '{}',
  attempts         integer not null default 0,
  error            text,
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz
);
create index if not exists jobs_pending_idx on public.jobs (status, id);

-- ---------- Logs de cada etapa ----------
create table if not exists public.job_logs (
  id          bigserial primary key,
  project_id  uuid references public.projects (id) on delete cascade,
  job_id      bigint references public.jobs (id) on delete cascade,
  level       text not null default 'info' check (level in ('info', 'warn', 'error')),
  step        text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists job_logs_project_idx on public.job_logs (project_id, id desc);

-- ---------- Credenciais do Frame.io (renovação automática do acesso) ----------
create table if not exists public.frameio_auth (
  id             integer primary key default 1 check (id = 1),
  access_token   text,
  refresh_token  text,
  expires_at     timestamptz,
  updated_at     timestamptz not null default now()
);

-- ---------- Funções usadas pelo webhook e pelo worker ----------

-- Enfileira um arquivo do Frame.io uma única vez (webhook repetido não duplica).
create or replace function public.enqueue_frameio_file(p_file_id text, p_account_id text, p_event text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from projects where frameio_file_id = p_file_id)
     or exists (select 1 from jobs where kind = 'ingest' and frameio_file_id = p_file_id and status <> 'falhou') then
    return false;
  end if;
  insert into jobs (kind, frameio_file_id, payload)
  values ('ingest', p_file_id, jsonb_build_object('account_id', p_account_id, 'event', p_event));
  return true;
end $$;

-- O worker pega o próximo trabalho pendente sem disputar com outro worker.
create or replace function public.claim_job()
returns setof public.jobs language sql security definer set search_path = public as $$
  update jobs set status = 'rodando', started_at = now(), attempts = attempts + 1
  where id = (select id from jobs where status = 'pendente' order by id for update skip locked limit 1)
  returning *;
$$;

-- Trabalhos presos em "rodando" há muito tempo voltam para a fila.
create or replace function public.requeue_stale_jobs(p_minutes integer default 30)
returns integer language sql security definer set search_path = public as $$
  with r as (
    update jobs set status = 'pendente'
    where status = 'rodando' and started_at < now() - make_interval(mins => p_minutes) and attempts < 3
    returning 1)
  select count(*)::int from r;
$$;

-- ---------- Segurança (RLS) ----------
-- Público lê só projetos publicados. Todo o resto passa pelo servidor com a service role.
alter table public.projects     enable row level security;
alter table public.jobs         enable row level security;
alter table public.job_logs     enable row level security;
alter table public.frameio_auth enable row level security;

drop policy if exists "publicados são públicos" on public.projects;
create policy "publicados são públicos" on public.projects
  for select using (status = 'publicado');

revoke execute on function public.enqueue_frameio_file(text, text, text) from public, anon, authenticated;
revoke execute on function public.claim_job() from public, anon, authenticated;
revoke execute on function public.requeue_stale_jobs(integer) from public, anon, authenticated;

-- ---------- Armazenamento (thumbs, fallback e vídeos) ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
