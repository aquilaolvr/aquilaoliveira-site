# aquilaoliveira.com — site novo (Next.js + Supabase + worker Python)

Portfólio de Áquila Oliveira com **entrada automática de projetos a partir do Frame.io**:
você coloca um vídeo numa pasta do Frame.io → o sistema baixa, gera a thumb animada,
cria um **rascunho** no banco → você revisa no **/admin** e publica.

```
Frame.io (pasta "Portfólio")
   │  webhook "arquivo pronto"            (plano B: polling a cada 5 min)
   ▼
Next.js  /api/frameio/webhook  ── valida assinatura ── enfileira (sem duplicar) ──► Supabase: tabela jobs
   │                                                                                   │
   └── aciona o GitHub Actions (repository_dispatch) ──► worker Python ◄───────────────┘
                                                          1. confere a pasta
                                                          2. baixa o vídeo (original/proxy)
                                                          3. FFmpeg: 5 trechos de 1 s → thumb 5 s (MP4 + WebM) + JPG
                                                          4. sobe para o Supabase Storage
                                                          5. projeto = rascunho (+ sugestão do Claude, opcional)
                                                                    │
Next.js  /admin  ◄──────────────────────────────────────────────────┘
   operador preenche e publica · "Gerar nova thumb" · "Tentar de novo" · logs de cada etapa
```

## Peças

| Pasta | O que é |
|---|---|
| `app/` | Site (Next.js 15, App Router): Home, `/trabalhos`, `/projeto/[slug]`, `/admin`, `/api/frameio/*` |
| `components/`, `lib/` | Componentes, acesso ao Supabase, assinatura do webhook (`lib/frameio.ts`) |
| `supabase/migrations/0001_init.sql` | Tabelas `projects`, `jobs`, `job_logs`, `frameio_auth`, funções da fila, RLS e bucket `media` |
| `supabase/seed.sql` | Os 51 projetos do site atual |
| `worker/` | Worker em Python: Frame.io, FFmpeg, upload, sugestão do Claude |
| `.github/workflows/worker.yml` | Roda o worker (na hora, via dispatch, e a cada 5 min) |
| `public/media/` | Fotos, cards e thumbs dos projetos que já existiam |

**Sem Supabase configurado, o site funciona com os 51 projetos de exemplo** (`lib/seed-projects.json`) — bom para testar o visual.

## Banco: tabela `projects` (principais campos)

| Campo | Uso |
|---|---|
| `status` | `processando` → `rascunho` → `publicado` · ou `falhou` (com `error`) |
| `slug`, `number`, `title`, `client`, `category`, `subgroup`, `role`, `year`, `description` | ficha do projeto |
| `cover_url` · `clip_mp4_url` · `clip_webm_url` | fallback JPG 1400×788 · thumb animada 640×360 |
| `video_url` | YouTube/Vimeo (preenchido no admin) ou arquivo, se `STORE_FULL_VIDEO=true` |
| `results` | views, alcance, curtidas… (preenchidos no admin) |
| `frameio_file_id` (único) | impede projeto duplicado se o webhook disparar duas vezes |
| `suggested_title`, `suggested_description` | sugestão do Claude — só aparece no admin, nunca é publicada sozinha |

---

## 1. Supabase (banco, arquivos e login do admin)

1. Crie um projeto em **supabase.com** (o plano grátis serve para começar).
2. **SQL Editor** → cole e rode `supabase/migrations/0001_init.sql`, depois `supabase/seed.sql`.
3. **Authentication → Users → Add user**: crie o usuário do admin (e-mail + senha). Em *Authentication → Sign In / Providers*, desative o cadastro público.
4. **Project Settings → API**: copie `Project URL`, `anon key` e `service_role key`.

## 2. Rodar o site localmente

```bash
cp .env.example .env.local      # preencha as chaves
npm install
npm run dev                      # http://localhost:3000  ·  admin em /admin
```

Testes: `npm test` (assinatura do webhook) e `npm run typecheck`.

## 3. Frame.io V4 no Adobe Developer Console

1. Entre em **developer.adobe.com/console** com a conta Adobe ligada ao seu Frame.io → **Create new project**.
2. **Add API → Frame.io API**.
3. Escolha a credencial:
   - **OAuth Web App** (recomendado para contas comuns): em *Redirect URI* coloque `https://SEU-SITE/api/frameio/oauth/callback` (e `http://localhost:3000/api/frameio/oauth/callback` para testes). Use `FRAMEIO_AUTH_MODE=oauth`.
   - **Server-to-Server**: só aparece/funciona em contas **Enterprise** gerenciadas pelo Adobe Admin Console. Use `FRAMEIO_AUTH_MODE=s2s` e confira os *scopes* que o Console mostra em `FRAMEIO_S2S_SCOPES`.
4. Copie **Client ID** e **Client Secret** para `FRAMEIO_CLIENT_ID` / `FRAMEIO_CLIENT_SECRET` (Netlify e GitHub Secrets — nunca no código).
5. **Modo OAuth:** com o site no ar e logado no admin, abra **`/api/frameio/oauth/start`** uma vez e autorize. O token de renovação fica na tabela `frameio_auth` e o worker renova o acesso sozinho.
6. Descubra o **ID da conta** e da **pasta** que vai disparar o fluxo (ex.: pela URL da pasta no Frame.io, ou pela API `GET /v4/accounts` e `.../folders/{id}/children`) e preencha `FRAMEIO_ACCOUNT_ID` e `FRAMEIO_FOLDER_ID`.

### Registrar o webhook

Webhooks do V4 valem para o **workspace** inteiro; o worker descarta o que não estiver na pasta configurada.

```bash
curl -X POST "https://api.frame.io/v4/accounts/$FRAMEIO_ACCOUNT_ID/workspaces/$WORKSPACE_ID/webhooks" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"data": {"name": "Site — novos projetos", "url": "https://SEU-SITE/api/frameio/webhook", "events": ["file.ready"]}}'
```

Guarde o **secret** que a resposta devolve em `FRAMEIO_WEBHOOK_SECRET`.

> ⚠️ **Conferir na documentação do Frame.io V4 ao configurar** (não foi possível acessá-la daqui):
> nome exato do evento de "arquivo pronto" (`FRAMEIO_EVENTS`, padrão `file.ready`),
> formato da assinatura (`X-Frameio-Signature: v0=hmac_sha256("v0:{timestamp}:{corpo}")` e `X-Frameio-Request-Timestamp`),
> campos do link de download (`media_links.original.download_url`) e URLs do Adobe IMS.
> Tudo isso está concentrado em `lib/frameio.ts` e `worker/frameio.py`, marcado com **CONFERIR**.

**Sem webhook?** Defina `FRAMEIO_POLL=true`: o worker lista a pasta a cada 5 min e enfileira o que for novo.

## 4. Worker (Python + FFmpeg)

Roda no **GitHub Actions** (grátis, já tem FFmpeg). Em *Settings → Secrets and variables → Actions*:

- **Secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRAMEIO_CLIENT_ID`, `FRAMEIO_CLIENT_SECRET`, `ANTHROPIC_API_KEY` (opcional)
- **Variables:** `FRAMEIO_AUTH_MODE`, `FRAMEIO_ACCOUNT_ID`, `FRAMEIO_FOLDER_ID`, `FRAMEIO_POLL`, `STORE_FULL_VIDEO`

Para o worker rodar **na hora** (e não só a cada 5 min), crie um token *fine-grained* no GitHub com permissão **Contents: Read and write** neste repositório e coloque em `GITHUB_DISPATCH_TOKEN` (variável do Netlify).

Rodar no seu computador:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r worker/requirements.txt          # precisa de ffmpeg instalado
python -m worker thumb-test meu_video.mp4       # só a thumb, sem banco nem Frame.io
python -m worker once                           # processa a fila uma vez
python -m worker run                            # loop contínuo
python -m unittest worker.tests.test_pipeline -v   # fluxo completo com banco/Frame.io simulados
```

### A thumb animada

- `ffprobe` lê a duração; a janela útil é de 5% a 95% do vídeo.
- A janela é dividida em 5 faixas e um trecho de 1 s é sorteado dentro de cada uma (aleatório, sem sobrepor, em ordem).
- Um único `ffmpeg` junta os 5 trechos: **5 s, sem áudio, 640×360 (16:9), 25 fps** — o mesmo padrão das thumbs atuais.
- Saídas: `thumb.mp4` (H.264, CRF 30, `+faststart`), `thumb.webm` (VP9) e `poster.jpg` (1400×788, fallback).
- **"Gerar nova thumb"** no admin sorteia trechos novos e troca os arquivos.

## 5. Sugestão de título e descrição (Claude, opcional)

Com `ANTHROPIC_API_KEY` definida, o worker manda o nome da pasta, o nome do arquivo e 4 quadros do vídeo
para o Claude (`CLAUDE_MODEL`, padrão `claude-opus-5-5`) e grava a sugestão em campos separados.
No admin, **"Usar sugestão nos campos"** copia para o formulário — você edita e publica. Nada é publicado sozinho.
A chamada usa o *fallback* do servidor: se o modelo recusar, a API tenta outro modelo automaticamente.

## 6. Publicar na Netlify

1. *Add new site → Import from GitHub* → este repositório, branch desejada. A Netlify detecta o Next.js sozinha.
2. Em *Site configuration → Environment variables*, cadastre as variáveis do `.env.example` (as do site e do Frame.io).
3. Atualize o *Redirect URI* no Adobe Console e a URL do webhook com o endereço final.

## Erros e logs

- Cada etapa (frameio, download, thumb, upload, claude, rascunho) grava uma linha em `job_logs`, visível na página do projeto no admin.
- Qualquer erro no processamento deixa o projeto em **`falhou`** com a mensagem; o botão **"Tentar de novo"** recoloca na fila.
- Arquivo ainda processando no Frame.io (sem link de download) volta para a fila automaticamente (até 12 tentativas).
- Trabalhos presos em "rodando" por mais de 30 min voltam para a fila.
