/**
 * Dev-only visual check. Drives the installed Chrome over CDP and writes
 * screenshots so layout, the opening and the WebGL scene can be inspected
 * without a manual pass. Not part of the build.
 *
 *   node scripts/shoot.mjs <outDir> [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { RANGE } from '../lib/sequence.js';
import { heroOnly } from '../lib/content.js';

const OUT = process.argv[2];
const URL = process.argv[3] || 'http://localhost:4173/';
const CHROME =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/* A point in the opening: `u` of the way through beat `id`. */
const at = (id, u) => RANGE[id][0] + (RANGE[id][1] - RANGE[id][0]) * u;

/* `seq` scrubs the opening to that progress; `at` brings a selector to the
   top of the viewport (less `offset`); neither is the first frame. */
const DESKTOP = { w: 1440, h: 900 };
const MOBILE = { w: 390, h: 844, mobile: true };
const SHOTS = [
  { name: 'desktop-seq-1-sketch', ...DESKTOP },
  { name: 'desktop-seq-2-profile', ...DESKTOP, seq: at('profile', 0.45) },
  { name: 'desktop-seq-3-closed', ...DESKTOP, seq: at('profile', 1) },
  { name: 'desktop-seq-4-incline', ...DESKTOP, seq: at('incline', 0.5) },
  { name: 'desktop-seq-5-leaned', ...DESKTOP, seq: at('incline', 1) },
  { name: 'desktop-seq-6-extrude', ...DESKTOP, seq: at('extrude', 0.3) },
  { name: 'desktop-seq-7-solid', ...DESKTOP, seq: at('extrude', 1) },
  { name: 'desktop-seq-8-notes', ...DESKTOP, seq: at('annotate', 1) },
  { name: 'desktop-intro', ...DESKTOP, at: '.intro', offset: 0 },
  { name: 'desktop-approche', ...DESKTOP, at: '#approche' },
  { name: 'desktop-principes', ...DESKTOP, at: '#principes' },
  { name: 'desktop-travaux', ...DESKTOP, at: '#travaux' },
  { name: 'desktop-others', ...DESKTOP, at: '.others' },
  { name: 'desktop-contact', ...DESKTOP, at: '#contact' },
  { name: 'mobile-seq-1-sketch', ...MOBILE },
  { name: 'mobile-seq-4-incline', ...MOBILE, seq: at('incline', 0.5) },
  { name: 'mobile-seq-7-solid', ...MOBILE, seq: at('extrude', 1) },
  { name: 'mobile-seq-8-notes', ...MOBILE, seq: at('annotate', 1) },
  { name: 'mobile-intro', ...MOBILE, at: '.intro', offset: 0 },
  { name: 'mobile-approche', ...MOBILE, at: '#approche' },
  { name: 'text-route', ...DESKTOP, path: 'text' },
];

/* While the page is the hero alone (lib/content.js), everything below the
   statement is masked: only the opening, the statement and /text are shot. */
const shots = heroOnly ? SHOTS.filter((s) => !s.at || s.at === '.intro') : SHOTS;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* Software GL can stall the main thread well past the boot cap; wait it out,
   then give the triangle time to draw itself. */
const boot = async () => {
  await page
    .waitForFunction(() => document.getElementById('boot')?.hasAttribute('data-done') ?? true, { timeout: 15000 })
    .catch(() => {});
  await wait(2400);
};

for (const s of shots) {
  await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: !!s.mobile, hasTouch: !!s.mobile });
  await page.goto(new globalThis.URL(s.path || '', URL).href, { waitUntil: 'load', timeout: 45000 });
  if (!s.path) await boot();
  if (s.seq != null) {
    await page.evaluate((t) => {
      const el = document.getElementById('top');
      scrollTo({ top: el.offsetTop + t * (el.offsetHeight - innerHeight), behavior: 'instant' });
    }, s.seq);
    await wait(2600);
  } else if (s.at) {
    await page.evaluate(
      (sel, offset) => {
        const el = document.querySelector(sel);
        if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' });
      },
      s.at,
      s.offset ?? 64,
    );
    await wait(2600);
  }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log('shot', s.name);
}

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'load' });
await boot();
const report = await page.evaluate(() => ({
  webgl: !!document.querySelector('canvas.scene')?.hasAttribute('data-ready'),
  bootGone: document.getElementById('boot')?.hasAttribute('data-done') ?? true,
  openingScreens: +(document.getElementById('top').offsetHeight / innerHeight).toFixed(2),
  callouts: document.querySelectorAll('.callout').length,
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
