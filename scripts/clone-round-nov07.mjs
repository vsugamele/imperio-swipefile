import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/vsuga/Desktop/V/Meus Negocios - Dados/Imperio System/package.json");
const { chromium } = require("playwright");

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const STEP_146_FILE =
  "C:/Users/vsuga/.gemini/antigravity/brain/9ade557f-b904-4309-9db7-c8debcce31b3/.system_generated/steps/146/output.txt";
const ZIP_CACHE_DIR = "C:/Users/vsuga/.gemini/antigravity/brain/9ade557f-b904-4309-9db7-c8debcce31b3/scratch/zip_cache";

const GITHUB_REPO_BASE = "https://github.com/vsugamele/imperio-swipefile/tree/main/sites";
const VERCEL_BASE = "https://imperio-swipefile.vercel.app";

fs.mkdirSync(SITES_DIR, { recursive: true });
fs.mkdirSync(ZIP_CACHE_DIR, { recursive: true });

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
      .replace(/\.(html|php)$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-");
  } catch {}

  let base = titleStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(abrir|pagina|lp|http|https|www|com|online|site|info|org|shop)\b/g, " ")
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
      "mestres.ai",
      "blackinfinita",
      "camaleon",
      "wilsouza",
      "maquinadecriativos",
      "máquina de criativos",
      "criativos que vendem",
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
  const summary =
    item.summary ||
    "Página arquivada no Cofre Império Swipefile com estrutura persuasiva, copy completa e captura visual preservadas.";
  const md = item.content_md || "";

  const colorsObj = item.branding_json?.colors || {};
  const primaryColor = colorsObj.primary || colorsObj.accent || "#f59e0b";

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

  const sectionsHtml = sections
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
    <div class="imp-eyebrow imp-float">🛡️ Cofre Império Swipefile · Estrutura & Copy Preservadas</div>
    <h1 class="imp-h1">${escapeHtml(title)}</h1>
    <p class="imp-sub">${escapeHtml(summary)}</p>
    <div class="imp-hero-actions">
      <a href="#copy-estruturada" class="imp-btn-primary imp-cta-animated">⚡ Explorar Estrutura & Copy Animada</a>
      <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer" class="imp-btn-secondary">🌐 Abrir URL Original ↗</a>
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
    })};
  </script>
  <script src="/assets/imperio-animation-engine.js" defer></script>
</body>
</html>`;
}

// Track primary slug where a Google Drive zip was extracted so duplicate LPs of the same funnel can share its assets via <base href="/<primarySlug>/">
const zipFileIdToPrimarySlug = new Map();

function extractGoogleDriveZipToSite(item) {
  const zipUrl = item.html_zip_url || "";
  const m = zipUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const fileId = m[1];
  const siteDir = path.join(SITES_DIR, item.slug);
  fs.mkdirSync(siteDir, { recursive: true });
  const githubUrl = `${GITHUB_REPO_BASE}/${item.slug}`;

  try {
    let assetOwnerSlug = zipFileIdToPrimarySlug.get(fileId);
    const cachedHtmlPath = path.join(ZIP_CACHE_DIR, `${fileId}_index.html`);

    if (!assetOwnerSlug || !fs.existsSync(cachedHtmlPath)) {
      assetOwnerSlug = item.slug;
      const pyScript = `
import urllib.request, zipfile, io, os, sys
fid = sys.argv[1]
target_dir = sys.argv[2]
cache_html = sys.argv[3]
dl = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
req = urllib.request.Request(dl, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    data = r.read()
if not zipfile.is_zipfile(io.BytesIO(data)):
    sys.exit(2)
z = zipfile.ZipFile(io.BytesIO(data))
z.extractall(target_dir)
idx_path = os.path.join(target_dir, "index.html")
if not os.path.exists(idx_path):
    htmls = [n for n in z.namelist() if n.lower().endswith(".html")]
    if htmls:
        idx_path = os.path.join(target_dir, htmls[0])
with open(idx_path, "rb") as f:
    raw = f.read()
with open(cache_html, "wb") as f:
    f.write(raw)
`;
      execFileSync("python", ["-c", pyScript, fileId, siteDir, cachedHtmlPath], { stdio: "pipe" });
      zipFileIdToPrimarySlug.set(fileId, assetOwnerSlug);
    }

    let html = fs.readFileSync(cachedHtmlPath, "utf8");
    const baseHrefTag = `<base href="/${assetOwnerSlug}/" />`;
    const headInjection = `\n  ${baseHrefTag}\n  <link rel="stylesheet" href="/assets/imperio-animation-engine.css" />\n  <style id="imperio-unhide-vsl">.esconder, .hidden-offer, [data-delayed] { display: block !important; opacity: 1 !important; visibility: visible !important; }</style>\n`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}${headInjection}`);
    } else {
      html = headInjection + html;
    }

    const bodyInjection = `\n  <script>window.__IMPERIO_SITE_META__ = ${JSON.stringify({
      slug: item.slug,
      title: item.titulo,
      originalUrl: item.url,
      githubUrl,
      mode: "original-zip",
    })};</script>\n  <script src="/assets/imperio-animation-engine.js" defer></script>\n`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${bodyInjection}</body>`);
    } else {
      html += bodyInjection;
    }

    fs.writeFileSync(path.join(siteDir, "index.html"), html, "utf8");
    return {
      htmlBytes: Buffer.byteLength(html, "utf8"),
      assetOwnerSlug,
    };
  } catch (err) {
    console.log(`   ⚠️ Zip extraction failed for ${item.slug}: ${err.message.split("\n")[0]}`);
    return null;
  }
}

async function cloneSingleSite(browser, item, idx, total) {
  const siteDir = path.join(SITES_DIR, item.slug);
  fs.mkdirSync(siteDir, { recursive: true });
  const githubUrl = `${GITHUB_REPO_BASE}/${item.slug}`;

  console.log(`[${idx + 1}/${total}] 🌐 Cloning live DOM + animations: ${item.slug} (${item.url})...`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  try {
    const resp = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2200);
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
        if (idOrCls.includes("esconder") || idOrCls.includes("delayed") || idOrCls.includes("pitch") || idOrCls.includes("offer") || idOrCls.includes("cta")) {
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
        try { fs.unlinkSync(localShotPath); } catch {}
      }

      // Check if we have a Google Drive HTML .zip!
      const zipResult = extractGoogleDriveZipToSite(item);
      if (zipResult) {
        console.log(`   📦 Extracted Original HTML .ZIP for ${item.slug} (${zipResult.htmlBytes} bytes, base=/${zipResult.assetOwnerSlug}/)`);
        return {
          ...item,
          mode: "original-zip",
          statusLabel: "📦 HTML Original (.ZIP) + Animações",
          htmlBytes: zipResult.htmlBytes,
          hasLocalPreview: fs.existsSync(localShotPath),
        };
      }

      console.log(`   ⚠️ Live URL returned parked/blocked/empty page (HTTP ${status}, ${extracted.bodyTextLen} chars). Reconstructing from Vault...`);
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
    const zipResult = extractGoogleDriveZipToSite(item);
    if (zipResult) {
      console.log(`   📦 Live fetch failed (${err.message.split("\n")[0]}), extracted Original HTML .ZIP for ${item.slug} (${zipResult.htmlBytes} bytes)`);
      return {
        ...item,
        mode: "original-zip",
        statusLabel: "📦 HTML Original (.ZIP) + Animações",
        htmlBytes: zipResult.htmlBytes,
        hasLocalPreview: fs.existsSync(path.join(siteDir, "preview.jpg")),
      };
    }

    console.log(`   ⚠️ Live fetch failed for ${item.slug} (${err.message.split("\n")[0]}). Building animated Vault replica...`);
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

function buildHubIndexHtml(results) {
  const total = results.length;
  const liveCount = results.filter((r) => r.mode !== "vault-reconstructed").length;
  const vaultCount = results.filter((r) => r.mode === "vault-reconstructed").length;

  const countCat = (id) => results.filter((r) => r.category.id === id).length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Império Swipefile — ${total} Sites Clonados (GitHub + Vercel c/ Animações)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060911;
      --surface: #0d1322;
      --surface-hover: #131c31;
      --border: rgba(255, 255, 255, 0.09);
      --gold: #f59e0b;
      --gold-light: #fde68a;
      --cyan: #38bdf8;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background:
        radial-gradient(circle at 15% 0%, rgba(245, 158, 11, 0.12), transparent 40%),
        radial-gradient(circle at 85% 10%, rgba(56, 189, 248, 0.1), transparent 42%),
        var(--bg);
      color: #f8fafc;
      min-height: 100vh;
    }
    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 36px 24px 80px;
    }
    .hero {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 28px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 13px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: var(--gold-light);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(1.85rem, 3.2vw, 2.75rem);
      font-weight: 700;
      line-height: 1.12;
      color: #ffffff;
    }
    h1 span {
      background: linear-gradient(135deg, #fde68a, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.96rem;
      margin-top: 8px;
      max-width: 740px;
    }
    .stats-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px 18px;
      min-width: 135px;
    }
    .stat-pill .num {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
    }
    .stat-pill .lbl {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 26px;
    }
    .search-input {
      flex: 1;
      min-width: 260px;
      max-width: 440px;
      height: 42px;
      padding: 0 16px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: #f8fafc;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--gold);
    }
    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill-btn {
      height: 38px;
      padding: 0 15px;
      border-radius: 999px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .pill-btn:hover, .pill-btn.active {
      background: rgba(245, 158, 11, 0.18);
      border-color: rgba(245, 158, 11, 0.55);
      color: var(--gold-light);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.28s ease, box-shadow 0.28s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      border-color: rgba(245, 158, 11, 0.45);
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.55);
    }
    .thumb-wrap {
      position: relative;
      aspect-ratio: 16 / 10;
      background: #050811;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
    }
    .thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      transition: transform 0.5s ease;
    }
    .card:hover .thumb-wrap img {
      transform: scale(1.04);
    }
    .badge-top {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      gap: 6px;
      pointer-events: none;
    }
    .tag-cat, .tag-mode {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      backdrop-filter: blur(10px);
    }
    .tag-cat {
      background: rgba(9, 13, 22, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
    }
    .tag-mode {
      background: rgba(16, 185, 129, 0.22);
      border: 1px solid rgba(16, 185, 129, 0.45);
      color: #6ee7b7;
    }
    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 10px;
    }
    .card-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }
    .card-slug {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 6px;
      word-break: break-all;
    }
    .card-actions {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.18s ease;
    }
    .btn-vercel {
      grid-column: span 2;
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      color: #090d16;
      font-weight: 800;
    }
    .btn-vercel:hover {
      filter: brightness(1.08);
    }
    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
    }
    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.11);
      color: #ffffff;
    }
    #preview-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(3, 6, 12, 0.86);
      backdrop-filter: blur(10px);
      padding: 20px;
      flex-direction: column;
    }
    #preview-modal.open {
      display: flex;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 14px 14px 0 0;
    }
    .modal-body {
      flex: 1;
      background: #000;
      border: 1px solid var(--border);
      border-top: 0;
      border-radius: 0 0 14px 14px;
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    .modal-body iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
      transition: width 0.25s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <div>
        <div class="eyebrow">🛡️ Império System · Repositório Oficial de Clones (100% Ecossistema)</div>
        <h1>Swipefile <span>GitHub + Vercel</span> (${total} Sites c/ Animações)</h1>
        <p class="subtitle">
          Todos os ${total} sites únicos (100% de <code>imphq_sites</code> e <code>imphq_referencias</code>: Swipe BR, Concorrentes US SwipeRadar e Projetos Próprios Império) clonados com HTML, CSSOM e motor de animações 60fps.
        </p>
      </div>
      <div class="stats-row">
        <div class="stat-pill">
          <div class="num">${total}</div>
          <div class="lbl">Sites Únicos Clonados</div>
        </div>
        <div class="stat-pill">
          <div class="num" style="color:#34d399">${liveCount}</div>
          <div class="lbl">DOM Direto + ZIP</div>
        </div>
        <div class="stat-pill">
          <div class="num" style="color:#38bdf8">${vaultCount}</div>
          <div class="lbl">Cofre Reconstruído</div>
        </div>
        <a href="https://github.com/vsugamele/imperio-swipefile" target="_blank" rel="noreferrer" class="stat-pill" style="text-decoration:none;border-color:rgba(245,158,11,0.4)">
          <div class="num" style="color:#fbbf24;font-size:1.15rem">🐙 GitHub ↗</div>
          <div class="lbl">vsugamele/imperio-swipefile</div>
        </a>
      </div>
    </header>

    <div class="toolbar">
      <input type="search" id="q" class="search-input" placeholder="Buscar por nome, produto, slug, domínio ou nicho..." />
      <div class="filter-pills">
        <button class="pill-btn active" data-cat="all">Todos (${total})</button>
        <button class="pill-btn" data-cat="concorrentes_us">🇺🇸 Concorrentes US (${countCat("concorrentes_us")})</button>
        <button class="pill-btn" data-cat="projetos_proprios">👑 Projetos Próprios (${countCat("projetos_proprios")})</button>
        <button class="pill-btn" data-cat="ia_video">🎬 IA & Vídeo (${countCat("ia_video")})</button>
        <button class="pill-btn" data-cat="marketing_funis">📈 Marketing & Funis (${countCat("marketing_funis")})</button>
        <button class="pill-btn" data-cat="infoprodutos_br">🇧🇷 Infoprodutos BR (${countCat("infoprodutos_br")})</button>
      </div>
    </div>

    <div class="grid" id="sites-grid"></div>
  </div>

  <div id="preview-modal">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:12px">
        <strong id="modal-title" style="font-size:14px">Preview</strong>
        <button class="pill-btn" id="btn-desktop" style="height:30px;font-size:11px">💻 Desktop</button>
        <button class="pill-btn" id="btn-mobile" style="height:30px;font-size:11px">📱 Mobile (390px)</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <a id="modal-open-tab" href="#" target="_blank" class="btn btn-outline" style="height:30px">⚡ Abrir em Nova Aba ↗</a>
        <button id="modal-close" class="btn btn-outline" style="height:30px">✕ Fechar</button>
      </div>
    </div>
    <div class="modal-body">
      <iframe id="modal-iframe" src="about:blank"></iframe>
    </div>
  </div>

  <script>
    const SITES = ${JSON.stringify(
      results.map((r) => ({
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
      }))
    )};

    const grid = document.getElementById('sites-grid');
    const qInput = document.getElementById('q');
    let activeCat = 'all';

    function render() {
      const needle = (qInput.value || '').toLowerCase().trim();
      const filtered = SITES.filter((s) => {
        if (activeCat !== 'all' && s.category !== activeCat) return false;
        if (!needle) return true;
        return (
          s.title.toLowerCase().includes(needle) ||
          s.slug.toLowerCase().includes(needle) ||
          s.originalUrl.toLowerCase().includes(needle)
        );
      });

      grid.innerHTML = filtered
        .map(
          (s) => \`
        <article class="card">
          <div class="thumb-wrap" onclick="openPreview('\${s.vercelPath}', '\${s.title.replace(/'/g, "\\\\'")}')">
            \${
              s.thumbUrl
                ? \`<img src="\${s.thumbUrl}" alt="\${s.title.replace(/"/g, '&quot;')}" loading="lazy" />\`
                : \`<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px">⚡ Clone Interativo</div>\`
            }
            <div class="badge-top">
              <span class="tag-cat">\${s.categoryLabel}</span>
              <span class="tag-mode">\${s.statusLabel}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="card-title">\${s.title}</div>
            <div class="card-slug">🔗 imperio-swipefile.vercel.app/\${s.slug}/</div>
            <div class="card-actions">
              <a class="btn btn-vercel" href="\${s.vercelPath}" target="_blank">⚡ Abrir Clone c/ Animações ↗</a>
              <button class="btn btn-outline" onclick="openPreview('\${s.vercelPath}', '\${s.title.replace(/'/g, "\\\\'")}')">👁️ Preview</button>
              <a class="btn btn-outline" href="\${s.githubUrl}" target="_blank" rel="noreferrer">🐙 GitHub</a>
            </div>
          </div>
        </article>
      \`
        )
        .join('');
    }

    document.querySelectorAll('.filter-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pills .pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        render();
      });
    });

    qInput.addEventListener('input', render);

    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('modal-iframe');
    const modalTitle = document.getElementById('modal-title');
    const modalOpenTab = document.getElementById('modal-open-tab');

    window.openPreview = function (url, title) {
      modalTitle.textContent = title;
      modalOpenTab.href = url;
      iframe.style.width = '100%';
      iframe.src = url;
      modal.classList.add('open');
    };

    document.getElementById('modal-close').addEventListener('click', () => {
      modal.classList.remove('open');
      iframe.src = 'about:blank';
    });
    document.getElementById('btn-desktop').addEventListener('click', () => {
      iframe.style.width = '100%';
    });
    document.getElementById('btn-mobile').addEventListener('click', () => {
      iframe.style.width = '390px';
    });

    render();
  </script>
</body>
</html>`;
}

async function main() {
  const existingManifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
  const usedSlugs = new Set();
  const byCanon = new Map();

  // 1. Seed with existing 154 cloned items
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

  // 2. Load rows from step 146 (33 uncloned + JP Freitas Hair Experience rows)
  const step146Rows = parseStepJson(STEP_146_FILE);
  console.log(`Loaded ${step146Rows.length} rows from step 146.`);

  const newItemsToClone = [];
  for (const row of step146Rows) {
    // Skip the 4 sub-pages of JP Hair Experience that are already cloned & up-to-date
    if (row.vercel_clone_url && !/\/jp-hair-experience\/?$/.test(row.vercel_clone_url)) {
      continue;
    }

    const cKey = canonicalKey(row.url);
    if (byCanon.has(cKey)) {
      const existing = byCanon.get(cKey);
      if (!existing.siteIds.includes(row.id)) {
        existing.siteIds.push(row.id);
      }
      // If this is jp-hair-experience, refresh it!
      if (existing.slug === "jp-hair-experience" && !newItemsToClone.some((x) => x.slug === "jp-hair-experience")) {
        existing.titulo = "JP Freitas Hair Experience — 2 dias ao vivo · 15 e 16 de novembro";
        existing.url = "https://www.jphaireducation.com/experience";
        newItemsToClone.push(existing);
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

  console.log(`Prepared ${newItemsToClone.length} sites to clone/refresh (including jp-hair-experience).`);

  // Also upgrade the 4 existing vault-reconstructed sites that have valid Google Drive ZIPs!
  const UPGRADE_ZIP_SLUGS = [
    { slug: "glycozen-firstminutejournal", html_zip_url: "https://drive.google.com/file/d/1muWWWMYVI8WrQoYzNb44taL83mdjeSZv/view?usp=sharing" },
    { slug: "glycobarrier-healthynewsletters", html_zip_url: "https://drive.google.com/file/d/1_45nOVgowPcchb2r8k7WMXRd_iow7Y8t/view?usp=sharing" },
    { slug: "neuromemory-post", html_zip_url: "https://drive.google.com/file/d/10H69jeSuNmIGYAMUArpNNl83hp0TfX0d/view?usp=sharing" },
    { slug: "golden-brain-usadailyinsight", html_zip_url: "https://drive.google.com/file/d/1FLhcRo_Wmw-LNSaRx0N84XTvV1-Zz4Ns/view?usp=sharing" },
  ];
  for (const upg of UPGRADE_ZIP_SLUGS) {
    const ex = existingResults.find((r) => r.slug === upg.slug);
    if (ex && ex.mode === "vault-reconstructed") {
      ex.html_zip_url = upg.html_zip_url;
      const zr = extractGoogleDriveZipToSite(ex);
      if (zr) {
        ex.mode = "original-zip";
        ex.statusLabel = "📦 HTML Original (.ZIP) + Animações";
        ex.htmlBytes = zr.htmlBytes;
        console.log(`📦 Upgraded existing vault site ${ex.slug} to Original HTML .ZIP (${zr.htmlBytes} bytes)`);
      }
    }
  }

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

  // For any newly cloned site that has no local preview.jpg (e.g. original-zip or vault-reconstructed without local preview), render its local index.html in Playwright to capture preview.jpg!
  for (const r of [...clonedResults, ...existingResults.filter((x) => UPGRADE_ZIP_SLUGS.some((u) => u.slug === x.slug))]) {
    const previewPath = path.join(SITES_DIR, r.slug, "preview.jpg");
    const indexHtmlPath = path.join(SITES_DIR, r.slug, "index.html");
    if (!fs.existsSync(previewPath) && fs.existsSync(indexHtmlPath)) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const pg = await ctx.newPage();
      try {
        // Strip <base> temporarily in memory or load file:// with local asset resolution
        const fileUrl = "file:///" + indexHtmlPath.replace(/\\/g, "/");
        await pg.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
        await pg.waitForTimeout(800);
        await pg.screenshot({ path: previewPath, type: "jpeg", quality: 82, fullPage: false });
        r.hasLocalPreview = true;
        console.log(`📸 Captured local preview.jpg for ${r.slug}`);
      } catch {} finally {
        await ctx.close().catch(() => {});
      }
    }
  }

  await browser.close();

  // Merge results: replace jp-hair-experience in existingResults, append truly new items
  const finalResults = existingResults.map((ex) => {
    const updated = clonedResults.find((c) => c.slug === ex.slug);
    return updated || ex;
  });
  for (const c of clonedResults) {
    if (!finalResults.some((f) => f.slug === c.slug)) {
      finalResults.push(c);
    }
  }

  // Write Hub index.html
  const hubHtml = buildHubIndexHtml(finalResults);
  fs.writeFileSync(path.join(ROOT_DIR, "index.html"), hubHtml, "utf8");

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
  console.log(`\n✅ Completed full ecosystem cloning (Round Nov 07)!`);
  console.log(`   - Unique Sites Cloned:     ${finalResults.length}`);
  console.log(`   - Total imphq_sites IDs:   ${totalSiteIds}`);
  console.log(
    `   - Live DOM + Original ZIP: ${finalResults.filter((r) => r.mode !== "vault-reconstructed").length}`
  );
  console.log(
    `   - Vault Reconstructed:     ${finalResults.filter((r) => r.mode === "vault-reconstructed").length}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
