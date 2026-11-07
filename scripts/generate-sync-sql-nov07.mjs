import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = "C:/Users/vsuga/Documents/imperio-ofertas-meta/imperio-swipefile";
const SQL_OUT =
  "C:/Users/vsuga/.gemini/antigravity/brain/9ade557f-b904-4309-9db7-c8debcce31b3/scratch/sync_round_nov07.sql";

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"));

const valuesList = [];
for (const m of manifest) {
  for (const id of m.siteIds) {
    const vUrl = m.vercelUrl.replace(/'/g, "''");
    const gUrl = m.githubUrl.replace(/'/g, "''");
    valuesList.push(`    ('${id}'::uuid, '${vUrl}', '${gUrl}')`);
  }
}

const sql = `
-- 1. Fix Diego Aguiar URL & Sacred Manuscript preview & JP Hair Experience title
UPDATE public.imphq_referencias
SET url = 'https://diegoaguiar.com/'
WHERE id = 'b35dd23b-58ea-48f7-b0bc-011c5c605c0f';

UPDATE public.imphq_sites
SET
  thumbnail_url = COALESCE(thumbnail_url, 'https://imperio-swipefile.vercel.app/sites/the-sacred-manuscript-home-sacredstudygu/preview.jpg'),
  fullpage_screenshot_url = COALESCE(fullpage_screenshot_url, 'https://imperio-swipefile.vercel.app/sites/the-sacred-manuscript-home-sacredstudygu/preview.jpg')
WHERE id = '1308d994-d74d-46de-99d4-1cf4a54aabb8';

UPDATE public.imphq_referencias
SET
  image_url = COALESCE(image_url, 'https://imperio-swipefile.vercel.app/sites/the-sacred-manuscript-home-sacredstudygu/preview.jpg')
WHERE id = '4ba60403-1734-4905-9b85-8ca7897985b6';

UPDATE public.imphq_sites
SET titulo = 'JP Freitas Hair Experience — 2 dias ao vivo · 15 e 16 de novembro'
WHERE id IN ('933fbcf8-b7b3-494b-a176-b7ccf5979cf0', '0663cf78-ffb8-41a1-b7c2-07920d7aaf97');

UPDATE public.imphq_referencias
SET titulo = 'JP Freitas Hair Experience — 2 dias ao vivo · 15 e 16 de novembro'
WHERE titulo = 'JP Freitas Hair Experience — 2 dias ao vivo · 8 e 9 de novembro';

-- 2. Sync all manifest clones to imphq_sites
WITH mapping(site_id, vercel_url, github_url) AS (
  VALUES
${valuesList.join(",\n")}
)
UPDATE public.imphq_sites s
SET
  vercel_clone_url = m.vercel_url,
  github_url = m.github_url,
  updated_at = now()
FROM mapping m
WHERE s.id = m.site_id;

-- 3. Link all LP/Site references in imphq_referencias to their exact imphq_sites row
UPDATE public.imphq_referencias r
SET
  analise = jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(r.analise, '{}'::jsonb), '{site_id}', to_jsonb(s.id::text), true),
      '{vercel_clone_url}',
      to_jsonb(s.vercel_clone_url),
      true
    ),
    '{github_url}',
    to_jsonb(s.github_url),
    true
  ),
  updated_at = now()
FROM public.imphq_sites s
WHERE s.vercel_clone_url IS NOT NULL
  AND s.vercel_clone_url <> ''
  AND (
    (r.analise->>'site_id') = s.id::text
    OR LOWER(TRIM(TRAILING '/' FROM r.url)) = LOWER(TRIM(TRAILING '/' FROM s.url))
    OR (
      (r.pasta ILIKE '04 · Sites%' OR r.pasta = 'Landing Pages / Sites' OR r.tipo IN ('site', 'landing_page', 'lp'))
      AND r.titulo = s.titulo
    )
  );

-- 4. Link Offer Ads & VSLs in 03 · Ads, Criativos & Ofertas Escaladas to their offer's primary cloned LP
WITH offer_clones(produto_match, pasta_match, site_id, vercel_url, github_url) AS (
  VALUES
    ('PowerUp', null, '2b2ec13e-a9bd-45de-9ab3-e8a2e3ac53a2', 'https://imperio-swipefile.vercel.app/powerup-powerfulwellness-pug-vsl-01-lead/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/powerup-powerfulwellness-pug-vsl-01-lead'),
    ('SodaPril', null, '443d0f75-cbeb-4cc6-bb8c-4c9ccb355ee6', 'https://imperio-swipefile.vercel.app/sodapril-go-glenwood-pril1/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/sodapril-go-glenwood-pril1'),
    ('HorseFil', null, '8fa071ea-e8f0-4632-8552-76cc27643127', 'https://imperio-swipefile.vercel.app/horsefil-lightlivingguide-fb-ed-horsefil/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/horsefil-lightlivingguide-fb-ed-horsefil'),
    ('Memodyne', null, '06cac4a7-2446-470e-964d-81aa9e176238', 'https://imperio-swipefile.vercel.app/memodyne-clearloopbase-memodyn-l25nc941t/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/memodyne-clearloopbase-memodyn-l25nc941t'),
    ('Brain Recall', null, '71c1e9c7-075d-4a40-b19c-887864f24dfe', 'https://imperio-swipefile.vercel.app/brain-recall-myworldjournal-brain-vsl02/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/brain-recall-myworldjournal-brain-vsl02'),
    ('The Lost Prayer', null, '85f1fbe3-c0c3-496d-84d7-e8bb0765db68', 'https://imperio-swipefile.vercel.app/the-lost-prayer-abundant-life-co-optin-6/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-lost-prayer-abundant-life-co-optin-6'),
    ('The Sacred Prayer', null, '6c0a9597-3091-48ef-94bc-7047ce3f2042', 'https://imperio-swipefile.vercel.app/the-sacred-prayer-2/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-sacred-prayer-2'),
    ('The Last Wish', null, '642434a1-01c8-42e3-b151-52be68601c99', 'https://imperio-swipefile.vercel.app/the-last-wish-abundant-life-co-tlw-vsl11/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-last-wish-abundant-life-co-tlw-vsl11'),
    ('Seed Of Heritage', null, 'bb12b67f-c254-4b5f-b407-c09f03546f57', 'https://imperio-swipefile.vercel.app/seed-of-heritage-mymichaelguide-223/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/seed-of-heritage-mymichaelguide-223'),
    ('Esther Secret', null, 'b976d5c3-8d89-439a-a5ce-aae4f2f1e469', 'https://imperio-swipefile.vercel.app/esther-secret-unlockblessings-front/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/esther-secret-unlockblessings-front'),
    ('The Sacred Manuscript', null, '1308d994-d74d-46de-99d4-1cf4a54aabb8', 'https://imperio-swipefile.vercel.app/the-sacred-manuscript-home-sacredstudygu/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-sacred-manuscript-home-sacredstudygu'),
    ('LumiVelle', null, 'a8d15e40-8b2c-41ef-90c4-112233445566', 'https://imperio-swipefile.vercel.app/lumivelle-briefing-estrategico-de-afilia/', 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/lumivelle-briefing-estrategico-de-afilia'),
    ('Atlas AI Lotto Money', null, '6d10cb20-cdf3-48b4-93d9-b1f2a58eca5a', 'https://atlas-ai-vsl.vercel.app/', 'https://github.com/vsugamele/atlas-ai-vsl')
)
UPDATE public.imphq_referencias r
SET
  analise = jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(r.analise, '{}'::jsonb), '{site_id}', to_jsonb(oc.site_id), true),
      '{vercel_clone_url}',
      to_jsonb(oc.vercel_url),
      true
    ),
    '{github_url}',
    to_jsonb(oc.github_url),
    true
  ),
  updated_at = now()
FROM offer_clones oc
WHERE r.produto = oc.produto_match
  AND (r.analise->>'vercel_clone_url' IS NULL OR r.analise->>'vercel_clone_url' = '');

-- 5. Also link remaining Espiritualidade & Prosperidade (SwipeRadar) ads by title prefix if produto was generic
UPDATE public.imphq_referencias r
SET
  analise = jsonb_set(
    jsonb_set(
      coalesce(r.analise, '{}'::jsonb),
      '{vercel_clone_url}',
      to_jsonb(
        CASE
          WHEN r.titulo ILIKE '%Frequency of Angels%' THEN 'https://imperio-swipefile.vercel.app/frequency-of-angels-2/'
          WHEN r.titulo ILIKE '%Divine Script%' THEN 'https://imperio-swipefile.vercel.app/divine-script-1/'
          WHEN r.titulo ILIKE '%Sacred Prayer%' THEN 'https://imperio-swipefile.vercel.app/the-sacred-prayer-2/'
          WHEN r.titulo ILIKE '%Lost Prayer%' THEN 'https://imperio-swipefile.vercel.app/the-lost-prayer-abundant-life-co-optin-6/'
          WHEN r.titulo ILIKE '%Last Wish%' THEN 'https://imperio-swipefile.vercel.app/the-last-wish-abundant-life-co-tlw-vsl11/'
          WHEN r.titulo ILIKE '%Seed Of Heritage%' THEN 'https://imperio-swipefile.vercel.app/seed-of-heritage-mymichaelguide-223/'
          WHEN r.titulo ILIKE '%Seed of Faith%' THEN 'https://imperio-swipefile.vercel.app/seed-of-faith-1/'
          WHEN r.titulo ILIKE '%Manuscript of Miracles%' THEN 'https://imperio-swipefile.vercel.app/manuscript-of-miracles-2/'
          WHEN r.titulo ILIKE '%Esther Secret%' THEN 'https://imperio-swipefile.vercel.app/esther-secret-unlockblessings-front/'
          WHEN r.titulo ILIKE '%Sacred Manuscript%' THEN 'https://imperio-swipefile.vercel.app/the-sacred-manuscript-home-sacredstudygu/'
          ELSE 'https://imperio-swipefile.vercel.app/the-sacred-prayer-2/'
        END
      ),
      true
    ),
    '{github_url}',
    to_jsonb(
      CASE
        WHEN r.titulo ILIKE '%Frequency of Angels%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/frequency-of-angels-2'
        WHEN r.titulo ILIKE '%Divine Script%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/divine-script-1'
        WHEN r.titulo ILIKE '%Sacred Prayer%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-sacred-prayer-2'
        WHEN r.titulo ILIKE '%Lost Prayer%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-lost-prayer-abundant-life-co-optin-6'
        WHEN r.titulo ILIKE '%Last Wish%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-last-wish-abundant-life-co-tlw-vsl11'
        WHEN r.titulo ILIKE '%Seed Of Heritage%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/seed-of-heritage-mymichaelguide-223'
        WHEN r.titulo ILIKE '%Seed of Faith%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/seed-of-faith-1'
        WHEN r.titulo ILIKE '%Manuscript of Miracles%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/manuscript-of-miracles-2'
        WHEN r.titulo ILIKE '%Esther Secret%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/esther-secret-unlockblessings-front'
        WHEN r.titulo ILIKE '%Sacred Manuscript%' THEN 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-sacred-manuscript-home-sacredstudygu'
        ELSE 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/the-sacred-prayer-2'
      END
    ),
    true
  ),
  updated_at = now()
WHERE r.pasta = '03 · Ads, Criativos & Ofertas Escaladas/Espiritualidade & Prosperidade (SwipeRadar)'
  AND (r.analise->>'vercel_clone_url' IS NULL OR r.analise->>'vercel_clone_url' = '');

-- 6. Link JP Freitas (Criativos & Grok) without clone to jp-hair-experience
UPDATE public.imphq_referencias r
SET
  analise = jsonb_set(
    jsonb_set(
      coalesce(r.analise, '{}'::jsonb),
      '{vercel_clone_url}',
      '"https://imperio-swipefile.vercel.app/jp-hair-experience/"'::jsonb,
      true
    ),
    '{github_url}',
    '"https://github.com/vsugamele/imperio-swipefile/tree/main/sites/jp-hair-experience"'::jsonb,
    true
  ),
  updated_at = now()
WHERE r.pasta = '03 · Ads, Criativos & Ofertas Escaladas/Beleza, Cabelo & JP Freitas/JP Freitas (Criativos & Grok)'
  AND (r.analise->>'vercel_clone_url' IS NULL OR r.analise->>'vercel_clone_url' = '');

-- 7. Sync fast_card->'analise' with analise.vercel_clone_url, analise.github_url, and analise.site_id across ALL references!
UPDATE public.imphq_referencias r
SET
  fast_card = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(r.fast_card, '{}'::jsonb),
        '{analise}',
        coalesce(r.fast_card->'analise', '{}'::jsonb),
        true
      ),
      '{analise,vercel_clone_url}',
      to_jsonb(r.analise->>'vercel_clone_url'),
      true
    ),
    '{analise,github_url}',
    to_jsonb(coalesce(r.analise->>'github_url', '')),
    true
  )
WHERE r.analise->>'vercel_clone_url' IS NOT NULL
  AND r.analise->>'vercel_clone_url' <> ''
  AND (
    r.fast_card IS NULL
    OR r.fast_card->'analise'->>'vercel_clone_url' IS DISTINCT FROM r.analise->>'vercel_clone_url'
    OR r.fast_card->'analise'->>'github_url' IS DISTINCT FROM r.analise->>'github_url'
  );
`;

fs.writeFileSync(SQL_OUT, sql, "utf8");
console.log(`Generated ${SQL_OUT} (${sql.length} bytes)`);
