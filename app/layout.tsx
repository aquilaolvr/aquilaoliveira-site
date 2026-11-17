import type { Metadata } from "next";
import Header from "@/components/Header";
import Effects from "@/components/Effects";
import "./globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Áquila Oliveira",
  description: "Áquila Oliveira — Diretor Audiovisual, Artista Visual e Gestor de Operações Criativas. Salvador, Bahia.",
  icons: { icon: "/media/images/favicon.png" },
  openGraph: { title: "Áquila Oliveira", images: ["/media/images/head.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="progress" />
        <div id="cursor" className="cap">Ver projeto</div>
        <Header />
        {children}
        <Effects />
      </body>
    </html>
  );
}
