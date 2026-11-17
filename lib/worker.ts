/** Acorda o worker na hora pelo GitHub Actions (repository_dispatch). Sem token, o cron de 5 min cobre. */
export async function dispatchWorker(reason: string) {
  const token = process.env.GITHUB_DISPATCH_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) { console.log(`[worker] sem GITHUB_DISPATCH_TOKEN — o trabalho espera o próximo ciclo (${reason})`); return false; }
  const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ event_type: "worker-run", client_payload: { reason } }),
  });
  if (!r.ok) console.error(`[worker] falha ao acionar GitHub Actions: ${r.status} ${await r.text()}`);
  else console.log(`[worker] GitHub Actions acionado (${reason})`);
  return r.ok;
}
