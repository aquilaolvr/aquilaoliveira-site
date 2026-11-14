/* =====================================================================
   PROJETOS DO SITE — é só editar este arquivo.

   Cada projeto:
     id      endereço da página (#/projeto/<id>) — sem espaços nem acentos
     n       número do portfólio (02.01, 03.04…)
     t       título
     client  cliente / artista / veículo
     cat     frente: tv | eventos | publicidade | politica
     sub     grupo dentro da frente (ver SUBS)
     role    sua função / descrição curta { pt, en }
     y       ano ou período (texto livre)
     img     capa (caminho dentro de images/, sem .jpg)
     stills  mais fotos do projeto (viram galeria)
     clip    loop curto da thumb (arquivo em video/, sem .mp4) — toca sozinho, sem som
     video   ID do vídeo no YouTube (ex.: "dQw4w9WgXcQ") — opcional
     vimeo   ID do vídeo no Vimeo — opcional
     feat    1 = aparece nos destaques da Home
   ===================================================================== */

const CATS = {
  todos:       { pt: "Todos", en: "All" },
  tv:          { pt: "Televisão & Videoclipes", en: "Television & Music Videos" },
  eventos:     { pt: "Aftermovies & Eventos", en: "Aftermovies & Events" },
  publicidade: { pt: "Publicidade & Institucional", en: "Advertising & Institutional" },
  politica:    { pt: "Comunicação Política", en: "Political Communication" }
};

const SUBS = {
  televisao:  { pt: "Televisão", en: "Television" },
  clipe:      { pt: "Videoclipe", en: "Music video" },
  divulgacao: { pt: "Divulgação de festival", en: "Festival promotion" },
  cobertura:  { pt: "Cobertura em tempo real", en: "Real-time coverage" },
  marcas:     { pt: "Marcas e empresas", en: "Brands & companies" },
  doc:        { pt: "Documentário", en: "Documentary" },
  publico:    { pt: "Setor público", en: "Public sector" },
  politica:   { pt: "Campanhas e mandatos", en: "Campaigns & mandates" }
};

const r = (pt, en) => ({ pt, en });
const cover = n => "projetos/" + n.replace(".", "-");

const P = [
  /* ---------- 02 · Televisão e videoclipes ---------- */
  { n: "02.01", id: "mosaico-baiano", feat: 1, t: "Mosaico Baiano", client: "Rede Bahia", cat: "tv", sub: "televisao", y: "2026 –",
    role: r("Direção da equipe de edição", "Head of the editing team") },
  { n: "02.02", id: "conexao-bahia", t: "Conexão Bahia", client: "Rede Bahia", cat: "tv", sub: "televisao", y: "2026 –",
    role: r("Direção da equipe de edição", "Head of the editing team") },
  { n: "02.03", id: "resenha-ge", t: "Resenha GE", client: "Globo Esporte BA / TV Bahia", cat: "tv", sub: "televisao", y: "",
    role: r("Conteúdo exibido no programa", "Content aired on the show") },
  { n: "02.04", id: "vem-carnaval", t: "Vem Carnaval!", client: "Globo Esporte BA / TV Bahia", cat: "tv", sub: "televisao", y: "",
    role: r("Conteúdo exibido no programa", "Content aired on the show") },
  { n: "02.05", id: "olodum", clip: "olodum", feat: 1, t: "Olodum", client: "Olodum", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },
  { n: "02.06", id: "parangole", t: "Parangolé", client: "Parangolé", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },
  { n: "02.07", id: "e-o-tchan", t: "É o Tchan", client: "É o Tchan", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },
  { n: "02.08", id: "xandy-harmonia", t: "Xandy Harmonia", client: "Harmonia do Samba", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },
  { n: "02.09", id: "filhos-de-jorge", t: "Filhos de Jorge", client: "Filhos de Jorge", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },
  { n: "02.10", id: "delacruz", t: "Delacruz", client: "Delacruz", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video"),
    stills: ["set/monitor", "set/beira-mar", "set/corredor", "set/headset-pb", "set/estabilizador-laranja", "set/camera-laranja", "head"] },
  { n: "02.11", id: "igor-kannario", t: "Igor Kannário", client: "Igor Kannário", cat: "tv", sub: "clipe", y: "", role: r("Videoclipe", "Music video") },

  /* ---------- 03 · Aftermovies e eventos ---------- */
  { n: "03.01", id: "festival-de-verao", clip: "festival-de-verao", feat: 1, t: "Festival de Verão", client: "Gamboa / Bahia Eventos", cat: "eventos", sub: "divulgacao", y: "2023 e 2025",
    role: r("Animação gráfica da pré-divulgação oficial, VTs para televisão e chamadas comerciais", "Graphic animation for the official pre-launch, TV spots and commercials") },
  { n: "03.02", id: "afropunk-brasil", clip: "afropunk-brasil", feat: 1, t: "AFROPUNK Brasil", client: "AFROPUNK · Salvador", cat: "eventos", sub: "divulgacao", y: "2022 – 2026",
    role: r("Animação gráfica de pré-divulgação, matérias para TV e vídeos de palco desde a primeira edição", "Pre-launch graphic animation, TV features and stage videos since the first edition") },
  { n: "03.03", id: "beyonce-renaissance", t: "Beyoncé — Renaissance", client: "Salvador", cat: "eventos", sub: "cobertura", y: "",
    role: r("Cobertura em tempo real", "Real-time coverage") },
  { n: "03.04", id: "afropunk-2026", feat: 1, t: "AFROPUNK Brasil 2026", client: "AFROPUNK · IDW", cat: "eventos", sub: "cobertura", y: "2026",
    role: r("Vídeos de palco pela IDW · vídeo real time", "Stage videos for IDW · real-time video"),
    img: "afropunk1", bp: "50% 28%", stills: ["projetos/03-04", "afropunk2", "set/afropunk-retrato", "palco1", "palco2", "perfil", "set/estrutura-laranja"] },
  { n: "03.05", id: "festival-de-verao-uniftc", clip: "festival-de-verao-uniftc", feat: 1, t: "Festival de Verão · UniFTC", client: "Gamboa / Bahia Eventos", cat: "eventos", sub: "cobertura", y: "",
    role: r("Cobertura com entrega no mesmo dia para a UniFTC", "Same-day delivery coverage for UniFTC") },
  { n: "03.06", id: "budweiser-afropunk", t: "Budweiser AFROPUNK", client: "Budweiser", cat: "eventos", sub: "cobertura", y: "",
    role: r("Cobertura com entrega no mesmo dia", "Same-day delivery coverage") },
  { n: "03.07", id: "as-minas-seda", t: "As Minas / Seda", client: "Seda", cat: "eventos", sub: "cobertura", y: "",
    role: r("Evento · cobertura com entrega no mesmo dia", "Event · same-day delivery coverage") },
  { n: "03.08", id: "bloco-da-anitta", t: "Bloco da Anitta", client: "Carnaval de Salvador", cat: "eventos", sub: "cobertura", y: "",
    role: r("Cobertura com entrega no mesmo dia", "Same-day delivery coverage") },
  { n: "03.09", id: "buteco-gusttavo-lima", t: "Buteco do Gusttavo Lima", client: "Evento", cat: "eventos", sub: "cobertura", y: "",
    role: r("Cobertura audiovisual", "Event coverage") },
  { n: "03.10", id: "uniftc-mega-revisao", t: "UniFTC — Mega-Revisão", client: "UniFTC", cat: "eventos", sub: "cobertura", y: "",
    role: r("Evento educacional · cobertura com entrega no mesmo dia", "Educational event · same-day delivery coverage") },
  { n: "03.11", id: "sony-bday", t: "Sony — BDay", client: "Sony", cat: "eventos", sub: "cobertura", y: "",
    role: r("Filme pós-evento", "Post-event film") },

  /* ---------- 04 · Publicidade e institucional ---------- */
  { n: "04.01", id: "o-encontro-2026", feat: 1, t: "O Encontro 2026", client: "Dendezeiro × AFROPUNK × ChatGPT", cat: "publicidade", sub: "marcas", y: "2026",
    role: r("Conteúdo de marca · edição · cliente IDW · publicado no perfil do AFROPUNK Brasil", "Branded content · editing · client IDW · published on AFROPUNK Brasil's profile") },
  { n: "04.02", id: "petrobahia", t: "Petrobahia", client: "Petrobahia", cat: "publicidade", sub: "marcas", y: "",
    role: r("Vídeos institucionais", "Institutional videos") },
  { n: "04.03", id: "tv-globo", t: "TV Globo", client: "TV Globo", cat: "publicidade", sub: "marcas", y: "", role: r("Produção audiovisual", "Video production") },
  { n: "04.04", id: "devassa", t: "Devassa", client: "Devassa", cat: "publicidade", sub: "marcas", y: "", role: r("Conteúdo de marca", "Branded content") },
  { n: "04.05", id: "gotemburgo-volvo", t: "Gotemburgo Volvo", client: "Gotemburgo Volvo", cat: "publicidade", sub: "marcas", y: "", role: r("Conteúdo de marca", "Branded content") },
  { n: "04.06", id: "belov-engenharia", t: "Belov Engenharia", client: "Belov Engenharia", cat: "publicidade", sub: "marcas", y: "", role: r("Institucional", "Institutional") },
  { n: "04.07", id: "hiperideal", clip: "hiperideal", feat: 1, t: "Hiperideal", client: "Hiperideal", cat: "publicidade", sub: "marcas", y: "", role: r("Conteúdo de marca", "Branded content") },
  { n: "04.08", id: "mamma-jamma", t: "Mamma Jamma", client: "Mamma Jamma", cat: "publicidade", sub: "marcas", y: "", role: r("Conteúdo de marca", "Branded content") },
  { n: "04.09", id: "uniftc", t: "UniFTC", client: "UniFTC", cat: "publicidade", sub: "marcas", y: "", role: r("Institucional e campanhas", "Institutional & campaigns") },
  { n: "04.10", id: "unex", t: "UNEX", client: "UNEX", cat: "publicidade", sub: "marcas", y: "", role: r("Institucional e campanhas", "Institutional & campaigns") },
  { n: "04.11", id: "salesiano", clip: "salesiano", feat: 1, t: "Salesiano", client: "Salesiano", cat: "publicidade", sub: "marcas", y: "", role: r("Institucional e conteúdo educativo", "Institutional & educational content") },
  { n: "04.12", id: "professora-profissao-dignidade", t: "Professora, Profissão Dignidade", client: "Documentário", cat: "publicidade", sub: "doc", y: "jun. 2025 –",
    role: r("Documentário · em andamento", "Documentary · in progress") },
  { n: "04.13", id: "koko-banda-lordao", t: "Kokó — Banda Lordão", client: "42 Polegadas", cat: "publicidade", sub: "doc", y: "2022",
    role: r("Mini documentário · realizado pela 42 Polegadas", "Short documentary · made with 42 Polegadas") },
  { n: "04.14", id: "dulce-80-anos", t: "Dulce 80 Anos", client: "Instituto Agita", cat: "publicidade", sub: "doc", y: "",
    role: r("Mini documentário", "Short documentary") },
  { n: "04.15", id: "petrobahia-documentario", t: "Petrobahia — curta documental", client: "Petrobahia", cat: "publicidade", sub: "doc", y: "",
    role: r("Mini documentário em curta-metragem · pesquisa, entrevistas e montagem narrativa", "Short documentary · research, interviews and narrative editing") },
  { n: "04.16", id: "governo-federal-carnaval-2026", t: "Governo Federal — Carnaval 2026", client: "Governo Federal", cat: "publicidade", sub: "publico", y: "2026",
    role: r("Comunicação oficial · produção audiovisual", "Official communication · video production") },
  { n: "04.17", id: "feira-agricultura-familiar", t: "16ª Feira Baiana da Agricultura Familiar e Economia Solidária", client: "CAR / SDR — Governo da Bahia", cat: "publicidade", sub: "publico", y: "2025",
    role: r("Cobertura da produção da feira · Parque Costa Azul, Salvador", "Coverage of the fair's production · Parque Costa Azul, Salvador") },
  { n: "04.18", id: "conepir-2025", t: "CONEPIR 2025", client: "Conferência", cat: "publicidade", sub: "publico", y: "2025",
    role: r("Cobertura audiovisual", "Event coverage") },
  { n: "04.19", id: "feira-arte-e-identidade", t: "Feira Arte e Identidade", client: "Feira cultural", cat: "publicidade", sub: "publico", y: "2025",
    role: r("Cobertura audiovisual", "Event coverage") },
  { n: "04.20", id: "secult-ba", t: "SECULT-BA", client: "Secretaria de Cultura da Bahia", cat: "publicidade", sub: "publico", y: "",
    role: r("Produção e cobertura de ações culturais", "Production and coverage of cultural actions") },
  { n: "04.21", id: "governo-da-bahia", t: "Governo da Bahia", client: "Governo da Bahia", cat: "publicidade", sub: "publico", y: "",
    role: r("Comunicação institucional · produção audiovisual", "Institutional communication · video production") },

  /* ---------- 05 · Comunicação política ---------- */
  { n: "05.01", id: "hilton-coelho-e-hamilton-assis-2026", t: "Hilton Coelho e Hamilton Assis 2026", client: "Campanha eleitoral", cat: "politica", sub: "politica", y: "2026",
    role: r("Estratégia audiovisual e captação", "Video strategy and filming") },
  { n: "05.02", id: "canal-da-resistencia", t: "Canal da Resistência", client: "Hilton Coelho", cat: "politica", sub: "politica", y: "2026",
    role: r("Vídeo de lançamento do canal · direção · em produção", "Channel launch video · direction · in production") },
  { n: "05.03", id: "mandato-hamilton-assis", t: "Mandato do vereador Hamilton Assis", client: "Câmara Municipal de Salvador", cat: "politica", sub: "politica", y: "jun. 2025 – jun. 2026",
    role: r("Comunicação audiovisual do mandato", "Video communication for the term of office") },
  { n: "05.04", id: "hamilton-assis-2024", t: "Hamilton Assis 2024", client: "Campanha eleitoral", cat: "politica", sub: "politica", y: "2024",
    role: r("Realizador de vídeo", "Video maker") },
  { n: "05.05", id: "hilton-coelho-2022", t: "Hilton Coelho 2022", client: "Campanha eleitoral", cat: "politica", sub: "politica", y: "2022",
    role: r("Realizador de vídeo", "Video maker") },
  { n: "05.06", id: "coletiva-guerreiras-2020", t: "Coletiva Guerreiras 2020", client: "Campanha eleitoral", cat: "politica", sub: "politica", y: "2020",
    role: r("Realizador de vídeo", "Video maker") },
  { n: "05.07", id: "hilton-coelho-2018", t: "Hilton Coelho 2018", client: "Campanha eleitoral", cat: "politica", sub: "politica", y: "2018",
    role: r("Vídeo e design", "Video and design") },
  { n: "05.08", id: "ascom-hilton-coelho-alba", t: "Ascom — Mandato do deputado Hilton Coelho", client: "Assembleia Legislativa da Bahia (ALBA)", cat: "politica", sub: "politica", y: "4 meses",
    role: r("Comunicação audiovisual do mandato · período de 4 meses", "Video communication for the term · 4 months") }
].map(p => {
  // Capa padrão: o card do portfólio. Se o projeto tem foto própria, o card vira mais uma imagem da galeria.
  const card = cover(p.n);
  if (!p.img) p.img = card;
  else if (!(p.stills || []).includes(card)) p.stills = [card, ...(p.stills || [])];
  p.bp = p.bp || "50% 50%";
  p.pal = p.pal || ["#140805", "#b8441c", "#f0b46a"];
  p.pos = p.pos || ["70% 30%", "20% 80%"];
  return p;
});

/* Faixa "Em cena" na Home: cada foto leva a um projeto (ou à seção Sobre). */
const SET = [
  { img: "set/afropunk-retrato", to: "afropunk-2026" },
  { img: "set/monitor", to: "delacruz" },
  { img: "set/estrutura-laranja", to: "afropunk-2026" },
  { img: "set/beira-mar", to: "delacruz" },
  { img: "afropunk2", to: "afropunk-2026" },
  { img: "set/headset-pb", to: "delacruz" },
  { img: "set/primeira-capital", to: "sobre", label: "Primeira Capital · África do Sul" },
  { img: "palco1", to: "afropunk-2026" },
  { img: "set/estabilizador-laranja", to: "delacruz" },
  { img: "set/estudio-pb", to: "sobre", label: "Estúdio" },
  { img: "perfil", to: "afropunk-2026" },
  { img: "set/corredor", to: "delacruz" },
  { img: "set/primeira-capital-2", to: "sobre", label: "Primeira Capital · África do Sul" },
  { img: "set/camera-laranja", to: "delacruz" }
];

/* Trajetória (seção Sobre) */
const TRAJ = [
  { y: "2026 –", pt: "Direção da equipe de edição — Mosaico Baiano e Conexão Bahia, Rede Bahia", en: "Head of the editing team — Mosaico Baiano and Conexão Bahia, Rede Bahia" },
  { y: "jun. 2025 – jun. 2026", pt: "Comunicação audiovisual do mandato do vereador Hamilton Assis", en: "Video communication for city councillor Hamilton Assis" },
  { y: "2021 – 2024", pt: "Editor de vídeo e designer de animação gráfica — 42 Polegadas", en: "Video editor and motion designer — 42 Polegadas" },
  { y: "2018", pt: "Primeiros trabalhos em campanhas — vídeo e design", en: "First campaign work — video and design" },
  { y: "2014 –", pt: "Diretor e realizador audiovisual autônomo", en: "Independent director and filmmaker" }
];
const FORMACAO = { pt: "Técnico em Mecatrônica — SENAI CIMATEC", en: "Mechatronics Technician — SENAI CIMATEC" };

/* Faixa de clientes */
const LOGOS = ["Rede Bahia", "TV Globo", "Globo Esporte", "Governo Federal", "Sony", "ChatGPT", "AFROPUNK", "IDW", "Budweiser", "Seda", "Petrobahia",
  "Devassa", "Gotemburgo Volvo", "Hiperideal", "UniFTC", "UNEX", "Olodum", "Parangolé", "É o Tchan", "Harmonia do Samba", "Filhos de Jorge",
  "Delacruz", "Igor Kannário", "Anitta", "Governo da Bahia", "SECULT-BA"].map(n => [n, ""]);
