/**
 * Dev-only interaction check. Exercises the states a static screenshot
 * cannot reach — theme toggle, index overlay, reduced motion, keyboard
 * focus, the /text route — and reports anything that misbehaves.
 *
 *   node scripts/check.mjs <outDir> [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { RANGE } from '../lib/sequence.js';
import { heroOnly } from '../lib/content.js';

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

/* ---- 2. Index overlay (desktop and mobile share it) ----------------------
   While the page is the hero alone (`heroOnly`, lib/content.js) the index
   is masked with the sections it lists: check instead that both are gone,
   and that the page ends on the statement with the plate beside it. */
if (heroOnly) {
  const page = await open({ width: 1440, height: 900 });
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await settle();
  results.push({
    test: 'hero only',
    ...(await page.evaluate(() => ({
      sections: [...document.querySelectorAll('main > section')].map((s) => s.id || s.classList[0]),
      index: !!document.getElementById('index') || !!document.querySelector('button[aria-controls="index"]'),
      footer: !!document.querySelector('.footer'),
      canvasAtEnd: +(document.querySelector('canvas.scene')?.style.opacity ?? 0),
    }))),
  });
  await page.close();
}

for (const vp of heroOnly ? [] : [{ width: 1440, height: 900 }, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
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
    // The opening collapses to one finished screen.
    openingScreens: await page.evaluate(() => document.getElementById('top').offsetHeight / innerHeight),
    calloutsShown: await page.evaluate(() => [...document.querySelectorAll('.callout')].every((n) => getComputedStyle(n).opacity === '1')),
    canvasOpacity: await page.evaluate(() => document.querySelector('canvas.scene')?.style.opacity),
    customCursorOff: await page.evaluate(() => !document.documentElement.dataset.cursor),
  });
  await page.close();
}

/* ---- 3b. The opening, scrubbed --------------------------------------------- */
{
  const page = await open({ width: 1440, height: 900 });
  const scrub = async (t) => {
    await page.evaluate((t) => {
      const el = document.getElementById('top');
      scrollTo({ top: el.offsetTop + t * (el.offsetHeight - innerHeight), behavior: 'instant' });
    }, t);
    await settle(2600);
  };
  const state = () =>
    page.evaluate(() => {
      const opacity = (n) => +(n.style.opacity || getComputedStyle(n).opacity);
      const box = (n) => n.getBoundingClientRect();
      return {
        canvas: +(document.querySelector('canvas.scene')?.style.opacity ?? 0),
        triangle: !!document.querySelector('[data-part="tri"]').getAttribute('d'),
        sketch: opacity(document.querySelector('[data-part="sketch"]')),
        callouts: [...document.querySelectorAll('.callout')].map(opacity),
        leaders: [...document.querySelectorAll('[data-part="leader"]')].every((n) => (n.getAttribute('d') || '').length > 10),
        // Every anchor on screen, and every word inside the viewport.
        anchorsOnScreen: [...document.querySelectorAll('[data-part="anchor"]')].every((n) => {
          const r = box(n);
          return r.left > 0 && r.right < innerWidth && r.top > 0 && r.bottom < innerHeight;
        }),
        wordsInside: [...document.querySelectorAll('.callout')].every((n) => {
          const r = box(n);
          return r.left >= 0 && r.right <= innerWidth;
        }),
        step: document.querySelector('[data-part="stepName"]').textContent,
      };
    });

  // The triangle draws itself only once the boot overlay lifts, and software
  // GL can hold the boot well past its cap.
  await page
    .waitForFunction(() => document.getElementById('boot')?.hasAttribute('data-done') ?? true, { timeout: 15000 })
    .catch(() => {});
  await settle(2000);
  const start = await state();
  await scrub(RANGE.annotate[1]);
  const notes = await state();
  await page.screenshot({ path: `${OUT}/opening-notes.png` });
  // Past the pinned track and a screen and a half beyond: a trace at the edge.
  // The hero alone ends before that (see "hero only").
  let beyond = null;
  if (!heroOnly) {
    await page.evaluate(() => {
      const el = document.getElementById('top');
      scrollTo({ top: el.offsetTop + el.offsetHeight + innerHeight * 0.7, behavior: 'instant' });
    });
    await settle(2600);
    beyond = await state();
  }
  await scrub(0);
  const back = await state();
  results.push({
    test: 'opening',
    start: { canvas: start.canvas, triangle: start.triangle, step: start.step },
    notes: { canvas: notes.canvas, sketch: notes.sketch, callouts: notes.callouts, leaders: notes.leaders, anchorsOnScreen: notes.anchorsOnScreen, wordsInside: notes.wordsInside, step: notes.step },
    beyond: beyond && { canvas: beyond.canvas },
    backToStart: { canvas: back.canvas, sketch: back.sketch, step: back.step },
  });

  // Same on a phone: every word has to fit.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'load' });
  await settle(3200);
  await scrub(RANGE.annotate[1]);
  const phone = await state();
  await page.screenshot({ path: `${OUT}/opening-notes-mobile.png` });
  results.push({ test: 'opening mobile', callouts: phone.callouts, anchorsOnScreen: phone.anchorsOnScreen, wordsInside: phone.wordsInside });
  await page.close();
}

/* ---- 3c. Write-on ---------------------------------------------------------
   Scrolled through, every block must end fully written, and the copy screen
   readers get must be the same text as the one on screen. */
{
  const page = await open({ width: 1440, height: 900 });
  for (const sel of heroOnly ? ['.intro'] : ['.intro', '#approche', '#principes']) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView(), sel);
    await settle(1200);
  }
  // Blocks queue within a section, so the last one can take a few seconds.
  await page
    .waitForFunction(() => [...document.querySelectorAll('.wo')].every((b) => b.hasAttribute('data-done')), { timeout: 20000 })
    .catch(() => {});
  await settle(300);
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.wo')].map((b) => {
      const chars = [...b.querySelectorAll('.wo__c')];
      return {
        done: b.hasAttribute('data-done'),
        hidden: chars.filter((c) => getComputedStyle(c).color === 'rgba(0, 0, 0, 0)').length,
        same: b.querySelector('.sr-only').textContent === chars.map((c) => c.textContent).join(''),
      };
    }),
  );
  results.push({
    test: 'write-on',
    blocks: blocks.length,
    allWritten: blocks.every((b) => b.done && b.hidden === 0),
    readerCopyMatches: blocks.every((b) => b.same),
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
