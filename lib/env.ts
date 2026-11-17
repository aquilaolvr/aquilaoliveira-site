/** Supabase configurado? Sem ele o site usa os dados de exemplo (lib/seed-projects.json). */
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const hasServiceRole = hasSupabase && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
