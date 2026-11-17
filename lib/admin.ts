import { redirect } from "next/navigation";
import { adminEmails, hasServiceRole } from "./env";
import { sessionClient } from "./supabase/server";

/** Garante que quem está na página é um admin autorizado (ADMIN_EMAILS). */
export async function requireAdmin() {
  if (!hasServiceRole) redirect("/admin/login?erro=config");
  const { data } = await (await sessionClient()).auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) redirect("/admin/login");
  if (!adminEmails.includes(email)) redirect("/admin/login?erro=acesso");
  return { email };
}

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
