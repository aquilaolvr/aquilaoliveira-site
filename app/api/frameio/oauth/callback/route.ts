import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { IMS } from "@/lib/frameio";
import { serviceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const store = await cookies();
  if (!url.searchParams.get("code") || url.searchParams.get("state") !== store.get("fio_state")?.value) {
    return NextResponse.json({ error: "Autorização inválida ou expirada. Tente de novo." }, { status: 400 });
  }
  store.delete("fio_state");
  const r = await fetch(IMS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code: url.searchParams.get("code")!,
      client_id: process.env.FRAMEIO_CLIENT_ID || "", client_secret: process.env.FRAMEIO_CLIENT_SECRET || "",
      redirect_uri: process.env.FRAMEIO_REDIRECT_URI || "",
    }),
  });
  const tok = await r.json();
  if (!r.ok || !tok.refresh_token) {
    console.error("[frameio-oauth] falha na troca do código", r.status, tok?.error);
    return NextResponse.json({ error: "A Adobe recusou a autorização.", detail: tok?.error_description ?? tok?.error }, { status: 502 });
  }
  await serviceClient().from("frameio_auth").upsert({
    id: 1, access_token: tok.access_token, refresh_token: tok.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 3600) * 1000).toISOString(), updated_at: new Date().toISOString(),
  });
  return NextResponse.redirect(new URL("/admin?frameio=ok", req.url));
}
