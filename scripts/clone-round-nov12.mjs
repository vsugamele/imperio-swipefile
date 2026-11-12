import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/vsuga/Desktop/V/Meus Negocios - Dados/Imperio System/package.json");
const { chromium } = require("playwright");

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const STEP_941_FILE =
  "C:/Users/vsuga/.gemini/antigravity/brain/0ede690d-603a-486a-833e-5d0cfe962538/.system_generated/steps/941/output.txt";

const GITHUB_REPO_BASE = "https://github.com/vsugamele/imperio-swipefile/tree/main/sites";
const VERCEL_BASE = "https://imperio-swipefile.vercel.app";

fs.mkdirSync(SITES_DIR, { recursive: true });

function parseStepJson(filePath) {
  const rawTxt = fs.readFileSync(filePath, "utf8");
  const outer = JSON.parse(rawTxt);
  const str = outer.result || "";
  const match = str.match(/<untrusted-data-[^>]+>\s*(\[[\s\S]*\])\s*<\/untrusted-data-/);
  if (!match) throw new Error(`Could not parse SQL JSON from ${filePath}`);
  return JSON.parse(match[1]);
}

function canonicalKey(rawUrl) {
  try {
    const u = new URL(rawUrl.trim());
    const keepParams = new URLSearchParams();
    if (u.searchParams.has("aberto")) {
      keepParams.set("aberto", u.searchParams.get("aberto"));
    }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, "") || "/";
    const qs = keepParams.toString();
    return `${host}${pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function makeSlugForNewRow(row, usedSlugs) {
  const titleStr = row.titulo || "";
  const urlStr = row.url || "";
  let hostPart = "";
  let pathPart = "";
  try {
    const u = new URL(urlStr);
    hostPart = u.hostname.replace(/^www\./i, "").split(".")[0];
    pathPart = u.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.(html|php|jpg|png)$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-");
  } catch {}

  let base = titleStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(abrir|pagina|lp|http|https|www|com|online|site|info|org|shop|print)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  if (!base || base.length < 4) {
    base = [hostPart, pathPart].filter(Boolean).join("-").toLowerCase().slice(0, 40);
  }
  if (!base) base = "site-clone";

  let candidate = base;
  let counter = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function classifyBatchCategory(row) {
  const hay = `${row.titulo || ""} ${row.url || ""} ${(row.tags || []).join(" ")} ${row.summary || ""}`.toLowerCase();

  if (
    [
      "jpfreitas",
      "jphaireducation",
      "clubedasbrabas",
      "codigodoscortes",
      "checkout.ticto.app",
      "erevanton",
      "kings-code",
      "linfaflow",
      "memoflow",
      "truememoflow",
      "truevitallabs",
      "slimsoda-powder",
      "slim-soda01.vercel.app",
      "cardioflush",
      "leaftide-powder",
    ].some((k) => hay.includes(k))
  ) {
    return { id: "projetos_proprios", label: "👑 Projetos Próprios (Império)" };
  }
  if (
    [
      "memodyne",
      "horsefil",
      "brain recall",
      "brain-vsl",
      "the lost prayer",
      "the last wish",
      "seed of heritage",
      "esther secret",
      "sacred manuscript",
      "powerup",
      "sodapril",
      "lumivelle",
      "swiperadar",
      "abundant-life",
      "vitalitysourcesnow",
      "mymichaelguide",
      "unlockblessings",
      "sacredstudyguide",
      "powerfulwellness",
      "powerupmax",
      "stonepathway",
      "go-glenwood",
      "lightlivingguide",
      "clearloopbase",
      "myworldjournal",
    ].some((k) => hay.includes(k))
  ) {
    return { id: "concorrentes_us", label: "🇺🇸 Concorrentes US · Nutra & Fé" };
  }
  if (
    [
      "ia ",
      "ia]",
      "arquiteto ia",
      "black ia",
      "mago das automacoes",
      "magoautomacoes",
      "escoladeautomacao",
      "academialendaria",
      "filmboss",
      "rickmiura",
      "viralugcvideo",
      "maquinadevsl",
      "ogflow",
      "mestres.ai",
      "blackinfinita",
      "camaleon",
      "wilsouza",
      "maquinadecriativos",
      "máquina de criativos",
      "criativos que vendem",
      "criativo que vende",
      "clonequevende",
      "bgcoding",
      "3dicons",
      "video",
      "criativos",
    ].some((k) => hay.includes(k))
  ) {
    return { id: "ia_video", label: "🎬 IA, Vídeo & Criativos" };
  }
  if (
    [
      "roas",
      "funis",
      "russell brunson",
      "camaleao copy",
      "camaleão copy",
      "carta convite",
      "steccaletter",
      "skalers",
      "swipe lab",
      "swipelab",
      "guilhermebifi",
      "publisher",
      "sprintlp",
      "orbyka",
      "fullsalessystem",
      "pit-stop",
      "black90",
      "acelerador black",
      "briefing",
    ].some((k) => hay.includes(k))
  ) {
    return { id: "marketing_funis", label: "📈 Marketing Direto & Funis" };
  }
  return { id: "infoprodutos_br", label: "🇧🇷 Infoprodutos & LPs" };
}

function mapCategoryLabelToObj(label) {
  if (label.includes("IA, Vídeo")) return { id: "ia_video", label: "🎬 IA, Vídeo & Criativos" };
  if (label.includes("Marketing Direto")) return { id: "marketing_funis", label: "📈 Marketing Direto & Funis" };
  if (label.includes("Projetos Próprios")) return { id: "projetos_proprios", label: "👑 Projetos Próprios (Império)" };
  if (label.includes("Concorrentes US")) return { id: "concorrentes_us", label: "🇺🇸 Concorrentes US · Nutra & Fé" };
  return { id: "infoprodutos_br", label: "🇧🇷 Infoprodutos & LPs" };
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildVaultAnimatedHtml(item) {
  const title = item.titulo || item.slug;
  const originalUrl = item.url;
  const githubUrl = `${GITHUB_REPO_BASE}/${item.slug}`;
  const shotUrl = item.fullpage_screenshot_url || item.thumbnail_url || "";
  const diss = item.estrutura_json || {};
  const pagina = diss.pagina || {};
  const copyObj = diss.copy || {};

  const summary =
    pagina.por_que_converte ||
    item.summary ||
    copyObj.promessa ||
    "Página dissecada e arquivada no Cofre Império Swipefile com estrutura persuasiva, mecanismo único e captura visual preservadas.";
  const md = item.content_md || "";

  const colorsObj = item.branding_json?.colors || {};
  const primaryColor = colorsObj.primary || colorsObj.accent || "#f59e0b";

  // Build Dissected Strategy Card if available
  const headline = pagina.headline || copyObj.gancho || title;
  const mecanismo = pagina.mecanismo || copyObj.mecanismo || "";
  const porQueConverte = pagina.por_que_converte || "";
  const oferta = pagina.oferta || {};
  const provas = Array.isArray(pagina.provas) ? pagina.provas : [];
  const objecoes = Array.isArray(pagina.objecoes_tratadas) ? pagina.objecoes_tratadas : [];
  const secoesDissecadas = Array.isArray(pagina.secoes) ? pagina.secoes : [];

  const dissectionHeaderHtml =
    mecanismo || porQueConverte || provas.length || objecoes.length
      ? `
      <section class="imp-vault-section" data-imp-reveal="up" style="border-color: rgba(245, 158, 11, 0.38); background: linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(15, 23, 42, 0.88));">
        <div class="imp-vault-sec-badge" style="color: #fbbf24;">🧬 Dissecação Estratégica (Império AI)</div>
        <h2 class="imp-vault-h2">${escapeHtml(headline)}</h2>
        <div class="imp-vault-sec-body">
          ${mecanismo ? `<p class="imp-vault-p"><strong style="color:#fde68a">⚙️ Mecanismo Único:</strong> ${escapeHtml(mecanismo)}</p>` : ""}
          ${porQueConverte ? `<p class="imp-vault-p"><strong style="color:#34d399">🎯 Por que converte:</strong> ${escapeHtml(porQueConverte)}</p>` : ""}
          ${
            oferta.produto || oferta.preco || oferta.garantia
              ? `<p class="imp-vault-p"><strong style="color:#38bdf8">💰 Oferta & Ancoragem:</strong> ${escapeHtml(
                  [
                    oferta.produto,
                    oferta.ancoragem ? `Ancoragem: ${oferta.ancoragem}` : null,
                    oferta.preco ? `Preço: ${oferta.preco}` : null,
                    oferta.garantia ? `Garantia: ${oferta.garantia}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                )}</p>`
              : ""
          }
          ${
            provas.length
              ? `<p class="imp-vault-p"><strong style="color:#a78bfa">📊 Provas Utilizadas:</strong> ${escapeHtml(provas.join(" · "))}</p>`
              : ""
          }
          ${
            objecoes.length
              ? `<p class="imp-vault-p"><strong style="color:#fb7185">🛡️ Objeções Tratadas:</strong> ${escapeHtml(objecoes.join(" · "))}</p>`
              : ""
          }
        </div>
      </section>`
      : "";

  let sectionsHtml = "";
  if (secoesDissecadas.length > 0) {
    sectionsHtml = secoesDissecadas
      .map((sec, idx) => {
        return `
      <section class="imp-vault-section" data-imp-reveal="up" style="--imp-delay: ${(idx % 3) * 80}ms">
        <div class="imp-vault-sec-badge">Bloco ${String(sec.ordem || idx + 1).padStart(2, "0")} · ${escapeHtml((sec.tipo || "secao").toUpperCase())}</div>
        <h2 class="imp-vault-h2">${escapeHtml(sec.titulo || `Seção ${idx + 1}`)}</h2>
        <div class="imp-vault-sec-body">
          ${sec.funcao ? `<p class="imp-vault-p" style="color:#94a3b8;font-style:italic">🎯 Função Tática: ${escapeHtml(sec.funcao)}</p>` : ""}
          ${sec.trecho ? `<p class="imp-vault-p">${escapeHtml(sec.trecho)}</p>` : ""}
        </div>
      </section>`;
      })
      .join("\n");
  } else {
    const lines = md
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("Content is user-generated"));

    const sections = [];
    let currentSec = { heading: title, paragraphs: [] };
    for (const line of lines) {
      if (/^#{1,3}\s+/.test(line)) {
        if (currentSec.paragraphs.length > 0) sections.push(currentSec);
        currentSec = {
          heading: line.replace(/^#{1,3}\s+/, "").trim(),
          paragraphs: [],
        };
      } else if (line.length > 2) {
        currentSec.paragraphs.push(line);
      }
    }
    if (currentSec.paragraphs.length > 0 || sections.length === 0) {
      sections.push(currentSec);
    }

    sectionsHtml = sections
      .slice(0, 24)
      .map((sec, idx) => {
        const bodyHtml = sec.paragraphs
          .slice(0, 20)
          .map((p) => {
            if (/^[-*•✓✔]\s+/.test(p)) {
              return `<li class="imp-vault-bullet">${escapeHtml(p.replace(/^[-*•✓✔]\s+/, ""))}</li>`;
            }
            const imgMatch = p.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
            if (imgMatch) {
              return `<div class="imp-vault-img-wrap"><img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}" loading="lazy" /></div>`;
            }
            return `<p class="imp-vault-p">${escapeHtml(p.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"))}</p>`;
          })
          .join("\n");

        return `
      <section class="imp-vault-section" data-imp-reveal="up" style="--imp-delay: ${(idx % 3) * 80}ms">
        <div class="imp-vault-sec-badge">Bloco ${String(idx + 1).padStart(2, "0")}</div>
        <h2 class="imp-vault-h2">${escapeHtml(sec.heading)}</h2>
        <div class="imp-vault-sec-body">
          ${bodyHtml}
        </div>
      </section>`;
      })
      .join("\n");
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Clone Swipefile Império</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/imperio-animation-engine.css" />
  <style>
    :root {
      --brand: ${primaryColor};
      --bg-dark: #070b14;
      --card-bg: rgba(15, 23, 42, 0.78);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: radial-gradient(circle at 20% 0%, rgba(245, 158, 11, 0.14), transparent 45%),
                  radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.12), transparent 45%),
                  #070b14;
      color: #f1f5f9;
      line-height: 1.65;
      overflow-x: hidden;
    }
    .imp-hero {
      position: relative;
      padding: 72px 24px 56px;
      max-width: 1180px;
      margin: 0 auto;
      text-align: center;
    }
    .imp-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.38);
      color: #fbbf24;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .imp-h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(2rem, 4.5vw, 3.6rem);
      font-weight: 800;
      line-height: 1.12;
      margin-bottom: 18px;
      background: linear-gradient(135deg, #ffffff 0%, #fde68a 60%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .imp-sub {
      max-width: 780px;
      margin: 0 auto 28px;
      color: #94a3b8;
      font-size: 1.08rem;
    }
    .imp-hero-actions {
      display: flex;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 40px;
    }
    .imp-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 15px 30px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      color: #090d16;
      font-weight: 800;
      font-size: 15px;
      text-decoration: none;
      box-shadow: 0 14px 34px rgba(245, 158, 11, 0.35);
    }
    .imp-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 15px 24px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #e2e8f0;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
    }
    .imp-main-grid {
      max-width: 1220px;
      margin: 0 auto;
      padding: 0 24px 90px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 28px;
    }
    @media (min-width: 980px) {
      .imp-main-grid.has-shot {
        grid-template-columns: 5fr 6fr;
        align-items: start;
      }
    }
    .imp-shot-frame {
      position: sticky;
      top: 24px;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: #0f172a;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
    }
    .imp-shot-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 16px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #94a3b8;
    }
    .imp-dots { display: flex; gap: 6px; }
    .imp-dots span { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .imp-shot-scroll {
      max-height: 76vh;
      overflow-y: auto;
    }
    .imp-shot-scroll img {
      width: 100%;
      height: auto;
      display: block;
    }
    .imp-sections-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .imp-vault-section {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      padding: 26px 28px;
    }
    .imp-vault-sec-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #38bdf8;
      margin-bottom: 8px;
    }
    .imp-vault-h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.4rem;
      color: #f8fafc;
      margin-bottom: 14px;
    }
    .imp-vault-p {
      color: #cbd5e1;
      font-size: 0.96rem;
      margin-bottom: 12px;
      word-break: break-word;
    }
    .imp-vault-bullet {
      list-style: none;
      position: relative;
      padding-left: 24px;
      color: #e2e8f0;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }
    .imp-vault-bullet::before {
      content: "✦";
      position: absolute;
      left: 0;
      color: #fbbf24;
    }
    .imp-vault-img-wrap {
      margin: 14px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .imp-vault-img-wrap img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <header class="imp-hero" data-imp-reveal="up">
    <div class="imp-eyebrow imp-float">🛡️ Cofre Império Swipefile · Página Dissecada & Copy Preservada</div>
    <h1 class="imp-h1">${escapeHtml(title)}</h1>
    <p class="imp-sub">${escapeHtml(summary)}</p>
    <div class="imp-hero-actions">
      <a href="#copy-estruturada" class="imp-btn-primary imp-cta-animated">⚡ Explorar Dissecação & Blocos</a>
      <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer" class="imp-btn-secondary">🌐 Abrir URL / Print Original ↗</a>
    </div>
  </header>

  <main id="copy-estruturada" class="imp-main-grid ${shotUrl ? "has-shot" : ""}">
    ${
      shotUrl
        ? `<div class="imp-shot-frame" data-imp-reveal="left">
            <div class="imp-shot-bar">
              <div class="imp-dots">
                <span style="background:#ef4444"></span>
                <span style="background:#f59e0b"></span>
                <span style="background:#10b981"></span>
              </div>
              <span>📸 Captura Visual Salva no Cofre (Role para ver ↕)</span>
            </div>
            <div class="imp-shot-scroll">
              <img src="${escapeHtml(shotUrl)}" alt="${escapeHtml(title)}" />
            </div>
          </div>`
        : ""
    }
    <div class="imp-sections-col">
      ${dissectionHeaderHtml}
      ${sectionsHtml}
    </div>
  </main>

  <script>
    window.__IMPERIO_SITE_META__ = ${JSON.stringify({
      slug: item.slug,
      title,
      originalUrl,
      githubUrl,
      mode: "vault-reconstructed",
      dissection: item.estrutura_json || null,
    })};
  </script>
  <script src="/assets/imperio-animation-engine.js" defer></script>
</body>
</html>`;
}

async function cloneSingleSite(browser, item, idx, total) {
  const siteDir = path.join(SITES_DIR, item.slug);
  fs.mkdirSync(siteDir, { recursive: true });
  const githubUrl = `${GITHUB_REPO_BASE}/${item.slug}`;
  const isStoragePrintUrl =
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(item.url || "") ||
    (item.url || "").includes("/storage/v1/object/public/project-media/referencias/");

  if (isStoragePrintUrl) {
    console.log(`[${idx + 1}/${total}] 🖼️ Building Dissected Vault Page from Print: ${item.slug}...`);
    const vaultHtml = buildVaultAnimatedHtml(item);
    fs.writeFileSync(path.join(siteDir, "index.html"), vaultHtml, "utf8");
    return {
      ...item,
      mode: "vault-reconstructed",
      statusLabel: "🛡️ Cofre Reconstruído + Animações",
      htmlBytes: Buffer.byteLength(vaultHtml, "utf8"),
      hasLocalPreview: fs.existsSync(path.join(siteDir, "preview.jpg")),
    };
  }

  console.log(`[${idx + 1}/${total}] 🌐 Cloning live DOM + animations: ${item.slug} (${item.url})...`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  try {
    const resp = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 22000 });
    await page.waitForTimeout(2400);
    const status = resp ? resp.status() : 0;

    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let scrolled = 0;
        const maxScroll = Math.min(document.body ? document.body.scrollHeight : 6000, 14000);
        const step = 650;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          scrolled += step;
          if (scrolled >= maxScroll) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 350);
          }
        }, 70);
      });
    });

    const localShotPath = path.join(siteDir, "preview.jpg");
    await page.screenshot({ path: localShotPath, type: "jpeg", quality: 82, fullPage: false });

    const extracted = await page.evaluate(() => {
      const originUrl = window.location.href;
      const toAbs = (raw) => {
        if (!raw || typeof raw !== "string") return raw;
        const trimmed = raw.trim();
        if (
          !trimmed ||
          trimmed.startsWith("data:") ||
          trimmed.startsWith("blob:") ||
          trimmed.startsWith("mailto:") ||
          trimmed.startsWith("tel:") ||
          trimmed.startsWith("javascript:") ||
          trimmed.startsWith("#")
        ) {
          return trimmed;
        }
        try {
          return new URL(trimmed, originUrl).href;
        } catch {
          return trimmed;
        }
      };

      const rewriteCssUrls = (cssText, baseHref) => {
        if (!cssText) return "";
        return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, relUrl) => {
          const t = (relUrl || "").trim();
          if (!t || t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("#")) return full;
          try {
            const abs = new URL(t, baseHref || originUrl).href;
            return `url("${abs}")`;
          } catch {
            return full;
          }
        });
      };

      document.querySelectorAll(".esconder, .hidden, [style*='display: none'], [style*='display:none']").forEach((el) => {
        const idOrCls = `${el.id || ""} ${el.className || ""}`.toLowerCase();
        if (
          idOrCls.includes("esconder") ||
          idOrCls.includes("delayed") ||
          idOrCls.includes("pitch") ||
          idOrCls.includes("offer") ||
          idOrCls.includes("cta")
        ) {
          el.style.display = "block";
        }
      });

      const cssomChunks = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const owner = sheet.ownerNode;
          const sheetHref = sheet.href || originUrl;
          if (owner && owner.tagName === "STYLE" && (!owner.textContent || owner.textContent.trim().length < 20)) {
            const rules = Array.from(sheet.cssRules || [])
              .map((r) => r.cssText)
              .join("\n");
            if (rules) cssomChunks.push(rewriteCssUrls(rules, sheetHref));
          } else if (owner && owner.tagName === "STYLE" && owner.textContent) {
            owner.textContent = rewriteCssUrls(owner.textContent, originUrl);
          }
        } catch {}
      }

      if (document.adoptedStyleSheets) {
        for (const sheet of Array.from(document.adoptedStyleSheets)) {
          try {
            const rules = Array.from(sheet.cssRules || [])
              .map((r) => r.cssText)
              .join("\n");
            if (rules) cssomChunks.push(rewriteCssUrls(rules, originUrl));
          } catch {}
        }
      }

      document.querySelectorAll("link[href]").forEach((link) => {
        const rel = (link.getAttribute("rel") || "").toLowerCase();
        if (rel === "modulepreload" || rel === "preload") {
          link.remove();
          return;
        }
        link.setAttribute("href", toAbs(link.getAttribute("href")));
      });

      document.querySelectorAll("img").forEach((img) => {
        const dataSrc =
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy-src") ||
          img.getAttribute("data-original");
        const curSrc = img.getAttribute("src") || "";
        if (dataSrc && (!curSrc || curSrc.startsWith("data:image/svg"))) {
          img.setAttribute("src", toAbs(dataSrc));
        } else if (curSrc) {
          const absSrc = toAbs(curSrc);
          try {
            const u = new URL(absSrc);
            const innerUrl = u.searchParams.get("url");
            if (u.pathname.includes("/_next/image") && innerUrl) {
              img.setAttribute("src", new URL(innerUrl, originUrl).href);
              img.removeAttribute("srcset");
            } else {
              img.setAttribute("src", absSrc);
            }
          } catch {
            img.setAttribute("src", absSrc);
          }
        }
        if (img.hasAttribute("srcset")) {
          const srcset = img
            .getAttribute("srcset")
            .split(",")
            .map((part) => {
              const p = part.trim().split(/\s+/);
              if (!p[0]) return "";
              let resolved = toAbs(p[0]);
              try {
                const u = new URL(resolved);
                if (u.pathname.includes("/_next/image") && u.searchParams.get("url")) {
                  resolved = new URL(u.searchParams.get("url"), originUrl).href;
                }
              } catch {}
              return [resolved, p[1]].filter(Boolean).join(" ");
            })
            .filter(Boolean)
            .join(", ");
          img.setAttribute("srcset", srcset);
        }
        img.removeAttribute("loading");
      });

      document.querySelectorAll("video, audio, source").forEach((media) => {
        if (media.hasAttribute("src")) media.setAttribute("src", toAbs(media.getAttribute("src")));
        if (media.hasAttribute("poster")) media.setAttribute("poster", toAbs(media.getAttribute("poster")));
      });

      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (href && !href.startsWith("#")) {
          a.setAttribute("href", toAbs(href));
        }
      });

      document.querySelectorAll("[style]").forEach((el) => {
        let st = el.getAttribute("style") || "";
        if (st.includes("url(")) {
          st = rewriteCssUrls(st, originUrl);
          el.setAttribute("style", st);
        }
        if (/opacity\s*:\s*0\b/i.test(st)) {
          el.style.opacity = "";
          el.style.transform = "";
          el.setAttribute("data-imp-reveal", "up");
        }
      });

      document.querySelectorAll("script").forEach((scr) => {
        const src = (scr.getAttribute("src") || "").toLowerCase();
        const type = (scr.getAttribute("type") || "").toLowerCase();
        const txt = (scr.textContent || "").toLowerCase();

        const isAnalyticsOrRouter =
          type === "module" ||
          src.includes("/_next/") ||
          src.includes("/assets/index-") ||
          src.includes("googletagmanager") ||
          src.includes("fbevents") ||
          src.includes("clarity.ms") ||
          src.includes("hotjar") ||
          src.includes("utm") ||
          src.includes("rocket-loader") ||
          txt.includes("__next_f") ||
          txt.includes("fbq(") ||
          txt.includes("window.location.replace") ||
          txt.includes("window.location.href =");

        if (isAnalyticsOrRouter) {
          scr.remove();
        } else if (src) {
          scr.setAttribute("src", toAbs(scr.getAttribute("src")));
        }
      });

      const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
      const bodyText = (document.body ? document.body.innerText : "").trim();
      const pageTitle = document.title || "";
      const hasPlayerOrDom =
        html.includes("vturb") ||
        html.includes("converteai") ||
        html.includes("<video") ||
        html.includes("<iframe") ||
        document.querySelectorAll("div, section, img, button, a").length >= 10;

      return {
        html,
        cssom: cssomChunks.join("\n"),
        bodyTextLen: bodyText.length,
        bodySnippet: bodyText.slice(0, 600),
        pageTitle,
        hasPlayerOrDom,
      };
    });

    const isBlockedOrParked =
      status >= 400 ||
      (!extracted.hasPlayerOrDom && extracted.bodyTextLen < 120) ||
      /just a moment|attention required|404 not found|página não encontrada|page not found|error 404|403 forbidden|cloudflare|domain for sale|buy this domain|sedoparking|parkingcrew|hugedomains|deployment_not_found|site not found|default web site page|cgi-sys/i.test(
        `${extracted.pageTitle} ${extracted.bodySnippet}`
      );

    if (isBlockedOrParked) {
      await context.close().catch(() => {});
      if (fs.existsSync(localShotPath)) {
        try {
          fs.unlinkSync(localShotPath);
        } catch {}
      }
      console.log(
        `   ⚠️ Live URL returned parked/blocked/empty page (HTTP ${status}, ${extracted.bodyTextLen} chars). Reconstructing from Dissected Vault...`
      );
      const vaultHtml = buildVaultAnimatedHtml(item);
      fs.writeFileSync(path.join(siteDir, "index.html"), vaultHtml, "utf8");
      return {
        ...item,
        mode: "vault-reconstructed",
        statusLabel: "🛡️ Cofre Reconstruído + Animações",
        htmlBytes: Buffer.byteLength(vaultHtml, "utf8"),
        hasLocalPreview: false,
      };
    }

    await context.close().catch(() => {});

    let finalHtml = extracted.html;
    const headCloseIdx = finalHtml.search(/<\/head>/i);
    const headInjection = `
  <link rel="stylesheet" href="/assets/imperio-animation-engine.css" />
  ${extracted.cssom ? `<style id="imperio-cloned-cssom">\n${extracted.cssom}\n</style>` : ""}
`;
    if (headCloseIdx !== -1) {
      finalHtml = finalHtml.slice(0, headCloseIdx) + headInjection + finalHtml.slice(headCloseIdx);
    } else {
      finalHtml = headInjection + finalHtml;
    }

    const bodyInjection = `
  <script>
    window.__IMPERIO_SITE_META__ = ${JSON.stringify({
      slug: item.slug,
      title: item.titulo,
      originalUrl: item.url,
      githubUrl,
      mode: "live-dom-clone",
      dissection: item.estrutura_json || null,
    })};
  </script>
  <script src="/assets/imperio-animation-engine.js" defer></script>
`;
    const bodyCloseIdx = finalHtml.search(/<\/body>/i);
    if (bodyCloseIdx !== -1) {
      finalHtml = finalHtml.slice(0, bodyCloseIdx) + bodyInjection + finalHtml.slice(bodyCloseIdx);
    } else {
      finalHtml = finalHtml + bodyInjection;
    }

    fs.writeFileSync(path.join(siteDir, "index.html"), finalHtml, "utf8");
    console.log(`   ✅ Cloned 1:1 Live DOM for ${item.slug} (${Buffer.byteLength(finalHtml, "utf8")} bytes)`);
    return {
      ...item,
      mode: "live-dom-clone",
      statusLabel: "⚡ Clone 1:1 DOM + Animações",
      htmlBytes: Buffer.byteLength(finalHtml, "utf8"),
      hasLocalPreview: fs.existsSync(localShotPath),
    };
  } catch (err) {
    await context.close().catch(() => {});
    console.log(
      `   ⚠️ Live fetch failed for ${item.slug} (${err.message.split("\n")[0]}). Building Dissected Vault replica...`
    );
    const vaultHtml = buildVaultAnimatedHtml(item);
    fs.writeFileSync(path.join(siteDir, "index.html"), vaultHtml, "utf8");
    return {
      ...item,
      mode: "vault-reconstructed",
      statusLabel: "🛡️ Cofre Reconstruído + Animações",
      htmlBytes: Buffer.byteLength(vaultHtml, "utf8"),
      hasLocalPreview: false,
    };
  }
}

async function main() {
  const existingManifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
  const usedSlugs = new Set();
  const byCanon = new Map();

  const existingResults = existingManifest.map((m) => {
    usedSlugs.add(m.slug);
    const localPreviewExists = fs.existsSync(path.join(SITES_DIR, m.slug, "preview.jpg"));
    const item = {
      slug: m.slug,
      titulo: m.title,
      url: m.originalUrl,
      siteIds: [...m.siteIds],
      mode: m.mode,
      statusLabel: m.statusLabel,
      category: mapCategoryLabelToObj(m.category),
      htmlBytes: m.htmlBytes,
      hasLocalPreview: localPreviewExists,
      thumbnail_url: "",
      fullpage_screenshot_url: "",
    };
    byCanon.set(canonicalKey(m.originalUrl), item);
    return item;
  });

  const step941Rows = parseStepJson(STEP_941_FILE);
  console.log(`Loaded ${step941Rows.length} newly dissected uncloned rows from step 941.`);

  const newItemsToClone = [];
  for (const row of step941Rows) {
    const cKey = canonicalKey(row.url);
    if (byCanon.has(cKey)) {
      const existing = byCanon.get(cKey);
      if (!existing.siteIds.includes(row.id)) {
        existing.siteIds.push(row.id);
      }
      continue;
    }

    const slug = makeSlugForNewRow(row, usedSlugs);
    const category = classifyBatchCategory(row);
    const newItem = {
      ...row,
      slug,
      category,
      siteIds: [row.id],
    };
    byCanon.set(cKey, newItem);
    newItemsToClone.push(newItem);
  }

  console.log(`Prepared ${newItemsToClone.length} unique newly dissected sites to clone.`);

  const browser = await chromium.launch({ headless: true });
  const clonedResults = new Array(newItemsToClone.length);
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < newItemsToClone.length) {
      const idx = cursor++;
      const item = newItemsToClone[idx];
      clonedResults[idx] = await cloneSingleSite(browser, item, idx, newItemsToClone.length);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Capture local preview.jpg for any newly cloned site that does not have one yet
  for (const r of clonedResults) {
    const previewPath = path.join(SITES_DIR, r.slug, "preview.jpg");
    const indexHtmlPath = path.join(SITES_DIR, r.slug, "index.html");
    if (!fs.existsSync(previewPath) && fs.existsSync(indexHtmlPath)) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const pg = await ctx.newPage();
      try {
        const fileUrl = "file:///" + indexHtmlPath.replace(/\\/g, "/");
        await pg.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
        await pg.waitForTimeout(1000);
        await pg.screenshot({ path: previewPath, type: "jpeg", quality: 82, fullPage: false });
        r.hasLocalPreview = true;
        console.log(`📸 Captured local preview.jpg for ${r.slug}`);
      } catch {} finally {
        await ctx.close().catch(() => {});
      }
    }
  }

  await browser.close();

  const finalResults = [...existingResults, ...clonedResults];

  // Update index.html
  let indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const total = finalResults.length;
  const liveCount = finalResults.filter((r) => r.mode !== "vault-reconstructed").length;
  const vaultCount = finalResults.filter((r) => r.mode === "vault-reconstructed").length;
  const countCat = (id) => finalResults.filter((r) => r.category.id === id).length;

  indexHtml = indexHtml.replace(
    /<title>Império Swipefile — \d+ Sites Clonados \(GitHub \+ Vercel c\/ Animações\)<\/title>/,
    `<title>Império Swipefile — ${total} Sites Clonados (GitHub + Vercel c/ Animações)</title>`
  );
  indexHtml = indexHtml.replace(
    /<h1>Swipefile <span>GitHub \+ Vercel<\/span> \(\d+ Sites c\/ Animações\)<\/h1>/,
    `<h1>Swipefile <span>GitHub + Vercel</span> (${total} Sites c/ Animações)</h1>`
  );
  indexHtml = indexHtml.replace(
    /Todos os \d+ sites únicos/,
    `Todos os ${total} sites únicos`
  );
  indexHtml = indexHtml.replace(
    /<div class="num">\d+<\/div>\s*<div class="lbl">Sites Únicos Clonados<\/div>/,
    `<div class="num">${total}</div>\n          <div class="lbl">Sites Únicos Clonados</div>`
  );
  indexHtml = indexHtml.replace(
    /<div class="num" style="color:#34d399">\d+<\/div>/,
    `<div class="num" style="color:#34d399">${liveCount}</div>`
  );
  indexHtml = indexHtml.replace(
    /<div class="num" style="color:#38bdf8">\d+<\/div>/,
    `<div class="num" style="color:#38bdf8">${vaultCount}</div>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn active" data-cat="all">Todos \(\d+\)<\/button>/,
    `<button class="pill-btn active" data-cat="all">Todos (${total})</button>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn" data-cat="concorrentes_us">🇺🇸 Concorrentes US \(\d+\)<\/button>/,
    `<button class="pill-btn" data-cat="concorrentes_us">🇺🇸 Concorrentes US (${countCat("concorrentes_us")})</button>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn" data-cat="projetos_proprios">👑 Projetos Próprios \(\d+\)<\/button>/,
    `<button class="pill-btn" data-cat="projetos_proprios">👑 Projetos Próprios (${countCat("projetos_proprios")})</button>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn" data-cat="ia_video">🎬 IA & Vídeo \(\d+\)<\/button>/,
    `<button class="pill-btn" data-cat="ia_video">🎬 IA & Vídeo (${countCat("ia_video")})</button>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn" data-cat="marketing_funis">📈 Marketing & Funis \(\d+\)<\/button>/,
    `<button class="pill-btn" data-cat="marketing_funis">📈 Marketing & Funis (${countCat("marketing_funis")})</button>`
  );
  indexHtml = indexHtml.replace(
    /<button class="pill-btn" data-cat="infoprodutos_br">🇧🇷 Infoprodutos BR \(\d+\)<\/button>/,
    `<button class="pill-btn" data-cat="infoprodutos_br">🇧🇷 Infoprodutos BR (${countCat("infoprodutos_br")})</button>`
  );

  const sitesArrayForHub = finalResults.map((r) => ({
    slug: r.slug,
    title: r.titulo,
    originalUrl: r.url,
    category: r.category.id,
    categoryLabel: r.category.label,
    statusLabel: r.statusLabel,
    thumbUrl: r.hasLocalPreview
      ? `/sites/${r.slug}/preview.jpg`
      : r.thumbnail_url || r.fullpage_screenshot_url || "",
    vercelPath: `/${r.slug}/`,
    githubUrl: `${GITHUB_REPO_BASE}/${r.slug}`,
  }));

  indexHtml = indexHtml.replace(
    /const SITES = \[[\s\S]*?\];/,
    `const SITES = ${JSON.stringify(sitesArrayForHub)};`
  );
  fs.writeFileSync(path.join(ROOT_DIR, "index.html"), indexHtml, "utf8");

  // Write vercel.json
  const rewrites = [];
  for (const r of finalResults) {
    rewrites.push({ source: `/${r.slug}`, destination: `/sites/${r.slug}/index.html` });
    rewrites.push({ source: `/${r.slug}/`, destination: `/sites/${r.slug}/index.html` });
    rewrites.push({ source: `/${r.slug}/:path*`, destination: `/sites/${r.slug}/:path*` });
  }
  const vercelConfig = {
    cleanUrls: false,
    trailingSlash: false,
    rewrites,
  };
  fs.writeFileSync(path.join(ROOT_DIR, "vercel.json"), JSON.stringify(vercelConfig, null, 2), "utf8");

  // Write manifest.json
  const manifest = finalResults.map((r) => ({
    slug: r.slug,
    title: r.titulo,
    originalUrl: r.url,
    siteIds: r.siteIds,
    mode: r.mode,
    statusLabel: r.statusLabel,
    category: r.category.label,
    htmlBytes: r.htmlBytes,
    vercelUrl: `${VERCEL_BASE}/${r.slug}/`,
    githubUrl: `${GITHUB_REPO_BASE}/${r.slug}`,
  }));
  fs.writeFileSync(path.join(ROOT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const totalSiteIds = manifest.reduce((acc, m) => acc + m.siteIds.length, 0);
  console.log(`\n✅ Completed full ecosystem cloning (Round Nov 12)!`);
  console.log(`   - Unique Sites Cloned:     ${finalResults.length}`);
  console.log(`   - Total imphq_sites IDs:   ${totalSiteIds}`);
  console.log(`   - Newly Cloned Sites:      ${clonedResults.length}`);
  console.log(`   - Live DOM + Original ZIP: ${liveCount}`);
  console.log(`   - Vault Reconstructed:     ${vaultCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
