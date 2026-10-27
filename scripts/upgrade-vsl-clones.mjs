import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/vsuga/Desktop/V/Meus Negocios - Dados/Imperio System/package.json");
const { chromium } = require("playwright");

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const GITHUB_REPO_BASE = "https://github.com/vsugamele/imperio-swipefile/tree/main/sites";

const CANDIDATE_SLUGS = [
  "v4k-ai-matheus-antous",
  "frequency-of-angels-2",
  "the-sacred-prayer-4",
  "glpro-vitalscienceblog-vsl-02-fechamento",
  "sodatide-bakslimaffr-redtra-bugod-leand",
  "glycozen-firstminutejournal",
  "manuscript-of-miracles-2",
  "glycobarrier-healthynewsletters",
  "neuromemory",
  "golden-brain-usadailyinsight",
  "jp6-studio-agendamento-oficial-do-salao",
  "erevanton-vsl-1-horse-soda-trick-pitch-3",
  "erevanton-presell-age-gate-21-2",
  "erevanton-vsl-2-minimal-black-pitch-35-2",
];

async function run() {
  const manifestPath = path.join(ROOT_DIR, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const browser = await chromium.launch({ headless: true });

  let upgraded = 0;
  for (const slug of CANDIDATE_SLUGS) {
    const entry = manifest.find((m) => m.slug === slug);
    if (!entry) continue;
    const siteDir = path.join(SITES_DIR, slug);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    try {
      const resp = await page.goto(entry.originalUrl, { waitUntil: "load", timeout: 22000 });
      await page.waitForTimeout(2800);
      const status = resp ? resp.status() : 0;

      const info = await page.evaluate(() => {
        const originUrl = window.location.href;
        const toAbs = (raw) => {
          if (!raw || typeof raw !== "string") return raw;
          const t = raw.trim();
          if (!t || /^(data:|blob:|mailto:|tel:|javascript:|#)/i.test(t)) return t;
          try { return new URL(t, originUrl).href; } catch { return t; }
        };
        const rewriteCssUrls = (cssText, baseHref) => {
          if (!cssText) return "";
          return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, rel) => {
            const t = (rel || "").trim();
            if (!t || /^(data:|blob:|#)/i.test(t)) return full;
            try { return `url("${new URL(t, baseHref || originUrl).href}")`; } catch { return full; }
          });
        };

        // Also unhide delayed VSL offer blocks so the full sales page is visible on scroll!
        document.querySelectorAll(".esconder, .hidden, [style*='display: none'], [style*='display:none']").forEach((el) => {
          const idOrCls = `${el.id || ""} ${el.className || ""}`.toLowerCase();
          if (idOrCls.includes("esconder") || idOrCls.includes(" delayed") || idOrCls.includes("pitch") || idOrCls.includes("offer") || idOrCls.includes("cta")) {
            el.style.display = "block";
          }
        });

        const cssomChunks = [];
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const owner = sheet.ownerNode;
            if (owner && owner.tagName === "STYLE" && (!owner.textContent || owner.textContent.trim().length < 20)) {
              const rules = Array.from(sheet.cssRules || []).map((r) => r.cssText).join("\n");
              if (rules) cssomChunks.push(rewriteCssUrls(rules, sheet.href || originUrl));
            }
          } catch {}
        }

        document.querySelectorAll("link[href]").forEach((l) => {
          const rel = (l.getAttribute("rel") || "").toLowerCase();
          if (rel === "modulepreload" || rel === "preload") { l.remove(); return; }
          l.setAttribute("href", toAbs(l.getAttribute("href")));
        });
        document.querySelectorAll("img").forEach((img) => {
          const s = img.getAttribute("src");
          if (s) img.setAttribute("src", toAbs(s));
        });
        document.querySelectorAll("a[href]").forEach((a) => {
          const h = a.getAttribute("href");
          if (h && !h.startsWith("#")) a.setAttribute("href", toAbs(h));
        });
        document.querySelectorAll("script").forEach((scr) => {
          const src = (scr.getAttribute("src") || "").toLowerCase();
          const type = (scr.getAttribute("type") || "").toLowerCase();
          if (type === "module" || src.includes("/_next/") || src.includes("/assets/index-")) {
            scr.remove();
          } else if (src) {
            scr.setAttribute("src", toAbs(scr.getAttribute("src")));
          }
        });

        const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        const bodyText = (document.body ? document.body.innerText : "").trim();
        const hasPlayerOrDom =
          html.includes("vturb") ||
          html.includes("converteai") ||
          html.includes("<video") ||
          html.includes("<iframe") ||
          document.querySelectorAll("div, section, img, button, a").length >= 8;

        return {
          html,
          cssom: cssomChunks.join("\n"),
          bodyText,
          pageTitle: document.title || "",
          hasPlayerOrDom,
        };
      });

      const isRealError =
        status >= 400 ||
        /404 not found|page not found|site not found|domain for sale|sedoparking|parkingcrew|hugedomains|deployment_not_found|error 404|403 forbidden/i.test(
          `${info.pageTitle} ${info.bodyText.slice(0, 300)}`
        );

      if (!isRealError && info.hasPlayerOrDom && info.html.length > 1200) {
        const localShotPath = path.join(siteDir, "preview.jpg");
        await page.screenshot({ path: localShotPath, type: "jpeg", quality: 82, fullPage: false });

        let finalHtml = info.html;
        const headInjection = `\n<link rel="stylesheet" href="/assets/imperio-animation-engine.css" />\n${
          info.cssom ? `<style id="imperio-cloned-cssom">\n${info.cssom}\n</style>` : ""
        }\n`;
        finalHtml = finalHtml.replace(/<\/head>/i, headInjection + "</head>");

        const bodyInjection = `\n<script>window.__IMPERIO_SITE_META__ = ${JSON.stringify({
          slug,
          title: entry.title,
          originalUrl: entry.originalUrl,
          githubUrl: `${GITHUB_REPO_BASE}/${slug}`,
          mode: "live-dom-clone",
        })};</script>\n<script src="/assets/imperio-animation-engine.js" defer></script>\n`;
        finalHtml = finalHtml.replace(/<\/body>/i, bodyInjection + "</body>");

        fs.writeFileSync(path.join(siteDir, "index.html"), finalHtml, "utf8");
        entry.mode = "live-dom-clone";
        entry.statusLabel = "⚡ Clone 1:1 DOM + Animações";
        entry.htmlBytes = Buffer.byteLength(finalHtml, "utf8");
        upgraded++;
        console.log(`✅ Upgraded ${slug} to Live 1:1 DOM Clone (${entry.htmlBytes} bytes, HTTP ${status})`);
      } else {
        console.log(`ℹ️ Kept ${slug} as Vault Reconstructed (HTTP ${status}, title="${info.pageTitle}")`);
      }
    } catch (e) {
      console.log(`ℹ️ Kept ${slug} as Vault Reconstructed (${e.message.split("\n")[0]})`);
    } finally {
      await context.close().catch(() => {});
    }
  }

  await browser.close();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nUpgraded ${upgraded} VSL/Presell sites to live-dom-clone.`);
}

run();
