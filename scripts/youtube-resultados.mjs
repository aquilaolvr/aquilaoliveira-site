// Busca views, curtidas e comentários públicos dos vídeos do YouTube listados
// em js/projetos.js (campo "youtube") e grava em data/resultados.json.
// Roda todo dia pelo GitHub Actions (.github/workflows/resultados.yml).
// Precisa da variável de ambiente YOUTUBE_API_KEY (chave grátis do Google Cloud,
// com a "YouTube Data API v3" ativada). Sem a chave, não altera nada.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const KEY = process.env.YOUTUBE_API_KEY;
const OUT = "data/resultados.json";

// Carrega os projetos executando o arquivo do site num ambiente isolado.
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync("js/projetos.js", "utf8") + "\n;globalThis.__P = P;", ctx);
const projetos = ctx.__P.filter(p => p.video);

let atual = { atualizado: null, projetos: {} };
try { atual = JSON.parse(readFileSync(OUT, "utf8")); } catch {}

if (!projetos.length) { console.log("Nenhum projeto com YouTube."); process.exit(0); }
if (!KEY) { console.log("Sem YOUTUBE_API_KEY — nada atualizado."); process.exit(0); }

const ids = [...new Set(projetos.map(p => p.video))];
const stats = {};
for (let i = 0; i < ids.length; i += 50) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(i, i + 50).join(",")}&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) { console.error("Erro do YouTube:", res.status, await res.text()); process.exit(1); }
  for (const v of (await res.json()).items || []) stats[v.id] = v.statistics;
}

const agora = new Date().toISOString();
const projetosOut = { ...atual.projetos };
for (const p of projetos) {
  const s = stats[p.video];
  if (!s) { console.warn(`Vídeo não encontrado ou privado: ${p.id} (${p.video})`); continue; }
  const num = v => (v == null ? undefined : Number(v));
  projetosOut[p.id] = {
    views: num(s.viewCount),
    curtidas: num(s.likeCount),        // pode faltar se o canal esconder curtidas
    comentarios: num(s.commentCount),  // pode faltar se os comentários estiverem desativados
    fonte: "YouTube",
    atualizado: agora
  };
  console.log(`${p.id}: ${s.viewCount} views`);
}
// remove projetos que não têm mais YouTube
for (const id of Object.keys(projetosOut)) if (!projetos.some(p => p.id === id)) delete projetosOut[id];

writeFileSync(OUT, JSON.stringify({ atualizado: agora, projetos: projetosOut }, null, 2) + "\n");
