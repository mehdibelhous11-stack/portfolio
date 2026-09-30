# To do

What comes next, and what is still open. At the end of a session, tick what is done and move it to [CHANGELOG.md](CHANGELOG.md).

## Next sessions

### 1. The interactive experience

**Now:** the opening is the only piece driven by scroll: sketch, profile, lean, extrusion, annotation (`lib/sequence.js`, `components/Sequence.jsx`, `components/Scene.jsx`). After it, the 3D plate settles beside the statement, then retreats to a faint trace at the right edge. Everything below is type revealed on scroll.

- [ ] Decide what the mark does once the opening is over: stay in the background as the trace, or take part in the sections below.
- [ ] Decide where the next interactive moment is. The projects are the natural place (see 3).

### 2. Skills

**Now:** `tools` in `lib/content.js`, shown as one run of 17 names under “Outils” in Parcours, with no grouping. Each project also lists its own `stack`.

- [ ] Decide what the section should say beyond a list. Directions to weigh, none decided:
  - group the tools under the three words, Forme / Fonction / Précision;
  - link each tool to the projects that use it (the `stack` fields already hold that link);
  - set them as a technical-sheet table, like the projects.

### 3. Projects

**Now:** each of the four `featured` projects gets a screen. A visual on one side: a render, a loop, or, until one exists, a drawing sheet with its title block (Planche, Pièce, Outils). The text on the other: number, kicker, name, one line, stack, optional link. Three more projects share the “Autres travaux” list, and `/text` carries the long descriptions.

- Keep the technical-sheet style.
- [ ] Design a seamless interaction with the logo (still being thought about). Directions to weigh, none decided:
  - the plate that retreats to the right edge follows the reader into Travaux and becomes each sheet's mark, turning or cutting its pocket as a project comes into view;
  - each project is placed inside the triangle by its balance of Forme, Fonction and Précision, so the opening's three corners become a small diagram on every sheet;
  - each sheet's title block is drawn the way the opening draws the mark: strokes and points first, then the fill.
- [ ] Renders for the four featured projects (`public/work/`, see README → Project visuals).

## Decisions pending

- [ ] Callout numbering: the top callout reads “02 Fonction”, with “01 Forme” at the left. Renumber so Fonction is 01? That also reorders “Forme. Fonction. Précision.” on `/text`.
- [ ] Link-preview title: still “Mehdi Belhous — Designer 3D & ingénieur mécanicien” (`app/layout.js`), while the card shows only the name. Cut the title to the name too?

## Content to write (`lib/content.js`)

- [ ] `lead` (punch, tagline, problem, belief), `approach`, `mantra`, `triad`: lorem ipsum of the final length for now.
- [ ] `closing`: placeholder text.
- [ ] `contact`: the email and phone are placeholders, repeated in the JSON-LD in `app/layout.js`. Behance and YouTube point at bare domains.

## Site

- [ ] Confirm the Vercel project is connected to this repo and deploys on push to `main`.
- [ ] Confirm `site.url` (`https://mehdibelhous.com`) is the live domain. The canonical URLs, the sitemap and the OG image URL all come from it; if it isn't live, link previews have no image.

## Tooling

- [ ] No linter since `next lint` went away. If wanted: ESLint with a flat config (plus `eslint-plugin-react`, or components used only in JSX are reported as unused), or Biome.
- [ ] Node prints `MODULE_TYPELESS_PACKAGE_JSON` whenever a script imports `lib/*.js`. Adding `"type": "module"` to `package.json` would silence it; rerun the build and every script after.
