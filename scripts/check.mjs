/**
 * Dev-only interaction check. Exercises the states a static screenshot
 * cannot reach — theme toggle, index overlay, reduced motion, keyboard
 * focus, the /text route — and reports anything that misbehaves.
 *
 *   node scripts/check.mjs <outDir> [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const OUT = process.argv[2];
const URL = process.argv[3] || 'http://localhost:4173/';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars', '--no-sandbox'],
});

const errors = [];
const results = [];
const settle = (ms = 2600) => new Promise((r) => setTimeout(r, ms));

const open = async (viewport, { path = '', emulate } = {}) => {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));
  if (emulate) await page.emulateMediaFeatures(emulate);
  await page.setViewport(viewport);
  await page.goto(new globalThis.URL(path, URL).href, { waitUntil: 'load', timeout: 45000 });
  await settle();
  return page;
};

const THEME = '.nav__tools .pill--icon';
const INDEX = 'button[aria-controls="index"]';

/* ---- 1. Theme ------------------------------------------------------------ */
{
  const page = await open({ width: 1440, height: 900 });
  await page.click(THEME);
  await settle(1500);
  await page.screenshot({ path: `${OUT}/light-intro.png` });
  results.push({
    test: 'theme toggle',
    theme: await page.evaluate(() => document.documentElement.dataset.theme),
    bodyBg: await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  });
  await page.reload({ waitUntil: 'load' });
  await settle(800);
  results.push({ test: 'theme persists', theme: await page.evaluate(() => document.documentElement.dataset.theme) });
  // Leave the next tests on the default palette.
  await page.evaluate(() => localStorage.removeItem('mb-theme'));
  await page.close();
}

/* ---- 2. Index overlay (desktop and mobile share it) ---------------------- */
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  const page = await open(vp);
  const tag = vp.width < 800 ? 'mobile' : 'desktop';
  await page.click(INDEX);
  await settle(900);
  await page.screenshot({ path: `${OUT}/index-${tag}.png` });
  const opened = await page.evaluate(() => ({
    expanded: document.querySelector('button[aria-controls="index"]').getAttribute('aria-expanded'),
    bodyLocked: document.body.style.overflow === 'hidden',
    links: document.querySelectorAll('.index__link').length,
    focusable: !document.getElementById('index').hasAttribute('inert'),
  }));
  await page.keyboard.press('Escape');
  await settle(600);
  const closed = await page.evaluate(() => ({
    expanded: document.querySelector('button[aria-controls="index"]').getAttribute('aria-expanded'),
    bodyLocked: document.body.style.overflow === 'hidden',
    inert: document.getElementById('index').hasAttribute('inert'),
    focusBack: document.activeElement?.getAttribute('aria-controls') === 'index',
  }));

  // Navigating from the index must land on the section, not leave it hidden.
  await page.click(INDEX);
  await settle(700);
  await page.evaluate(() => document.querySelector('.index__link[href="#travaux"]').click());
  await settle(2200);
  const landed = await page.evaluate(() => Math.round(document.getElementById('travaux').getBoundingClientRect().top));

  results.push({ test: `index ${tag}`, opened, closed, travauxTopAfterJump: landed });
  await page.close();
}

/* ---- 3. Reduced motion ---------------------------------------------------- */
{
  const page = await open({ width: 1440, height: 900 }, { emulate: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  results.push({
    test: 'reduced motion',
    cuesAllVisible: await page.evaluate(() => [...document.querySelectorAll('.cue')].every((n) => getComputedStyle(n).opacity === '1')),
    canvasOpacity: await page.evaluate(() => document.querySelector('canvas.scene')?.style.opacity),
    customCursorOff: await page.evaluate(() => !document.documentElement.dataset.cursor),
  });
  await page.close();
}

/* ---- 4. Keyboard + a11y --------------------------------------------------- */
{
  const page = await open({ width: 1440, height: 900 });
  await page.keyboard.press('Tab');
  await settle(300);
  const a11y = await page.evaluate(() => {
    const unnamed = (sel) => [...document.querySelectorAll(sel)].filter(
      (n) => !n.textContent.trim() && !n.getAttribute('aria-label')).length;
    const h = [...document.querySelectorAll('h1,h2,h3')].map((e) => +e.tagName[1]);
    let skips = 0;
    for (let i = 1; i < h.length; i += 1) if (h[i] - h[i - 1] > 1) skips += 1;
    return {
      firstTabStop: document.activeElement?.className,
      h1: document.querySelectorAll('h1').length,
      headingSkips: skips,
      unnamedButtons: unnamed('button'),
      unnamedLinks: unnamed('a'),
      lang: document.documentElement.lang,
    };
  });
  results.push({ test: 'a11y', ...a11y });
  await page.close();
}

/* ---- 5. /text ------------------------------------------------------------- */
{
  const page = await open({ width: 1440, height: 900 }, { path: 'text' });
  results.push({
    test: '/text',
    title: await page.title(),
    h1: await page.evaluate(() => document.querySelector('h1')?.textContent),
    projects: await page.evaluate(() => document.querySelectorAll('main section h3').length),
    hasCanvas: await page.evaluate(() => !!document.querySelector('canvas')),
    words: await page.evaluate(() => document.querySelector('main').innerText.split(/\s+/).length),
  });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
console.log('\nerrors:', errors.length ? `\n  ${errors.join('\n  ')}` : 'none');
await browser.close();
