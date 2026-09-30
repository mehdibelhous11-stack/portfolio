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
import { site } from '../lib/content.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VOID = '#0b0b0c';
const INK = '#f5f5f4';

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
 * 1200x630 social card: the mark and the name, centred, nothing else.
 * Stacked rather than side by side, so a square crop of the card (small
 * link previews) still holds both.
 */
const ogHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=block">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${VOID}; color: ${INK};
         font-family: 'Space Grotesk', sans-serif; overflow: hidden;
         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px; }
  svg { width: 160px; height: 160px; }
  h1 { font-size: 76px; font-weight: 500; line-height: 1; letter-spacing: -0.04em; }
</style></head><body>
  <svg viewBox="0 0 100 100">${glyph(INK)}</svg>
  <h1>${xml(site.name)}</h1>
</body></html>`;

/** Fallback card for machines without Chrome: same layout, system type. */
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${VOID}"/>
  <g transform="translate(520,177) scale(1.6)">${glyph(INK)}</g>
  <text x="600" y="437" fill="${INK}" font-family="Space Grotesk,Arial,sans-serif" font-size="76" font-weight="500" letter-spacing="-3" text-anchor="middle">${xml(site.name)}</text>
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
    const loaded = await page.evaluate(() => document.fonts.check('500 76px "Space Grotesk"'));
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
