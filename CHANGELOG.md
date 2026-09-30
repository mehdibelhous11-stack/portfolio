# Changelog

Notable changes to the site, newest first. A date is the day the change reached `main`, which Vercel deploys. The commit history has the detail.

## 2026-09-30

### Opening
- The three callout words are written at the triangle's corners while it draws: **Fonction** at the apex, **Forme** at the bottom-left corner, **Précision** at the foot. They are set at label size, and each appears as the pen reaches its corner.
- The words ride their corners through the profile, the lean and the extrusion. In the annotation beat each one leaves its corner and grows into its callout: full size, numbered.
- Each callout points back at its corner. Before, they pointed at the solid half, the bar and the shared edge. The word travels first; its leader is drawn out of the corner once the word has cleared it. Without WebGL the leaders pin to the corners of the flat mark.
- The “Défiler” hint is brighter and has a looping arrow under it.

### Content
- Personal email and phone replaced with placeholders (`contact@example.com`, `+33 0 00 00 00 00`), in the contact section and in the JSON-LD.
- Closing statement replaced with placeholder text (“Lorem ipsum. / Dolor sit amet.”). The section stays.

### Social preview
- The OG card shows only the mark and the name. Its URL is versioned (`/og.png?v=2`) so link previews fetch the new card instead of a cached one.

### Cleanup
- Removed an unused re-export from `components/Runtime.jsx`, an export nothing imported from `components/WriteOn.jsx`, and four design tokens nothing read (`--void-2`, `--radius`, `--col`, `--z-behind`).
- Removed the `lint` script: `next lint` no longer exists in Next.js 16.

## 2026-09-24 → 2026-09-29

From the commit history, before this log existed:

- **09-29** Vercel Analytics.
- **09-28** The opening sequence (sketch, profile, lean, extrusion, annotation); text that writes itself on as it scrolls into view; `AGENTS.md` with the Next.js agent rules.
- **09-27** Rebuilt in Next.js 16 with the 3D scene, `lib/content.js` and the visual check scripts. Unused CSS and JS removed.
- **09-24** First version in static HTML, CSS and JS, then split into data-driven sections.
