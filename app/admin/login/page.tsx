"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

const MSG: Record<string, string> = {
  config: "O Supabase ainda não está configurado (veja o README: variáveis NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY).",
  acesso: "Este e-mail não está na lista ADMIN_EMAILS.",
};

function Login() {
  const router = useRouter();
  const erro = useSearchParams().get("erro");
  const [msg, setMsg] = useState(erro ? MSG[erro] : "");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget);
    const { error } = await browserClient().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) setMsg("E-mail ou senha incorretos."); else { router.push("/admin"); router.refresh(); }
  }
  return (
    <main className="adm adm-login">
      <h1>Admin</h1>
      <form onSubmit={submit}>
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="btn primary" disabled={busy || erro === "config"}>{busy ? "Entrando…" : "Entrar"}</button>
        {msg && <p className="adm-err">{msg}</p>}
      </form>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
