# Belhous — Portfolio

Next.js 16 (App Router) · React 19 · Three.js · Lenis. Both routes prerender as static pages and deploy to Vercel with no configuration.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

> **Building locally on this machine?** See [Local environment](#local-environment) — the shell inherits variables that break `next build` with `generate is not a function`.

---

## Art direction

Inspired by [Post Minimal](https://www.postminimal.agency/). What was taken from it, and what was not:

| Taken | How it shows up here |
|---|---|
| The position leads, the name follows | No name in the hero. It appears in the bar next to the mark and in the footer byline. |
| One idea per screen | The hero says one sentence; the argument behind it gets its own screen (*Approche*), the mantra another. Four projects get a screen and a visual each; three more share a short list. |
| The chapter counter | Each section's number rides the bottom-left of the viewport while you read it — a sticky heading in a left rail, so it never sits on the content. |
| Monochrome | No accent colour. The only chromatic event is the metal in the 3D scene reflecting its environment. |
| Stacked mantra, formula triad | Four words stacked one per line, and three relations set as formulas — a name, then the two terms that make it — the pipeline stated as maths. |
| A text version | [`/text`](app/text/page.js) carries every detail in full. The main page can stay short *because* recruiters have somewhere to read everything. |

Not taken: their copy, their accent colour, the sound toggle and the timer.

## The mark

A parallelogram cut along its short diagonal into two triangles that share an edge: the left one hollow (two bars, the structure as it is drawn before it is computed), the right one solid (the part as it is rendered). Calculation on one side, image on the other, one object holding both — the site's argument, in one shape. An engineer reads a plate with a lightening pocket; a 3D artist reads a quad triangulated, one face in wireframe.

It is a construction, not a drawing: four corners and one bar width in [`lib/mark.js`](lib/mark.js), from which the pocket is computed. It renders four ways: inline SVG ([`components/Mark.jsx`](components/Mark.jsx)), the extruded plate in the hero ([`lib/markGeometry.js`](lib/markGeometry.js)), and every raster icon plus the OG card ([`scripts/generate-assets.mjs`](scripts/generate-assets.mjs)). Change a corner and every surface follows. The bar width (8 on a 100 field) was tested against a 16 px raster: at 7 the bars break up, at 9 the pocket reads as a centred Δ rather than the hollow half.

## System

All decisions live in [`styles/tokens.css`](styles/tokens.css).

- **Colour** — two neutrals and four greys. `--ink-4` is for rules and marks **only, never text**: it measures 1.7:1 on the background. `--ink-3` (3.0:1) is the floor for anything read.
- **Type** — Space Grotesk, one family for everything. Labels are the same face, smaller and in `--ink-3`: sentence case, no tracking, no second family. Loaded through `next/font/google`, which downloads it at build time and serves it from the site, so there is no request to Google at runtime and no layout shift. Few sizes, far apart: each screen carries one idea, set large, and everything around it small.
- **Structure** — radius 0 everywhere; the mark is straight edges only and the interface keeps that promise. On screens wider than 1000 px, sections are a two-column grid: an 11rem rail for the section number, the content beside it.
- **Motion** — two easing curves, four durations. Statements write themselves on as they scroll into view ([`components/WriteOn.jsx`](components/WriteOn.jsx)): characters appear in order behind a caret that holds at punctuation, blocks in a section type one after another, and the last one leaves the caret blinking a moment. Every character's timing is set at render, so once a block is switched on the effect is pure CSS. Screen readers get each sentence whole; with reduced motion or without script the text is simply there.

Light mode is an inversion of the same system, not a second design.

## Architecture

```
app/layout.js         fonts, metadata, pre-paint theme script, JSON-LD
app/page.js           server component: composes the page
app/text/page.js      the full site as text — no client components
components/Runtime    rAF loop, boot, cursor, scene
components/Scene      three.js, dynamically imported with ssr:false
components/Sequence   the opening: pinned track, sketch, callouts
components/Nav        bar + index overlay + theme toggle
components/Sections   opening, intro, approche, principes, travaux, parcours, contact, closing
lib/content.js        every word on the site
lib/sequence.js       the opening's timeline, framing and shared state
lib/scroll.js         shared rAF bus + Lenis; per-frame state lives outside React
```

Two decisions worth knowing:

- **Per-frame values never touch React state.** Scroll position, pointer and the 3D pose change 60 times a second; routing them through a provider would re-render the tree on every frame. They live in plain objects (`lib/scroll.js`, `lib/sequence.js`), read by one `requestAnimationFrame` loop that Lenis, the cursor, the nav, the opening and the scene all subscribe to. Subscribers take an `order`: progress first, then the 3D pose, then everything pinned to it — so the callouts always read this frame's pose, never the last one.
- **three.js is a separate chunk** fetched after the page is readable. The scene is an enhancement, never a dependency: with no WebGL the opening finishes in 2D (the sketch fills in to the flat mark) and the callouts pin to that instead.

## The opening

The mark is built the way a part is built in CAD, scrubbed by scroll ([`lib/sequence.js`](lib/sequence.js)):

| Beat | What happens |
|---|---|
| Esquisse | The triangle draws itself, apex first, as the boot overlay lifts. As the pen reaches each corner, a word is set down beside it at label size: *Fonction* at the apex, *Forme* and *Précision* under the base. A looping arrow under *Défiler* asks for the first scroll. |
| Profil | The rectangle closes around it in two strokes from its foot; the closed profile is shaded, as CAD shades one that is ready to extrude. |
| Inclinaison | The rectangle leans. A plumb line and a live readout count the angle to 22,4°; the dashed diagonal swings until it lands on the triangle's edge. |
| Extrusion | The 3D plate takes over head-on, exactly on the sketch, then extrudes and turns; the sketch drops back behind it and the floor appears. The words ride the pocket's corners on the solid. |
| Annotation | Each word leaves its corner and grows into a callout pointing back at it — numbered, its leader drawn out of the corner once the word has cleared it — pinned to the moving part, not to the screen. |

**The triangle never changes.** The pocket already has its final shape, so the frame is what adapts: the upright rectangle on the same base leans until its left edge runs parallel to the triangle and its diagonal falls on the triangle's edge. That is the thread the rest of the page can pick up.

**Layers.** The track is `SEQ_SCREENS + 1` screens tall with two pinned layers: the sketch paints *under* the WebGL canvas, so the solid covers the drawing it comes out of; the callouts paint *over* it. The track itself sets no z-index, or both layers would be trapped on one side of the canvas. After the last beat the stage unpins and the plate settles beside the statement, then retreats to a trace at the right edge.

**Tuning.** Beat lengths (in screens of scroll) are `BEATS` in `lib/sequence.js`; which corner each word starts at is `CORNER_NOTES`; where the words land around the mark is `NOTE_LAYOUT` (field units, one layout for wide screens and one for phones, clamped so a word never leaves the screen); the words themselves are `sequence` in `lib/content.js`.

| Condition | The opening |
|---|---|
| `prefers-reduced-motion` | One screen, already finished: solid, callouts, no scrubbing. The picture scrolls away with the page as one still image. |
| No WebGL | Sketch as usual; the profile fills in to the flat mark and the callouts pin to it. |
| No JavaScript | One screen: the flat mark, the three words under it. |

## The 3D scene

The mark extruded into a machined plate with a chamfer, the pocket cut clean through so turning it shows the inner walls catching light; the sketch it came from, carried into 3D as a flat outline that drops back behind it and stays square to camera; the true edges drawn over the solid; a derivative-based grid floor. Reflections come from `RoomEnvironment`, a procedural room — zero bytes of HDR.

In the opening the plate is placed from the sketch's own framing, so at the handoff it sits exactly where the drawing was. Beside the statement it is sized as a **share of viewport height** (47% tall on wide screens, 22% on narrow) so it holds the same presence on a phone and an ultrawide. It never turns past ~60° — a thin plate seen edge-on is a grey bar, not the mark — and one screen past the statement it retreats to the right edge at 10% opacity: everything below is type, and none of it should be read against a moving highlight.

| Condition | Behaviour |
|---|---|
| Coarse pointer / ≤ 4 cores | DPR capped at 1.5, no antialias, no chamfer pass |
| `prefers-reduced-motion` | one still frame, redrawn only when the page moves; native scroll, no custom cursor |
| Tab hidden | render skipped |
| No WebGL | chunk work skipped; the opening finishes in 2D |

## Deploying to Vercel

```bash
npx vercel --prod
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — the Next.js preset is detected automatically and **no environment variables are needed**. Security headers are set in [`next.config.mjs`](next.config.mjs).

**Custom domain:** add it under Project → Settings → Domains, change `site.url` in [`lib/content.js`](lib/content.js) (it drives `metadataBase`, canonical URLs and the sitemap), then run `npm run assets`.

## Editing content

Everything is in [`lib/content.js`](lib/content.js). The statement, the argument and the principles (`lead`, `approach`, `mantra`, `triad`) are placeholder lorem ipsum for now, the same length and shape as the final text; `site.role` stays real because the page title and the JSON-LD read it. The OG card shows only the mark and `site.name`, so `npm run assets` is safe to run at any time.

Projects carry two descriptions: `line` (one sentence, main page) and `long` (full detail, `/text`). Keep `line` to one idea — if it needs a second clause, it belongs in `long`. French typography: put a no-break space (` `) before `:` and inside `« »`, or the punctuation can wrap onto a line of its own.

### Project visuals

`featured: true` gives a project a full screen with a visual; the others go in the short list below. Until a project has an image, its slot shows a drawing-sheet placeholder (plate number and title block), which is designed to stand on its own. To add a render:

1. Put the file in `public/work/` — a 16:10 still (JPG or WebP, ~2400 px wide), optionally an `.mp4` loop.
2. Set the fields on the project:

```js
image: '/work/prothese.jpg',   // served through next/image, resized per device
video: '/work/prothese.mp4',   // optional; plays muted, only while on screen, never with reduced motion
href:  'https://www.behance.net/…', // optional "Voir le projet" link
alt:   'Coupe de l’implant sous charge', // optional; defaults to "name — kicker"
```

```bash
npm run assets   # regenerate icons, OG card, manifest, robots, sitemap
```

Output is committed to `public/` so deployments never need `sharp` or Chrome. The OG card is rendered in the installed Chrome so its text is set in Space Grotesk; without Chrome or network it falls back to `sharp` and system type.

## Local environment

The shell this project was built in inherits the environment of an unrelated Next.js standalone server, including `NODE_ENV=production` and `__NEXT_PRIVATE_STANDALONE_CONFIG`. When that last variable is set, Next skips `next.config.mjs` and uses the other app's serialised config — which has no functions, hence:

```
TypeError: generate is not a function
```

It does not affect Vercel, and probably not a normal terminal. If you see it:

```bash
env -u __NEXT_PRIVATE_STANDALONE_CONFIG -u NODE_ENV npx next build
```

`NODE_ENV=production` also makes a plain `npm install` silently skip devDependencies; use `npm install --include=dev`.

### Visual checks

`scripts/shoot.mjs` and `scripts/check.mjs` drive your installed Chrome over CDP. `shoot` captures every beat of the opening and every section at desktop and mobile widths; `check` exercises theme, index overlay, reduced motion, keyboard access and `/text`, and scrubs the opening to assert that the callouts land on screen, the words fit on a phone and the plate retreats to its trace. Run them against `npm start`:

```bash
node scripts/shoot.mjs ./shots http://localhost:3000/
node scripts/check.mjs ./shots http://localhost:3000/
```

## Known gaps

Tracked in [TODO.md](TODO.md), with what changed in [CHANGELOG.md](CHANGELOG.md).
