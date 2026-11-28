import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/vsuga/Desktop/V/Meus Negocios - Dados/Imperio System/package.json");
const { chromium } = require("playwright");

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const SLUG = "designerlab-skill-lab";
const SITE_DIR = path.join(SITES_DIR, SLUG);
const ASSETS_DIR = path.join(SITE_DIR, "assets");
const SCRATCH_DIR = "C:/Users/vsuga/.gemini/antigravity/brain/6a4c996e-81a7-41a3-a51b-1293e894f10d/scratch";

const TARGET_URL = "https://designerlab.com.br/skill-lab";
const VERCEL_BASE = "https://imperio-swipefile.vercel.app";
const GITHUB_REPO_BASE = "https://github.com/vsugamele/imperio-swipefile/tree/main/sites";
const VERCEL_URL = `${VERCEL_BASE}/${SLUG}/`;
const GITHUB_URL = `${GITHUB_REPO_BASE}/${SLUG}`;
const SITE_TITLE = "Skill Lab · 12 skills pro Claude (Designer LAB · Gabriel Araújo)";
const SITE_UUID = "9b7a4c12-5e31-4f8b-9a2d-1128skilllab".replace("skilllab", "20261128"); // valid UUID v4 format

fs.mkdirSync(ASSETS_DIR, { recursive: true });

// 1. Download clean original HTML (raw source, not post-JS mutated DOM, so GSAP + sliders + speedart hydrate cleanly 1:1!)
async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.text();
}

async function main() {
  console.log("1) Fetching pristine source HTML, CSS and interactive UI bundles...");
  let rawHtml = await fetchText(TARGET_URL);
  let mainCss = await fetchText("https://designerlab.com.br/skill-lab/assets/main-BU2GJc__.css");
  const baseJs = fs.readFileSync(path.join(SCRATCH_DIR, "base-CnofwN3t.js"), "utf8");
  const duvidasJs = fs.readFileSync(path.join(SCRATCH_DIR, "duvidas-rbdQSclW.js"), "utf8");
  let mainJs = fs.readFileSync(path.join(SCRATCH_DIR, "main-BJ4FSzn2.js"), "utf8");

  // Rewrite relative asset URLs in CSS (/skill-lab/... -> https://designerlab.com.br/skill-lab/...)
  mainCss = mainCss.replace(/url\(\s*(['"]?)\/skill-lab\//gi, 'url($1https://designerlab.com.br/skill-lab/');
  mainCss = mainCss.replace(/url\(\s*(['"]?)\.\.\/img\//gi, 'url($1https://designerlab.com.br/skill-lab/img/');
  mainCss = mainCss.replace(/url\(\s*(['"]?)\.\.\/fontes\//gi, 'url($1https://designerlab.com.br/skill-lab/fontes/');
  mainCss = mainCss.replace(/url\(\s*(['"]?)\/fontes\//gi, 'url($1https://designerlab.com.br/fontes/');
  fs.writeFileSync(path.join(ASSETS_DIR, "main-BU2GJc__.css"), mainCss, "utf8");

  // Rewrite relative /skill-lab/ paths inside mainJs so dynamic speedart/examples load from origin CDN cleanly
  mainJs = mainJs.replace('const gt="/skill-lab/"', () => 'const gt="https://designerlab.com.br/skill-lab/"');
  mainJs = mainJs.replace('`/skill-lab/${oe("speedart/")}', () => '`https://designerlab.com.br/skill-lab/${oe("speedart/")}');
  mainJs = mainJs.replace('Ae="/skill-lab/img/"', () => 'Ae="https://designerlab.com.br/skill-lab/img/"');

  fs.writeFileSync(path.join(ASSETS_DIR, "base-CnofwN3t.js"), baseJs, "utf8");
  fs.writeFileSync(path.join(ASSETS_DIR, "duvidas-rbdQSclW.js"), duvidasJs, "utf8");
  fs.writeFileSync(path.join(ASSETS_DIR, "main-BJ4FSzn2.js"), mainJs, "utf8");

  // Patch raw HTML:
  // a) Remove third-party trackers (clarity, pixel, gtag, t.js, facebook)
  rawHtml = rawHtml.replace(/<script[^>]*src=["'](?:\/clarity\.js|\/pixel\.js|\/t\.js|https?:\/\/[^"']*(?:clarity\.ms|googletagmanager|fbevents|facebook)[^"']*)["'][^>]*><\/script>/gi, "");
  rawHtml = rawHtml.replace(/<script[^>]*>(?:(?!(<\/script>))[\s\S])*?(?:fbq\(|clarity\(|gtag\(|googletagmanager|connect\.facebook)[\s\S]*?<\/script>/gi, "");
  rawHtml = rawHtml.replace(/<noscript>[\s\S]*?facebook\.com\/tr[\s\S]*?<\/noscript>/gi, "");

  // b) Point stylesheet & module scripts to our clean local ./assets/
  rawHtml = rawHtml.replace(/href=["']\/skill-lab\/assets\/main-BU2GJc__\.css["']/gi, 'href="./assets/main-BU2GJc__.css"');
  rawHtml = rawHtml.replace(/src=["']\/skill-lab\/assets\/(main-BJ4FSzn2|base-CnofwN3t|duvidas-rbdQSclW)\.js["']/gi, 'src="./assets/$1.js"');
  rawHtml = rawHtml.replace(/href=["']\/skill-lab\/assets\/(main-BJ4FSzn2|base-CnofwN3t|duvidas-rbdQSclW)\.js["']/gi, 'href="./assets/$1.js"');

  // c) Rewrite remaining relative URLs (/skill-lab/... , /api/... , /termos , /privacidade) to absolute origin
  rawHtml = rawHtml.replace(/(src|href|poster)=["']\/skill-lab\/(?!assets\/)/gi, '$1="https://designerlab.com.br/skill-lab/');
  rawHtml = rawHtml.replace(/(src|href)=["']\/(api\/|termos|privacidade|favicon|img\/|fontes\/)/gi, '$1="https://designerlab.com.br/$2');
  rawHtml = rawHtml.replace(/srcset=["']([^"']+)["']/gi, (full, val) => {
    const rewritten = val
      .split(",")
      .map((part) => {
        const t = part.trim();
        if (t.startsWith("/skill-lab/")) return "https://designerlab.com.br" + t;
        if (t.startsWith("img/")) return "https://designerlab.com.br/skill-lab/" + t;
        return t;
      })
      .join(", ");
    return `srcset="${rewritten}"`;
  });

  // d) Inject Império Swipefile Animation Engine + Full Funnel/Creative Dissection Metadata
  const dissection = {
    pagina: {
      tipo_pagina: "lp",
      headline: "As únicas skills que você precisa pro Claude fazer arte e site sem cara de IA",
      mecanismo:
        "Pipeline encadeado de 12 skills (/arte em 7 fases: Briefing com referência prévia → Extrator de Sistema do Cliente → Direção de Arte com ficha + proibições → Narrativa → Copy/Humanização/Formatos → Montagem em Camadas + Diagramação Técnica + 3 Passes Sombra/Brilho/Ruído → Revisão de Arte 2 passadas nota 1-5) + Power-ups de Prompt de Imagem (Nano Banana) e Interface sem cara de IA.",
      por_que_converte:
        "Combina prova visual irrefutável (6 comparadores interativos 'Sem skill × Com skill' arrastáveis + speedart de 6 nichos montando camadas em tempo real + prints reais do WhatsApp da Turma Fundadora + carrosséis reais do @zaraujo.lab) com ticket de entrada de baixíssima fricção (R$ 47 único + 7 dias garantia Cakto) e estética autoral de altíssimo contraste (azul cobalto + papel creme + tinta grafite + verde-lima + mascote Claudinho).",
      oferta: {
        produto: "Skill Lab · 12 skills pro Claude (Gabriel Araújo · Designer LAB / AJUX Company)",
        preco: "R$ 47,00 (pagamento único · até 11x R$ 5,24 · Pix/Cartão/Apple Pay)",
        ancoragem: "Front R$ 47 -> Bump 1: Atualizações vitalícias R$ 27 -> Bump 2: Edição de Vídeo IA + skill Método Diretor (Wesley) R$ 97 -> Upsell OTO: Designer LAB Pílula Vermelha R$ 450 (R$ 497 - R$ 47 + 3 cursos bônus) ou Pílula Azul R$ 297 (só 9 módulos/44 aulas)",
        garantia: "7 dias incondicional pela Cakto",
        checkout_url: "https://pay.cakto.com.br/neww5hz",
        upsell_url: "https://designerlab.com.br/skill-lab/curso/",
      },
      provas: [
        "11 prints reais do WhatsApp da Turma Fundadora (carrosséis, sites em 5min, identidade visual em 2min)",
        "6 sliders comparativos 'Sem skill × Com skill' (Hamburgueria, Clínica, Loja de Roupa, Finanças, Academia, Loja de Hardware)",
        "Carrosséis reais postados no @zaraujo.lab e perfil gringo estilo Minecraft feitos via /arte",
        "Meta-prova no topo: badge 'CONQUISTA: Esse site foi feito com elas (Interface, Copy Lab, Humanização, Formatos)' destacando cada região ao passar o mouse",
      ],
      objecoes_tratadas: [
        "Precisa usar uma skill por vez? Não, /arte puxa a próxima automaticamente",
        "Já peço pro Claude replicar carrosséis — o que muda? Direção (ficha + proibições antes de montar) + Revisão bloqueadora no fim",
        "Qual plano do Claude/Figma precisa? Claude pago (Pro dá conta) + Figma Pro/Education (no grátis só lê)",
        "Posso usar pra clientes? Sim, sem limite (licença pessoal intransferível)",
        "Entra vídeo? Não no front (vendido no Bump 2 por R$ 97)",
      ],
      ctas: ["Crie arte e site que vendem · R$ 47", "QUERO AS 12 SKILLS (Cakto)", "Chamar no WhatsApp"],
      secoes: [
        { ordem: 1, tipo: "hero", titulo: "Hero + Conquista Meta-Prova + Mascote Claudinho c/ Estojo 12 Cartuchos", funcao: "Promessa direta 'arte e site sem cara de IA' + preço transparente R$ 47 acima da dobra + prova interativa das 4 skills que construíram a própria LP" },
        { ordem: 2, tipo: "prova", titulo: "Turma Fundadora (Marquee de 11 Prints WhatsApp)", funcao: "Prova social nativa e sem filtro mostrando velocidade (2-5 min) e aprovação de clientes" },
        { ordem: 3, tipo: "demonstracao", titulo: "Sem skill × Com skill (6 Clientes com Slider Arrastável)", funcao: "Contraste visual visceral entre 'média genérica de IA' (caixinhas/bullets) vs. direção de arte em camadas profundas" },
        { ordem: 4, tipo: "mecanismo", titulo: "Estojo Interativo das 12 Skills + Formatos Entregáveis", funcao: "Tangibiliza o entregável como 12 cartuchos colecionáveis com prévia real de Carrossel, Estático, Story e Banner" },
        { ordem: 5, tipo: "prova", titulo: "Carrosséis Reais (@zaraujo.lab + Perfil Gringo Minecraft)", funcao: "Prova de uso real recorrente em perfis de alta retenção" },
        { ordem: 6, tipo: "demonstracao", titulo: "Speedart Simultâneo (/arte em 6 negócios ao mesmo tempo)", funcao: "Mostra o processo real de camadas + passes sombra/brilho/ruído/revisado rodando ao vivo" },
        { ordem: 7, tipo: "mecanismo", titulo: "Mapa RPG das 7 Fases + Power-ups + Trilha Interface", funcao: "Explica a sequência exata do método: Briefing → Sistema → Direção → Roteiro → Copy/Humanização/Formatos → Montagem/Diagramação/Prompt → Revisão" },
        { ordem: 8, tipo: "oferta", titulo: "Card Preço.fig R$ 47 + Lista O Que Entra + Garantia 7 Dias", funcao: "Ancoragem visual no universo Figma + clareza de pré-requisitos e entrega perpétua da versão" },
        { ordem: 9, tipo: "qualificacao", titulo: "Serve pra você × Não serve + Checklist Interativo de Requisitos", funcao: "Anti-reembolso + qualificação explícita (exige revisão humana, computador, Claude pago e Figma pago)" },
        { ordem: 10, tipo: "faq", titulo: "FAQ em Formato de Mensagem + Botão WhatsApp + Fechamento", funcao: "Quebra 11 objeções reais + CTA final direto pra compra" },
      ],
    },
    copy: {
      gancho: "As únicas skills que você precisa pro Claude fazer arte e site sem cara de IA",
      promessa: "Você manda a marca, as cores e uma referência. As skills fazem o Claude seguir esse visual no carrossel, no anúncio, no story e na página de venda, já com o texto.",
      mecanismo: "12 skills encadeadas (/arte em 7 fases + 3 Copy + Prompt de Imagem + Interface) com ficha de direção + proibições antes de montar e revisão de arte bloqueadora no fim.",
      prova: "6 comparativos Sem Skill × Com Skill + speedart de 6 nichos + 11 prints de alunos no WhatsApp + própria página feita com as skills.",
      cta: "Crie arte e site que vendem · R$ 47",
    },
    editorial: {
      formato: "landing_page",
      temperatura_trafego: "frio",
      nivel_consciencia: "Consciente da Solução (C3)",
    },
    branding: {
      paleta: { tinta: "#0B0D09", papel: "#F3F3EC", lima: "#C9FF3B", azul_ceu: "#1250E0", laranja: "#FF8C1A" },
      fontes: ["Bricolage Grotesque", "Geist", "Geist Mono", "Fraunces"],
    },
    dissecado_em: new Date().toISOString(),
  };

  const headInjection = `\n  <link rel="stylesheet" href="/assets/imperio-animation-engine.css" />\n`;
  rawHtml = rawHtml.replace(/<\/head>/i, headInjection + "</head>");

  const bodyInjection = `
  <script>
    window.__IMPERIO_SITE_META__ = ${JSON.stringify({
      slug: SLUG,
      title: SITE_TITLE,
      originalUrl: TARGET_URL,
      githubUrl: GITHUB_URL,
      mode: "live-dom-clone",
      dissection,
    })};
  </script>
  <script src="/assets/imperio-animation-engine.js" defer></script>
`;
  rawHtml = rawHtml.replace(/<\/body>/i, bodyInjection + "</body>");

  const indexPath = path.join(SITE_DIR, "index.html");
  fs.writeFileSync(indexPath, rawHtml, "utf8");
  const htmlBytes = Buffer.byteLength(rawHtml, "utf8");
  console.log(`✅ Built clean interactive 1:1 clone: ${indexPath} (${htmlBytes} bytes)`);

  // 2. Verify locally using an embedded static HTTP server simulating Vercel rewrites!
  console.log("2) Verifying interactive clone via local HTTP server + Playwright...");
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".json": "application/json",
  };
  const server = http.createServer((req, res) => {
    const cleanPath = (req.url || "/").split("?")[0];
    let filePath;
    if (cleanPath === `/${SLUG}` || cleanPath === `/${SLUG}/`) {
      filePath = path.join(SITE_DIR, "index.html");
    } else if (cleanPath.startsWith(`/${SLUG}/`)) {
      filePath = path.join(SITE_DIR, cleanPath.slice(SLUG.length + 2));
    } else {
      filePath = path.join(ROOT_DIR, cleanPath.replace(/^\/+/, ""));
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end("Not found: " + cleanPath);
    }
  });

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const localUrl = `http://127.0.0.1:${port}/${SLUG}/`;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const pageErrors = [];
  const failedReqs = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("requestfailed", (req) => failedReqs.push(`${req.url()} (${req.failure()?.errorText})`));

  await page.goto(localUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);

  // Capture fresh preview.jpg from our actual clean clone
  await page.screenshot({ path: path.join(SITE_DIR, "preview.jpg"), type: "jpeg", quality: 85, fullPage: false });

  // Test interactive controls: click a skill slot + check slider initialized + check Raio-X button exists
  const check = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const visibleImgs = imgs.filter((i) => i.offsetParent !== null);
    const brokenVisible = visibleImgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
    const slidersReady = document.querySelectorAll("[data-ad].ad-js").length;
    const raioxBtn = !!document.querySelector("#imp-swipe-hud, #imp-raiox-drawer");
    return {
      title: document.title,
      totalImgs: imgs.length,
      brokenVisibleCount: brokenVisible.length,
      brokenVisible: brokenVisible.slice(0, 5),
      slidersReady,
      hasMeta: !!window.__IMPERIO_SITE_META__,
      raioxBtn,
    };
  });

  // Scroll to before/after section and take a verification shot in scratch
  await page.evaluate(() => {
    const el = document.querySelector("[data-ad]");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCRATCH_DIR, "clone_verify_sliders.jpg"), type: "jpeg", quality: 82 });

  await browser.close();
  server.close();

  console.log("🔍 Local Clone QA:", JSON.stringify(check, null, 2));
  console.log("🔍 Page errors:", pageErrors.length, pageErrors.slice(0, 5));
  console.log("🔍 Failed reqs:", failedReqs.length, failedReqs.slice(0, 5));

  if (check.brokenVisibleCount > 0 || check.slidersReady < 6) {
    console.warn("⚠️ Check QA warnings above!");
  }

  // 3. Update manifest.json, vercel.json, and Hub index.html (idempotent — updates if already present, appends if new)
  console.log("3) Updating manifest.json, vercel.json, and Hub index.html...");
  const manifestPath = path.join(ROOT_DIR, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const newEntry = {
    slug: SLUG,
    title: SITE_TITLE,
    originalUrl: TARGET_URL,
    siteIds: [SITE_UUID],
    mode: "live-dom-clone",
    statusLabel: "⚡ Clone 1:1 DOM + Animações",
    category: "🎬 IA, Vídeo & Criativos",
    htmlBytes,
    vercelUrl: VERCEL_URL,
    githubUrl: GITHUB_URL,
  };

  const existingIdx = manifest.findIndex((m) => m.slug === SLUG);
  if (existingIdx >= 0) {
    manifest[existingIdx] = newEntry;
  } else {
    manifest.push(newEntry);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // Update vercel.json
  const vercelPath = path.join(ROOT_DIR, "vercel.json");
  const vercelCfg = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
  const hasRewrite = vercelCfg.rewrites.some((r) => r.source === `/${SLUG}`);
  if (!hasRewrite) {
    vercelCfg.rewrites.push(
      { source: `/${SLUG}`, destination: `/sites/${SLUG}/index.html` },
      { source: `/${SLUG}/`, destination: `/sites/${SLUG}/index.html` },
      { source: `/${SLUG}/:path*`, destination: `/sites/${SLUG}/:path*` }
    );
    fs.writeFileSync(vercelPath, JSON.stringify(vercelCfg, null, 2), "utf8");
  }

  // Update Hub index.html
  const hubPath = path.join(ROOT_DIR, "index.html");
  let hubHtml = fs.readFileSync(hubPath, "utf8");
  const mapCatId = (label) => {
    if (label.includes("IA, Vídeo")) return "ia_video";
    if (label.includes("Marketing Direto")) return "marketing_funis";
    if (label.includes("Projetos Próprios")) return "projetos_proprios";
    if (label.includes("Concorrentes US")) return "concorrentes_us";
    return "infoprodutos_br";
  };

  const total = manifest.length;
  const liveCount = manifest.filter((r) => r.mode !== "vault-reconstructed").length;
  const vaultCount = manifest.filter((r) => r.mode === "vault-reconstructed").length;
  const countCat = (id) => manifest.filter((r) => mapCatId(r.category) === id).length;

  hubHtml = hubHtml.replace(
    /<title>Império Swipefile — \d+ Sites Clonados \(GitHub \+ Vercel c\/ Animações\)<\/title>/,
    `<title>Império Swipefile — ${total} Sites Clonados (GitHub + Vercel c/ Animações)</title>`
  );
  hubHtml = hubHtml.replace(
    /<h1>Swipefile <span>GitHub \+ Vercel<\/span> \(\d+ Sites c\/ Animações\)<\/h1>/,
    `<h1>Swipefile <span>GitHub + Vercel</span> (${total} Sites c/ Animações)</h1>`
  );
  hubHtml = hubHtml.replace(/Todos os \d+ sites únicos/, `Todos os ${total} sites únicos`);
  hubHtml = hubHtml.replace(
    /<div class="num">\d+<\/div>\s*<div class="lbl">Sites Únicos Clonados<\/div>/,
    `<div class="num">${total}</div>\n          <div class="lbl">Sites Únicos Clonados</div>`
  );
  hubHtml = hubHtml.replace(/<div class="num" style="color:#34d399">\d+<\/div>/, `<div class="num" style="color:#34d399">${liveCount}</div>`);
  hubHtml = hubHtml.replace(/<div class="num" style="color:#38bdf8">\d+<\/div>/, `<div class="num" style="color:#38bdf8">${vaultCount}</div>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn active" data-cat="all">Todos \(\d+\)<\/button>/, `<button class="pill-btn active" data-cat="all">Todos (${total})</button>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn" data-cat="concorrentes_us">🇺🇸 Concorrentes US \(\d+\)<\/button>/, `<button class="pill-btn" data-cat="concorrentes_us">🇺🇸 Concorrentes US (${countCat("concorrentes_us")})</button>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn" data-cat="projetos_proprios">👑 Projetos Próprios \(\d+\)<\/button>/, `<button class="pill-btn" data-cat="projetos_proprios">👑 Projetos Próprios (${countCat("projetos_proprios")})</button>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn" data-cat="ia_video">🎬 IA & Vídeo \(\d+\)<\/button>/, `<button class="pill-btn" data-cat="ia_video">🎬 IA & Vídeo (${countCat("ia_video")})</button>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn" data-cat="marketing_funis">📈 Marketing & Funis \(\d+\)<\/button>/, `<button class="pill-btn" data-cat="marketing_funis">📈 Marketing & Funis (${countCat("marketing_funis")})</button>`);
  hubHtml = hubHtml.replace(/<button class="pill-btn" data-cat="infoprodutos_br">🇧🇷 Infoprodutos BR \(\d+\)<\/button>/, `<button class="pill-btn" data-cat="infoprodutos_br">🇧🇷 Infoprodutos BR (${countCat("infoprodutos_br")})</button>`);

  // Update existing SITES JSON cleanly (preserving existing thumbUrls from hubHtml!)
  const sitesMatch = hubHtml.match(/const SITES = (\[[\s\S]*?\]);/);
  if (sitesMatch) {
    const existingSites = JSON.parse(sitesMatch[1]);
    const hubEntry = {
      slug: SLUG,
      title: SITE_TITLE,
      originalUrl: TARGET_URL,
      category: "ia_video",
      categoryLabel: "🎬 IA, Vídeo & Criativos",
      statusLabel: "⚡ Clone 1:1 DOM + Animações",
      thumbUrl: `/sites/${SLUG}/preview.jpg`,
      vercelPath: `/${SLUG}/`,
      githubUrl: GITHUB_URL,
    };
    const sIdx = existingSites.findIndex((s) => s.slug === SLUG);
    if (sIdx >= 0) existingSites[sIdx] = hubEntry;
    else existingSites.push(hubEntry);
    hubHtml = hubHtml.replace(/const SITES = \[[\s\S]*?\];/, `const SITES = ${JSON.stringify(existingSites)};`);
  }
  fs.writeFileSync(hubPath, hubHtml, "utf8");

  // Save dissection payload for Supabase sync
  fs.writeFileSync(
    path.join(SCRATCH_DIR, "skill_lab_db_payload.json"),
    JSON.stringify({ siteId: SITE_UUID, slug: SLUG, title: SITE_TITLE, url: TARGET_URL, vercelUrl: VERCEL_URL, githubUrl: GITHUB_URL, dissection }, null, 2),
    "utf8"
  );

  console.log(`✅ Swipefile Hub updated! Total clones: ${total} (live: ${liveCount}, vault: ${vaultCount}, ia_video: ${countCat("ia_video")})`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
