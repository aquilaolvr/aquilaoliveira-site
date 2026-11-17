"use client";
import { useEffect, useRef } from "react";

export default function Manifesto({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");
  useEffect(() => {
    const sec = ref.current; if (!sec) return;
    const ws = Array.from(sec.querySelectorAll(".w"));
    const on = () => {
      const r = sec.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight) * 1.15));
      ws.forEach((w, i) => w.classList.toggle("on", prog > (i + .5) / ws.length * .95 || (prog >= 1 && i === ws.length - 1)));
    };
    on(); addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <section className="manifesto" ref={ref}>
      <div className="stick">
        <span className="label cap mute">Manifesto</span>
        <p>{words.map((w, i) => <span key={i} className={`w${i >= words.length - 3 ? " hl" : ""}`}>{w} </span>)}</p>
      </div>
    </section>
  );
}
