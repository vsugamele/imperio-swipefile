import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/vsuga/Desktop/V/Meus Negocios - Dados/Imperio System/package.json");
const { chromium } = require("playwright");

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const GITHUB_REPO_BASE = "https://github.com/vsugamele/imperio-swipefile/tree/main/sites";
const VERCEL_BASE = "https://imperio-swipefile.vercel.app";

// 1. Sibling 1:1 DOM upgrades (same offer/funnel whose primary slug already has a full 1:1 DOM clone)
const SIBLING_DOM_UPGRADES = [
  {
    targetSlug: "sodatide-bakslimaffr-redtra-bugod-leand",
    sourceSlug: "sodatide-a",
  },
  {
    targetSlug: "frequency-of-angels-2",
    sourceSlug: "frequency-of-angels-the-vatican-news-por",
  },
  {
    targetSlug: "the-sacred-prayer-4",
    sourceSlug: "the-sacred-prayer-2",
  },
  {
    targetSlug: "the-lost-prayer-news-vitalitysourcesnow",
    sourceSlug: "the-lost-prayer-abundant-life-co-optin-6",
  },
  {
    targetSlug: "manuscript-of-miracles-2",
    sourceSlug: "manuscript-of-miracles-1",
  },
];

// 2. Live URLs that can be scraped 1:1 with relaxed SPA/Canvas/Gallery detection
const LIVE_SCRAPE_SLUGS = [
  "erevanton-presell-age-gate-21-2",
  "character-school-br",
  "navbar-gallery-inspiracao-para-navegacao",
];

function mapCategoryLabelToObj(label) {
  if (label.includes("IA, Vídeo")) return { id: "ia_video", label: "🎬 IA, Vídeo & Criativos" };
  if (label.includes("Marketing Direto")) return { id: "marketing_funis", label: "📈 Marketing Direto & Funis" };
  if (label.includes("Projetos Próprios")) return { id: "projetos_proprios", label: "👑 Projetos Próprios (Império)" };
  if (label.includes("Concorrentes US")) return { id: "concorrentes_us", label: "🇺🇸 Concorrentes US · Nutra & Fé" };
  return { id: "infoprodutos_br", label: "🇧🇷 Infoprodutos & LPs" };
}

async function scrapeLiveDomRelaxed(browser, entry) {
  const siteDir = path.join(SITES_DIR, entry.slug);
  fs.mkdirSync(siteDir, { recursive: true });
  const githubUrl = `${GITHUB_REPO_BASE}/${entry.slug}`;

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    console.log(`🌐 Scraping live 1:1 DOM for ${entry.slug} (${entry.originalUrl})...`);
    await page.goto(entry.originalUrl, { waitUntil: "load", timeout: 25000 });
    await page.waitForTimeout(3000);

    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let scrolled = 0;
        const maxScroll = Math.min(document.body ? document.body.scrollHeight : 5000, 12000);
        const timer = setInterval(() => {
          window.scrollBy(0, 650);
          scrolled += 650;
          if (scrolled >= maxScroll) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 400);
          }
        }, 70);
      });
    });

    const localShotPath = path.join(siteDir, "preview.jpg");
    await page.screenshot({ path: localShotPath, type: "jpeg", quality: 84, fullPage: false });

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

      document.querySelectorAll("link[href]").forEach((link) => {
        const rel = (link.getAttribute("rel") || "").toLowerCase();
        if (rel === "modulepreload" || rel === "preload") {
          link.remove();
          return;
        }
        link.setAttribute("href", toAbs(link.getAttribute("href")));
      });

      document.querySelectorAll("img").forEach((img) => {
        const curSrc = img.getAttribute("src") || "";
        if (curSrc) img.setAttribute("src", toAbs(curSrc));
        if (img.hasAttribute("srcset")) {
          const srcset = img
            .getAttribute("srcset")
            .split(",")
            .map((part) => {
              const p = part.trim().split(/\s+/);
              if (!p[0]) return "";
              return [toAbs(p[0]), p[1]].filter(Boolean).join(" ");
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

      document.querySelectorAll("script").forEach((scr) => {
        const src = (scr.getAttribute("src") || "").toLowerCase();
        const type = (scr.getAttribute("type") || "").toLowerCase();
        const txt = (scr.textContent || "").toLowerCase();
        if (
          type === "module" ||
          src.includes("/_next/") ||
          src.includes("googletagmanager") ||
          src.includes("fbevents") ||
          txt.includes("__next_f")
        ) {
          scr.remove();
        } else if (src) {
          scr.setAttribute("src", toAbs(scr.getAttribute("src")));
        }
      });

      return {
        html: "<!DOCTYPE html>\n" + document.documentElement.outerHTML,
        cssom: cssomChunks.join("\n"),
      };
    });

    await context.close().catch(() => {});

    let finalHtml = extracted.html;
    const headCloseIdx = finalHtml.search(/<\/head>/i);
    const headInjection = `\n  <link rel="stylesheet" href="/assets/imperio-animation-engine.css" />\n  ${
      extracted.cssom ? `<style id="imperio-cloned-cssom">\n${extracted.cssom}\n</style>` : ""
    }\n`;
    if (headCloseIdx !== -1) {
      finalHtml = finalHtml.slice(0, headCloseIdx) + headInjection + finalHtml.slice(headCloseIdx);
    } else {
      finalHtml = headInjection + finalHtml;
    }

    const bodyInjection = `\n  <script>\n    window.__IMPERIO_SITE_META__ = ${JSON.stringify({
      slug: entry.slug,
      title: entry.title,
      originalUrl: entry.originalUrl,
      githubUrl,
      mode: "live-dom-clone",
    })};\n  </script>\n  <script src="/assets/imperio-animation-engine.js" defer></script>\n`;
    const bodyCloseIdx = finalHtml.search(/<\/body>/i);
    if (bodyCloseIdx !== -1) {
      finalHtml = finalHtml.slice(0, bodyCloseIdx) + bodyInjection + finalHtml.slice(bodyCloseIdx);
    } else {
      finalHtml += bodyInjection;
    }

    fs.writeFileSync(path.join(siteDir, "index.html"), finalHtml, "utf8");
    const bytes = Buffer.byteLength(finalHtml, "utf8");
    console.log(`   ✅ Upgraded ${entry.slug} to live-dom-clone (${bytes} bytes)`);
    return bytes;
  } catch (err) {
    await context.close().catch(() => {});
    console.warn(`   ⚠️ Failed to scrape ${entry.slug}:`, err.message);
    return null;
  }
}

async function main() {
  const manifestPath = path.join(ROOT_DIR, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // 1. Apply sibling 1:1 DOM upgrades
  for (const pair of SIBLING_DOM_UPGRADES) {
    const entry = manifest.find((m) => m.slug === pair.targetSlug);
    const srcHtmlPath = path.join(SITES_DIR, pair.sourceSlug, "index.html");
    const srcPreviewPath = path.join(SITES_DIR, pair.sourceSlug, "preview.jpg");
    const dstDir = path.join(SITES_DIR, pair.targetSlug);
    if (entry && fs.existsSync(srcHtmlPath)) {
      fs.mkdirSync(dstDir, { recursive: true });
      let html = fs.readFileSync(srcHtmlPath, "utf8");
      // Replace __IMPERIO_SITE_META__ with target metadata
      const newMeta = JSON.stringify({
        slug: entry.slug,
        title: entry.title,
        originalUrl: entry.originalUrl,
        githubUrl: `${GITHUB_REPO_BASE}/${entry.slug}`,
        mode: "live-dom-clone",
      });
      html = html.replace(/window\.__IMPERIO_SITE_META__\s*=\s*\{[\s\S]*?\};/, `window.__IMPERIO_SITE_META__ = ${newMeta};`);
      fs.writeFileSync(path.join(dstDir, "index.html"), html, "utf8");
      if (fs.existsSync(srcPreviewPath)) {
        fs.copyFileSync(srcPreviewPath, path.join(dstDir, "preview.jpg"));
      }
      entry.mode = "live-dom-clone";
      entry.statusLabel = "⚡ Clone 1:1 DOM + Animações";
      entry.htmlBytes = Buffer.byteLength(html, "utf8");
      console.log(`🔄 Upgraded sibling ${pair.targetSlug} from ${pair.sourceSlug} (${entry.htmlBytes} bytes)`);
    }
  }

  // 2. Scrape the 3 live URLs with Playwright
  const browser = await chromium.launch({ headless: true });
  for (const slug of LIVE_SCRAPE_SLUGS) {
    const entry = manifest.find((m) => m.slug === slug);
    if (entry) {
      const bytes = await scrapeLiveDomRelaxed(browser, entry);
      if (bytes) {
        entry.mode = "live-dom-clone";
        entry.statusLabel = "⚡ Clone 1:1 DOM + Animações";
        entry.htmlBytes = bytes;
      }
    }
  }
  await browser.close();

  // 3. Save updated manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // 4. Update root index.html counts and SITES array
  const indexHtmlPath = path.join(ROOT_DIR, "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
  const liveCount = manifest.filter((m) => m.mode !== "vault-reconstructed").length;
  const vaultCount = manifest.filter((m) => m.mode === "vault-reconstructed").length;

  indexHtml = indexHtml.replace(
    /<div class="num" style="color:#34d399">\d+<\/div>/,
    `<div class="num" style="color:#34d399">${liveCount}</div>`
  );
  indexHtml = indexHtml.replace(
    /<div class="num" style="color:#38bdf8">\d+<\/div>/,
    `<div class="num" style="color:#38bdf8">${vaultCount}</div>`
  );

  const sitesArrayForHub = manifest.map((r) => {
    const catObj = mapCategoryLabelToObj(r.category);
    const hasLocalPreview = fs.existsSync(path.join(SITES_DIR, r.slug, "preview.jpg"));
    return {
      slug: r.slug,
      title: r.title,
      originalUrl: r.originalUrl,
      category: catObj.id,
      categoryLabel: catObj.label,
      statusLabel: r.statusLabel,
      thumbUrl: hasLocalPreview ? `/sites/${r.slug}/preview.jpg` : "",
      vercelPath: `/${r.slug}/`,
      githubUrl: `${GITHUB_REPO_BASE}/${r.slug}`,
    };
  });

  indexHtml = indexHtml.replace(
    /const SITES = \[[\s\S]*?\];/,
    `const SITES = ${JSON.stringify(sitesArrayForHub)};`
  );

  fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");

  console.log(`\n✅ Upgrade complete! Live DOM + Original ZIP: ${liveCount}/190 | Vault Reconstructed: ${vaultCount}/190`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
