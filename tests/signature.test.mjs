// Teste da verificação de assinatura do webhook (node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// mesma lógica de lib/frameio.ts (sem depender do build do TypeScript)
function verify(raw, ts, sig, secret, now) {
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const exp = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex");
  return exp.length === sig.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig));
}
const secret = "s3cr3t", raw = JSON.stringify({ type: "file.ready", resource: { id: "abc", type: "file" } });
const ts = String(Math.floor(Date.now() / 1000));
const good = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex");

test("aceita assinatura correta", () => assert.equal(verify(raw, ts, good, secret, Date.now()), true));
test("recusa corpo alterado", () => assert.equal(verify(raw + " ", ts, good, secret, Date.now()), false));
test("recusa segredo errado", () => assert.equal(verify(raw, ts, good, "outro", Date.now()), false));
test("recusa replay antigo", () => assert.equal(verify(raw, ts, good, secret, Date.now() + 10 * 60 * 1000), false));
