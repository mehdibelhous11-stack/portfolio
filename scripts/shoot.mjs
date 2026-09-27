/**
 * Dev-only visual check. Drives the installed Chrome over CDP and writes
 * screenshots so layout and the WebGL scene can be inspected without a
 * manual pass. Not part of the build.
 *
 *   node scripts/shoot.mjs <outDir> [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const OUT = process.argv[2];
const URL = process.argv[3] || 'http://localhost:4173/';
const CHROME =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/* `at` is a selector to bring to the top of the viewport; omit for the intro. */
const SHOTS = [
  { name: 'desktop-intro', w: 1440, h: 900 },
  { name: 'desktop-approche', w: 1440, h: 900, at: '#approche' },
  { name: 'desktop-principes', w: 1440, h: 900, at: '#principes' },
  { name: 'desktop-travaux', w: 1440, h: 900, at: '#travaux' },
  { name: 'desktop-travaux-2', w: 1440, h: 900, at: '.feature:nth-child(2)' },
  { name: 'desktop-others', w: 1440, h: 900, at: '.others' },
  { name: 'desktop-parcours', w: 1440, h: 900, at: '#parcours' },
  { name: 'desktop-contact', w: 1440, h: 900, at: '#contact' },
  { name: 'desktop-closing', w: 1440, h: 900, at: '.closing' },
  { name: 'mobile-intro', w: 390, h: 844, mobile: true },
  { name: 'mobile-approche', w: 390, h: 844, mobile: true, at: '#approche' },
  { name: 'mobile-principes', w: 390, h: 844, mobile: true, at: '#principes' },
  { name: 'mobile-travaux', w: 390, h: 844, mobile: true, at: '#travaux' },
  { name: 'text-route', w: 1440, h: 900, path: 'text' },
];

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars', '--no-sandbox'],
});

const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => errors.push(`[failed] ${r.url()} ${r.failure()?.errorText}`));

for (const s of SHOTS) {
  await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: !!s.mobile, hasTouch: !!s.mobile });
  await page.goto(new globalThis.URL(s.path || '', URL).href, { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3200)); // boot overlay + scene settle
  if (s.at) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 64, behavior: 'instant' });
    }, s.at);
    await new Promise((r) => setTimeout(r, 1600));
  }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log('shot', s.name);
}

await page.goto(URL, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 3200));
// Software GL can stall the main thread past the boot cap; wait it out.
await page
  .waitForFunction(() => document.getElementById('boot')?.hasAttribute('data-done') ?? true, { timeout: 8000 })
  .catch(() => {});
const report = await page.evaluate(() => ({
  webgl: !!document.querySelector('canvas.scene')?.hasAttribute('data-ready'),
  bootGone: document.getElementById('boot')?.hasAttribute('data-done') ?? true,
  features: document.querySelectorAll('.feature').length,
  otherRows: document.querySelectorAll('.others__row').length,
  indexLinks: document.querySelectorAll('.index__link').length,
  // How often the name appears as visible text — the brief was to demote it.
  nameMentions: [...document.querySelectorAll('body *:not(script):not(.sr-only)')]
    .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && /Mehdi Belhous/.test(n.textContent))).length,
  words: document.querySelector('main')?.innerText.split(/\s+/).filter(Boolean).length,
  docHeight: document.documentElement.scrollHeight,
  overflowX: document.documentElement.scrollWidth > window.innerWidth,
}));

console.log('\nreport:', JSON.stringify(report, null, 2));
console.log('\nconsole errors:', errors.length ? `\n  ${errors.join('\n  ')}` : 'none');
await browser.close();
