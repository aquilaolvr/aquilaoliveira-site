"use client";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <header>
        <Link href="/" className="brand">Áquila Oliveira</Link>
        <nav className="desk">
          <Link href="/trabalhos">Trabalhos</Link>
          <Link href="/#sobre">Sobre</Link>
          <Link href="/#contato">Contato</Link>
        </nav>
        <button id="menuBtn" onClick={() => setOpen(true)}>Menu</button>
      </header>
      <div id="overlay" className={open ? "open" : ""} aria-hidden={!open}>
        <div className="top"><span className="brand">Áquila Oliveira</span><button className="cap" onClick={close}>Fechar</button></div>
        <ul>
          <li><Link href="/trabalhos" onClick={close}>Trabalhos</Link></li>
          <li><Link href="/#sobre" onClick={close}>Sobre</Link></li>
          <li><Link href="/#contato" onClick={close}>Contato</Link></li>
        </ul>
        <div className="bottom"><span className="cap mute">Salvador — Bahia</span></div>
      </div>
    </>
  );
}
