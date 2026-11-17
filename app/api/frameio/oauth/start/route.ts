import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { IMS } from "@/lib/frameio";

/** Modo FRAMEIO_AUTH_MODE=oauth: o admin autoriza uma vez; o worker renova o acesso sozinho. */
export async function GET() {
  await requireAdmin();
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("fio_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const u = new URL(IMS.authorize);
  u.searchParams.set("client_id", process.env.FRAMEIO_CLIENT_ID || "");
  u.searchParams.set("redirect_uri", process.env.FRAMEIO_REDIRECT_URI || "");
  u.searchParams.set("scope", process.env.FRAMEIO_SCOPES || "openid,AdobeID,offline_access");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return NextResponse.redirect(u);
}
