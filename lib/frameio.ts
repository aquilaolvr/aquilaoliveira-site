import crypto from "node:crypto";

/* ---------------------------------------------------------------------
 * Frame.io V4 — tudo que depende do formato da API fica neste arquivo
 * (e em worker/frameio.py). Os pontos marcados com CONFERIR seguem o
 * padrão documentado do Frame.io/Adobe IMS, mas não puderam ser checados
 * contra a documentação a partir daqui: confira ao configurar o app.
 * ------------------------------------------------------------------- */

export const IMS = {
  authorize: "https://ims-na1.adobelogin.com/ims/authorize/v2", // CONFERIR
  token: "https://ims-na1.adobelogin.com/ims/token/v3",          // CONFERIR
};

/**
 * Assinatura do webhook. CONFERIR nomes dos cabeçalhos e formato:
 *   X-Frameio-Request-Timestamp: <segundos>
 *   X-Frameio-Signature: v0=<hex(hmac_sha256(secret, "v0:<timestamp>:<corpo>"))>
 */
export function verifySignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string, toleranceSec = 300, now = Date.now()) {
  if (!timestamp || !signature || !secret) return { ok: false, reason: "cabeçalhos de assinatura ausentes" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > toleranceSec) return { ok: false, reason: "timestamp fora da janela (possível replay)" };
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? { ok: true as const } : { ok: false, reason: "assinatura inválida" };
}

/** Extrai o que importa do corpo do webhook. CONFERIR caminhos dos campos. */
export function parseEvent(body: unknown) {
  const b = body as { type?: string; resource?: { id?: string; type?: string }; account?: { id?: string }; account_id?: string };
  return {
    type: b?.type ?? "",
    fileId: b?.resource?.id ?? null,
    resourceType: b?.resource?.type ?? "file",
    accountId: b?.account?.id ?? b?.account_id ?? process.env.FRAMEIO_ACCOUNT_ID ?? null,
  };
}

export function acceptedEvents() {
  return (process.env.FRAMEIO_EVENTS || "file.ready").split(",").map(s => s.trim()).filter(Boolean);
}
