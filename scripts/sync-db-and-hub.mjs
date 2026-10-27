import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SITES_DIR = path.join(ROOT_DIR, "sites");
const STEP_78_FILE =
  "C:/Users/vsuga/.gemini/antigravity/brain/bb683109-7345-4796-ba26-23e855742a1f/.system_generated/steps/78/output.txt";
const STEP_178_FILE =
  "C:/Users/vsuga/.gemini/antigravity/brain/bb683109-7345-4796-ba26-23e855742a1f/.system_generated/steps/178/output.txt";
const SQL_OUT =
  "C:/Users/vsuga/.gemini/antigravity/brain/bb683109-7345-4796-ba26-23e855742a1f/scratch/sync_all_155.sql";

function parseStepJson(filePath) {
  const rawTxt = fs.readFileSync(filePath, "utf8");
  const outer = JSON.parse(rawTxt);
  const str = outer.result || "";
  const match = str.match(/<untrusted-data-[^>]+>\s*(\[[\s\S]*\])\s*<\/untrusted-data-/);
  return JSON.parse(match[1]);
}

function mapCategoryLabelToId(label) {
  if (label.includes("IA, Vídeo")) return "ia_video";
  if (label.includes("Marketing Direto")) return "marketing_funis";
  if (label.includes("Projetos Próprios")) return "projetos_proprios";
  if (label.includes("Concorrentes US")) return "concorrentes_us";
  return "infoprodutos_br";
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));
const allRows = [...parseStepJson(STEP_78_FILE), ...parseStepJson(STEP_178_FILE)];
const rowById = new Map(allRows.map((r) => [r.id, r]));

const total = manifest.length;
const liveCount = manifest.filter((r) => r.mode !== "vault-reconstructed").length;
const vaultCount = manifest.filter((r) => r.mode === "vault-reconstructed").length;

const sitesForHub = manifest.map((m) => {
  const firstRow = rowById.get(m.siteIds[0]) || {};
  const hasLocalPreview = fs.existsSync(path.join(SITES_DIR, m.slug, "preview.jpg"));
  return {
    slug: m.slug,
    title: m.title,
    originalUrl: m.originalUrl,
    category: mapCategoryLabelToId(m.category),
    categoryLabel: m.category,
    statusLabel: m.statusLabel,
    thumbUrl: hasLocalPreview
      ? `/sites/${m.slug}/preview.jpg`
      : firstRow.thumbnail_url || firstRow.fullpage_screenshot_url || "",
    vercelPath: `/${m.slug}/`,
    githubUrl: m.githubUrl,
  };
});

// Update index.html with updated SITES array and stats
let hubHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
hubHtml = hubHtml.replace(
  /<div class="num" style="color:#34d399">\d+<\/div>/,
  `<div class="num" style="color:#34d399">${liveCount}</div>`
);
hubHtml = hubHtml.replace(
  /<div class="num" style="color:#38bdf8">\d+<\/div>/,
  `<div class="num" style="color:#38bdf8">${vaultCount}</div>`
);
hubHtml = hubHtml.replace(
  /const SITES = \[[\s\S]*?\];/,
  `const SITES = ${JSON.stringify(sitesForHub)};`
);
fs.writeFileSync(path.join(ROOT_DIR, "index.html"), hubHtml, "utf8");

// Generate SQL
const valuesList = [];
for (const m of manifest) {
  for (const id of m.siteIds) {
    const vUrl = m.vercelUrl.replace(/'/g, "''");
    const gUrl = m.githubUrl.replace(/'/g, "''");
    valuesList.push(`    ('${id}'::uuid, '${vUrl}', '${gUrl}')`);
  }
}

const sql = `WITH mapping(site_id, vercel_url, github_url) AS (
  VALUES
${valuesList.join(",\n")}
),
updated_sites AS (
  UPDATE public.imphq_sites s
  SET
    vercel_clone_url = m.vercel_url,
    github_url = m.github_url
  FROM mapping m
  WHERE s.id = m.site_id
  RETURNING s.id, s.url, m.vercel_url, m.github_url
),
updated_refs AS (
  UPDATE public.imphq_referencias r
  SET
    analise = jsonb_set(
      jsonb_set(coalesce(r.analise, '{}'::jsonb), '{vercel_clone_url}', to_jsonb(u.vercel_url), true),
      '{github_url}',
      to_jsonb(u.github_url),
      true
    )
  FROM updated_sites u
  WHERE (r.analise->>'site_id') = u.id::text OR r.url = u.url
  RETURNING r.id
)
SELECT
  (SELECT count(*) FROM updated_sites) AS sites_updated,
  (SELECT count(*) FROM updated_refs) AS refs_updated;
`;

fs.writeFileSync(SQL_OUT, sql, "utf8");
console.log(`Generated Hub index.html (live=${liveCount}, vault=${vaultCount}) and SQL with ${valuesList.length} site_id mappings.`);
