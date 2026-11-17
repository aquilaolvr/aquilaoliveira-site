"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Animações globais: revelar na rolagem, tocar vídeos visíveis, contar números, barra de progresso e cursor. */
export default function Effects() {
  const path = usePathname();
  useEffect(() => {
    const reveal = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".rv:not(.in),.clip:not(.in)").forEach(el => reveal.observe(el));

    const vids = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.25 });
    document.querySelectorAll("video[data-autoplay]").forEach(v => vids.observe(v));

    const fmt = (n: number) => n >= 1e6 ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n / 1e6) + " mi" : new Intl.NumberFormat("pt-BR").format(n);
    const counts = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; counts.unobserve(e.target);
      const el = e.target as HTMLElement, end = Number(el.dataset.count), t0 = performance.now();
      const step = (now: number) => { const k = Math.min(1, (now - t0) / 1400); el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.5 });
    document.querySelectorAll("[data-count]").forEach(el => counts.observe(el));

    document.getElementById("hero")?.classList.add("go");
    return () => { reveal.disconnect(); vids.disconnect(); counts.disconnect(); };
  }, [path]);

  useEffect(() => {
    const bar = document.getElementById("progress");
    const cur = document.getElementById("cursor");
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    };
    const onMove = (e: MouseEvent) => {
      if (!cur) return;
      cur.style.setProperty("--pos", `translate(${e.clientX}px,${e.clientY}px)`);
      cur.classList.toggle("on", !!(e.target as HTMLElement).closest?.("[data-hover]"));
    };
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousemove", onMove);
    return () => { removeEventListener("scroll", onScroll); document.removeEventListener("mousemove", onMove); };
  }, []);
  return null;
}
