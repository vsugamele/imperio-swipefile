import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT_DIR = 'C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile';
const SITES_DIR = path.join(ROOT_DIR, 'sites');
const SCRATCH_DIR = 'C:/Users/vsuga/.gemini/antigravity/brain/9ade557f-b904-4309-9db7-c8debcce31b3/scratch';
const UNZIP_DIR = path.join(SCRATCH_DIR, 'lumivelle_unzip', 'PAGE LUMIVELLE');

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) continue;
    const sp = path.join(src, entry.name);
    const dp = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}

async function main() {
  // 1. lumivelle-landing-page-html (from PAGE LUMIVELLE.zip)
  const lpSlug = 'lumivelle-landing-page-html';
  const lpDir = path.join(SITES_DIR, lpSlug);
  fs.rmSync(lpDir, { recursive: true, force: true });
  copyRecursive(UNZIP_DIR, lpDir);

  let rawHtml = fs.readFileSync(path.join(UNZIP_DIR, 'hw', 'ld03', 'index.html'), 'utf8');
  // Rewrite ../../assets/ -> assets/ for root index.html and show .esconder CTA button for preview
  let rootHtml = rawHtml
    .replace(/\.\.\/\.\.\/assets\//g, 'assets/')
    .replace('var assetsPath = "../../";', 'var assetsPath = "";')
    .replace('<div class="esconder"', '<div class="esconder" style="display:block"');
  fs.writeFileSync(path.join(lpDir, 'index.html'), rootHtml, 'utf8');

  // 2. lumivelle-vsl-oficial
  const vslSlug = 'lumivelle-vsl-oficial';
  const vslDir = path.join(SITES_DIR, vslSlug);
  fs.mkdirSync(vslDir, { recursive: true });
  const vslHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LumiVelle — VSL Oficial (Korean Pink Gelatin Trick · Frame.io)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0f0a14; --surface: #1a1124; --border: rgba(236,72,153,0.22); --pink: #ec4899; --plum: #c084fc; --text: #fdf2f8; --muted: #d8b4fe; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: radial-gradient(circle at top, #2e1035 0%, #0f0a14 65%); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.65; padding: 36px 20px 80px; }
    .wrap { max-width: 1020px; margin: 0 auto; }
    .hero { background: rgba(26,17,36,0.9); border: 1px solid var(--border); border-radius: 24px; padding: 36px; display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 28px; align-items: center; margin-bottom: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(236,72,153,0.16); color: #f472b6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 14px; }
    h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(26px, 3.8vw, 38px); line-height: 1.15; margin-bottom: 14px; }
    .sub { color: var(--muted); font-size: 15px; margin-bottom: 20px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; }
    .btn-pink { background: linear-gradient(135deg, #ec4899, #a855f7); color: #fff; }
    .btn-ghost { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
    .hero img { width: 100%; border-radius: 16px; border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 18px; margin-bottom: 24px; }
    .card { background: rgba(26,17,36,0.85); border: 1px solid var(--border); border-radius: 18px; padding: 24px; }
    .card h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #f472b6; margin-bottom: 12px; }
    .step { padding: 12px 14px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 10px; border-left: 3px solid var(--pink); font-size: 14px; }
    .step strong { color: #fbcfe8; display: block; margin-bottom: 4px; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div>
        <span class="badge">VSL Oficial · LumiVelle (Skin 50+)</span>
        <h1>LumiVelle — VSL Oficial (Korean Pink Gelatin Trick)</h1>
        <p class="sub">Hook: Korean Pink Gelatin Trick + Colágeno Tipo III + PDRN (Salmon DNA). Benchmarks: CPC $1–$2, CPM $100–$150, CTR &gt; 5%, IC $15–$25, Retenção alvo ao pitch: 20%.</p>
        <div class="actions">
          <a class="btn btn-pink" href="https://next.frame.io/share/4f96a670-7116-4864-815c-ee1ec83911ae/06315125-a59d-4657-98ed-9926ee51db7f" target="_blank" rel="noopener">Assistir VSL no Frame.io (f.io/p1KSnwfU) ↗</a>
          <a class="btn btn-ghost" href="/lumivelle-landing-page-html/">Abrir Landing Page HTML Clonada</a>
          <a class="btn btn-ghost" href="/lumivelle-briefing-estrategico-de-afilia/">Ver Briefing Completo</a>
        </div>
      </div>
      <div>
        <img src="https://tkbivipqiewkfnhktmqq.supabase.co/storage/v1/object/public/referencias/vault/swiperadar_202611/lumivelle-product-1.png" alt="LumiVelle Gummies" />
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <h2>Arquitetura dos 5 Blocos da VSL</h2>
        <div class="step"><strong>1. Hook & Identificação (Mulheres 50+)</strong>Pós-menopausa: rosto e pescoço ("turkey neck") perdendo a firmeza, linhas marcadas e maquiagem craquelando.</div>
        <div class="step"><strong>2. Demonstração Visual (Estrutura A vs B)</strong>Duas gelatinas pressionadas — Estrutura A mole e sem forma (pele sem Colágeno Tipo III) vs Estrutura B firme e elástica.</div>
        <div class="step"><strong>3. Falha das Soluções Comuns (MF)</strong>Cremes caros ficam só na superfície; Botox usa agulhas caras ($600+), congela a expressão e ignora pescoço, colo e mãos.</div>
        <div class="step"><strong>4. Mecanismo Único (4-Part Collagen Reset)</strong>01 REBUILD (Gelatina Coreana — Glicina/Prolina) + 02 ACCELERATE (PDRN DNA de Salmão) + 03 SHIELD (Resveratrol) + 04 LOCK IN (Vitamina C).</div>
        <div class="step"><strong>5. Oferta Decoy (+$10) & Garantia 60 Dias</strong>1 pote $79 | 2 potes $89 | 3 potes (KIT PRINCIPAL) $99 ($33/pote) + 3 Bônus ($97 + $77 + Yuna AI) + 4º Bônus Misterioso.</div>
      </div>
      <div class="card">
        <h2>Direção de Cenas & Métricas Alvo</h2>
        <div class="step"><strong>Hook 3s Validado</strong>"Wait... what is this pink Korean gelatin trick everyone over 50 is talking about?"</div>
        <div class="step"><strong>Headline da Página VSL (LD03)</strong>"One of America’s Leading Surgeons Reveals the Natural Botox That Makes Women Look up to 30 Years Younger"</div>
        <div class="step"><strong>Coreografia & Retenção</strong>Flash-Forward 0-2s + Demo Tátil 45° (Gelatina A vs B) · Pitch exato com abertura automática via VTurb.</div>
        <div class="step"><strong>Escassez & Ancoragem</strong>Apenas 79 potes restantes (colheita marinha limitada na Ilha de Jeju + 9 meses para reposição) · Timer de 15 min.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(vslDir, 'index.html'), vslHtml, 'utf8');

  // 3. lumivelle-criativos-ads-validados
  const adsSlug = 'lumivelle-criativos-ads-validados';
  const adsDir = path.join(SITES_DIR, adsSlug);
  fs.mkdirSync(adsDir, { recursive: true });
  const adsHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LumiVelle — Criativos & Ads Validados (7 Ângulos · Frame.io)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0f0a14; --surface: #1a1124; --border: rgba(236,72,153,0.22); --pink: #ec4899; --text: #fdf2f8; --muted: #d8b4fe; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: radial-gradient(circle at top, #3b0764 0%, #0f0a14 65%); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.65; padding: 36px 20px 80px; }
    .wrap { max-width: 1020px; margin: 0 auto; }
    .hero { background: rgba(26,17,36,0.9); border: 1px solid var(--border); border-radius: 24px; padding: 36px; display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 28px; align-items: center; margin-bottom: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(236,72,153,0.16); color: #f472b6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 14px; }
    h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(26px, 3.8vw, 38px); line-height: 1.15; margin-bottom: 14px; }
    .sub { color: var(--muted); font-size: 15px; margin-bottom: 20px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; }
    .btn-pink { background: linear-gradient(135deg, #ec4899, #a855f7); color: #fff; }
    .btn-ghost { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
    .hero img { width: 100%; border-radius: 16px; border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 18px; }
    .card { background: rgba(26,17,36,0.85); border: 1px solid var(--border); border-radius: 18px; padding: 24px; }
    .card h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #f472b6; margin-bottom: 12px; }
    .angle { padding: 11px 14px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 9px; border-left: 3px solid #a855f7; font-size: 14px; }
    .angle strong { color: #fbcfe8; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div>
        <span class="badge">Pack de Criativos · 7 Ângulos & 10 Hooks</span>
        <h1>LumiVelle — Criativos & Ads Validados (Frame.io)</h1>
        <p class="sub">Estrutura obrigatória de 7 blocos: HOOK → IDENTIFICAÇÃO → CURIOSITY → MECHANISM → SOLUTION → BENEFIT → CTA. Meta CTR &gt; 5%, CPC $1–$2, IC $15–$25.</p>
        <div class="actions">
          <a class="btn btn-pink" href="https://next.frame.io/share/d166fb80-0cb9-40af-829e-c9de252976a8/6f3ebdce-9e80-4495-a2da-8903b6ae1dc0" target="_blank" rel="noopener">Abrir Pack de Ads no Frame.io (f.io/4rU6eBui) ↗</a>
          <a class="btn btn-ghost" href="/lumivelle-landing-page-html/">Abrir Landing Page HTML Clonada</a>
          <a class="btn btn-ghost" href="/lumivelle-vsl-oficial/">Ver VSL Oficial</a>
        </div>
      </div>
      <div>
        <img src="https://tkbivipqiewkfnhktmqq.supabase.co/storage/v1/object/public/referencias/vault/swiperadar_202611/lumivelle-product-2.png" alt="LumiVelle Criativos" />
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <h2>Os 7 Ângulos Validados do Pack</h2>
        <div class="angle"><strong>1. The Korean Gelatin Trick</strong> — Curiosidade ritual coreano + demonstração tátil.</div>
        <div class="angle"><strong>2. The Natural Botox Alternative</strong> — Contraste direto contra agulhas de US$ 600 que congelam o rosto.</div>
        <div class="angle"><strong>3. The Walmart Demonstration (Estrutura A vs B)</strong> — Duas gelatinas pressionadas provando firmeza estrutural.</div>
        <div class="angle"><strong>4. The No-Makeup Moment</strong> — Libertação de base craquelando nas linhas finas aos 50+.</div>
        <div class="angle"><strong>5. The Husband’s Compliment</strong> — Gatilho emocional de validação e rejuvenescimento visível.</div>
        <div class="angle"><strong>6. Korean Vitamin After 60</strong> — Autoridade e especificidade para pele madura pós-menopausa.</div>
        <div class="angle"><strong>7. The Four-Part Collagen Reset</strong> — Explicação direta de Colágeno Tipo III + PDRN + Resveratrol + Vitamina C.</div>
      </div>
      <div class="card">
        <h2>Elementos Visuais Obrigatórios & Hook</h2>
        <div class="angle"><strong>Hook 3s Campeão</strong><br>"Before you spend another $600 on Botox that ignores your neck and hands, watch this gelatin test."</div>
        <div class="angle"><strong>Check-list Visual de Produção</strong><br>• Demonstração física da gelatina mole (Estrutura A) vs firme (Estrutura B)<br>• Mulheres reais 50+ em ambiente doméstico natural<br>• Close-up na textura da goma rosa LumiVelle<br>• Comparativo visual de pescoço ("turkey neck"), colo e mãos</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(adsDir, 'index.html'), adsHtml, 'utf8');

  // 4. Take Playwright screenshots for all 3
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const slug of [lpSlug, vslSlug, adsSlug]) {
    const p = await ctx.newPage();
    const indexPath = path.join(SITES_DIR, slug, 'index.html');
    await p.goto('file:///' + indexPath.replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(SITES_DIR, slug, 'preview.jpg'), type: 'jpeg', quality: 84 });
    await p.close();
    console.log('Captured preview.jpg for', slug);
  }
  await browser.close();

  // 5. Update manifest.json, index.html, vercel.json
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const newEntries = [
    {
      slug: lpSlug,
      site_ids: ['a8d15e40-8b2c-41ef-90c4-112233445569'],
      title: 'LumiVelle — Landing Page HTML (PAGE LUMIVELLE.zip)',
      original_url: 'https://next.frame.io/share/cec1bbdb-0ebd-428a-8332-5b23a713eff9/view/b513d7eb-be4d-4705-8dc6-a87c24a7077a',
      tipo: 'landing_page',
      tags: ['lumivelle', 'html-page', 'frameio', 'landing-page', 'original-zip'],
      summary: 'Pacote PAGE LUMIVELLE.zip oficial (HW / LD03) — The Natural Botox That Makes Women Look up to 30 Years Younger.',
      mode: 'original-zip',
      status: 200,
      bytes: fs.statSync(path.join(lpDir, 'index.html')).size,
      preview: `sites/${lpSlug}/preview.jpg`,
      vercel_url: `https://imperio-swipefile.vercel.app/${lpSlug}/`,
      github_url: `https://github.com/vsugamele/imperio-swipefile/tree/main/sites/${lpSlug}`,
    },
    {
      slug: vslSlug,
      site_ids: ['a8d15e40-8b2c-41ef-90c4-112233445567'],
      title: 'LumiVelle — VSL Oficial (Frame.io)',
      original_url: 'https://next.frame.io/share/4f96a670-7116-4864-815c-ee1ec83911ae/06315125-a59d-4657-98ed-9926ee51db7f',
      tipo: 'vsl',
      tags: ['lumivelle', 'vsl', 'frameio', 'skin-50plus'],
      summary: 'VSL principal LumiVelle (atalho: https://f.io/p1KSnwfU). Hook: Korean Pink Gelatin Trick + Colágeno Tipo III + PDRN.',
      mode: 'vault-reconstructed',
      status: 200,
      bytes: fs.statSync(path.join(vslDir, 'index.html')).size,
      preview: `sites/${vslSlug}/preview.jpg`,
      vercel_url: `https://imperio-swipefile.vercel.app/${vslSlug}/`,
      github_url: `https://github.com/vsugamele/imperio-swipefile/tree/main/sites/${vslSlug}`,
    },
    {
      slug: adsSlug,
      site_ids: ['a8d15e40-8b2c-41ef-90c4-112233445568'],
      title: 'LumiVelle — Criativos & Ads Validados (Frame.io)',
      original_url: 'https://next.frame.io/share/d166fb80-0cb9-40af-829e-c9de252976a8/6f3ebdce-9e80-4495-a2da-8903b6ae1dc0',
      tipo: 'swipe',
      tags: ['lumivelle', 'ads', 'frameio', 'criativos'],
      summary: 'Pack oficial de Ads LumiVelle no Frame.io (atalho: https://f.io/4rU6eBui). 7 ângulos e 10 hooks para mulheres 50+.',
      mode: 'vault-reconstructed',
      status: 200,
      bytes: fs.statSync(path.join(adsDir, 'index.html')).size,
      preview: `sites/${adsSlug}/preview.jpg`,
      vercel_url: `https://imperio-swipefile.vercel.app/${adsSlug}/`,
      github_url: `https://github.com/vsugamele/imperio-swipefile/tree/main/sites/${adsSlug}`,
    },
  ];

  for (const ne of newEntries) {
    const idx = manifest.sites.findIndex((s) => s.slug === ne.slug);
    if (idx >= 0) manifest.sites[idx] = ne;
    else manifest.sites.push(ne);
  }

  manifest.generated_at = new Date().toISOString();
  manifest.total_unique_sites = manifest.sites.length;
  manifest.total_imphq_rows = manifest.sites.reduce((acc, s) => acc + (s.site_ids ? s.site_ids.length : 1), 0);
  manifest.live_cloned = manifest.sites.filter((s) => s.mode === 'live-dom' || s.mode === 'original-zip').length;
  manifest.vault_reconstructed = manifest.sites.filter((s) => s.mode === 'vault-reconstructed').length;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const vercelConfig = {
    cleanUrls: false,
    trailingSlash: false,
    rewrites: manifest.sites.flatMap((s) => [
      { source: `/${s.slug}`, destination: `/sites/${s.slug}/index.html` },
      { source: `/${s.slug}/`, destination: `/sites/${s.slug}/index.html` },
      { source: `/${s.slug}/:path*`, destination: `/sites/${s.slug}/:path*` },
    ]),
  };
  fs.writeFileSync(path.join(ROOT_DIR, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');

  let rootIndex = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  rootIndex = rootIndex.replace(/const MANIFEST = \[[\s\S]*?\];/, `const MANIFEST = ${JSON.stringify(manifest.sites)};`);
  fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), rootIndex, 'utf8');

  console.log('Updated manifest:', {
    total_unique_sites: manifest.total_unique_sites,
    total_imphq_rows: manifest.total_imphq_rows,
    live_cloned: manifest.live_cloned,
    vault_reconstructed: manifest.vault_reconstructed,
  });
}

main().catch(console.error);
