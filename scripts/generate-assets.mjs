/**
 * Rasterises the brand mark into every icon the page references, straight
 * from lib/mark.js. Run `npm run assets` after touching the construction.
 *
 * Icons go through sharp. The OG card goes through the installed Chrome so
 * its text is set in Space Grotesk; without Chrome (or offline) it falls
 * back to sharp and whatever grotesque the machine has.
 *
 * Output is committed to public/ so deployments never need either tool.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { MARK_PATH, MARK_VIEWBOX } from '../lib/mark.js';
import { site, lead } from '../lib/content.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VOID = '#0b0b0c';
const INK = '#f5f5f4';
const INK_2 = '#8f9196';
const INK_3 = '#5b5d63';

/** SVG is XML: an unescaped & in the role string is a parse error, not a glyph. */
const xml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const glyph = (fill) => `<path d="${MARK_PATH}" fill="${fill}" fill-rule="evenodd"/>`;

/** The mark on its field, padded to the icon safe area. */
const icon = (bg, fg, pad = 18) => {
  const box = MARK_VIEWBOX + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${box}" height="${box}">
  <rect width="${box}" height="${box}" fill="${bg}"/>
  <g transform="translate(${pad},${pad})">${glyph(fg)}</g>
</svg>`;
};

/** On its own dark field, so it holds up on light and dark browser chrome. */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}">
  <rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" fill="${VOID}"/>
  ${glyph(INK)}
</svg>`;

/**
 * 1200x630 social card. The statement leads, the mark carries the right
 * half, and the name sits small in the corner — the card follows the same
 * rule as the page: the position is the headline, the person the byline.
 */
const ogHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=block">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${VOID}; color: ${INK};
         font-family: 'Space Grotesk', sans-serif; position: relative; overflow: hidden; }
  .brand { position: absolute; left: 80px; top: 72px; display: flex; align-items: center; gap: 16px;
           font-size: 24px; font-weight: 500; letter-spacing: -0.01em; }
  .brand svg { width: 34px; height: 34px; }
  h1 { position: absolute; left: 80px; top: 196px; font-size: 92px; font-weight: 500;
       line-height: 1; letter-spacing: -0.04em; }
  .role { position: absolute; left: 80px; top: 420px; font-size: 30px; color: ${INK_2}; letter-spacing: -0.01em; }
  .foot { position: absolute; left: 80px; right: 80px; bottom: 64px; display: flex;
          justify-content: space-between; font-size: 21px; color: ${INK_3}; }
  .big { position: absolute; right: 36px; top: 112px; width: 360px; height: 360px; }
</style></head><body>
  <div class="brand"><svg viewBox="0 0 100 100">${glyph(INK)}</svg>${xml(site.name)}</div>
  <h1>${lead.punch.map(xml).join('<br>')}</h1>
  <p class="role">${xml(site.role)}</p>
  <svg class="big" viewBox="0 0 100 100">${glyph(INK)}</svg>
  <div class="foot"><span>${xml(site.location)}</span><span>${xml(site.status)}</span></div>
</body></html>`;

/** Fallback card for machines without Chrome: same layout, system type. */
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${VOID}"/>
  <g transform="translate(80,72) scale(0.34)">${glyph(INK)}</g>
  <text x="130" y="97" fill="${INK}" font-family="Space Grotesk,Arial,sans-serif" font-size="24" font-weight="500">${xml(site.name)}</text>
  <text x="80" y="280" fill="${INK}" font-family="Space Grotesk,Arial,sans-serif" font-size="92" font-weight="500" letter-spacing="-3.6">${xml(lead.punch[0])}</text>
  <text x="80" y="372" fill="${INK}" font-family="Space Grotesk,Arial,sans-serif" font-size="92" font-weight="500" letter-spacing="-3.6">${xml(lead.punch[1])}</text>
  <text x="80" y="450" fill="${INK_2}" font-family="Space Grotesk,Arial,sans-serif" font-size="30">${xml(site.role)}</text>
  <g transform="translate(804,112) scale(3.6)">${glyph(INK)}</g>
  <text x="80" y="566" fill="${INK_3}" font-family="Space Grotesk,Arial,sans-serif" font-size="21">${xml(site.location)}</text>
  <text x="1120" y="566" fill="${INK_3}" font-family="Space Grotesk,Arial,sans-serif" font-size="21" text-anchor="end">${xml(site.status)}</text>
</svg>`;

/** @returns {Promise<Buffer|null>} null when Chrome or the font is unavailable */
async function renderOgInChrome() {
  let puppeteer;
  try {
    ({ default: puppeteer } = await import('puppeteer-core'));
  } catch {
    return null;
  }
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  } catch {
    return null;
  }
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(ogHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => document.fonts.check('500 92px "Space Grotesk"'));
    return loaded ? Buffer.from(await page.screenshot({ type: 'png' })) : null;
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}

const manifest = {
  name: site.name,
  short_name: site.initials,
  description: site.description,
  start_url: '/',
  display: 'standalone',
  background_color: VOID,
  theme_color: VOID,
  lang: 'fr',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
};

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();

await mkdir(OUT, { recursive: true });

await writeFile(join(OUT, 'favicon.svg'), faviconSvg);
await writeFile(join(OUT, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
await writeFile(
  join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
);
await writeFile(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site.url}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n  <url><loc>${site.url}/text</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n</urlset>\n`,
);

const tight = icon(VOID, INK, 12);
const safe = icon(VOID, INK, 30); // maskable needs a 20% safe zone on every side

await writeFile(join(OUT, 'icon-192.png'), await png(tight, 192));
await writeFile(join(OUT, 'icon-512.png'), await png(tight, 512));
await writeFile(join(OUT, 'icon-maskable-512.png'), await png(safe, 512));
await writeFile(join(OUT, 'apple-touch-icon.png'), await png(icon(VOID, INK, 20), 180));

/* A 48 px PNG under the .ico name — every browser that still asks for
   /favicon.ico accepts PNG data. */
await writeFile(
  join(OUT, 'favicon.ico'),
  await sharp(Buffer.from(tight)).resize(48, 48).toFormat('png').toBuffer(),
);

const og = await renderOgInChrome();
await writeFile(join(OUT, 'og.png'), og ?? (await sharp(Buffer.from(ogSvg)).png().toBuffer()));

console.log(
  'assets → public/ : favicon.svg, favicon.ico, apple-touch-icon.png, icon-{192,512}.png, icon-maskable-512.png, og.png, site.webmanifest, robots.txt, sitemap.xml',
);
console.log(og ? 'og.png set in Space Grotesk (Chrome).' : 'og.png fell back to system type — Chrome or the font was unavailable.');
