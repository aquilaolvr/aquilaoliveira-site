import { NextResponse } from "next/server";
import { acceptedEvents, parseEvent, verifySignature } from "@/lib/frameio";
import { serviceClient } from "@/lib/supabase/server";
import { dispatchWorker } from "@/lib/worker";

/** Recebe o webhook do Frame.io, valida, enfileira (sem duplicar) e acorda o worker. Responde rápido. */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = verifySignature(raw, req.headers.get("x-frameio-request-timestamp"), req.headers.get("x-frameio-signature"), process.env.FRAMEIO_WEBHOOK_SECRET || "");
  if (!sig.ok) { console.warn(`[webhook] recusado: ${sig.reason}`); return NextResponse.json({ error: sig.reason }, { status: 401 }); }

  let ev;
  try { ev = parseEvent(JSON.parse(raw)); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  console.log(`[webhook] evento ${ev.type} recurso=${ev.resourceType}:${ev.fileId}`);

  if (!acceptedEvents().includes(ev.type) || ev.resourceType !== "file" || !ev.fileId) {
    return NextResponse.json({ ignored: true, reason: "evento não usado" });
  }
  // A pasta é conferida pelo worker (o webhook vale para o workspace inteiro).
  const { data: queued, error } = await serviceClient().rpc("enqueue_frameio_file", { p_file_id: ev.fileId, p_account_id: ev.accountId, p_event: ev.type });
  if (error) { console.error(`[webhook] erro ao enfileirar: ${error.message}`); return NextResponse.json({ error: "falha ao enfileirar" }, { status: 500 }); }
  if (!queued) { console.log(`[webhook] ${ev.fileId} já conhecido — ignorado (duplicado)`); return NextResponse.json({ duplicate: true }); }

  await dispatchWorker(`frameio:${ev.fileId}`);
  return NextResponse.json({ queued: true });
}
