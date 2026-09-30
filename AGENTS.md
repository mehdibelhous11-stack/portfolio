<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Working on this repo

- **Where.** The repo is this folder. Sessions sometimes open in its parent (`Desktop/portfolio`), which is not a repo: run git and npm here.
- **Deploy.** `main` is what Vercel deploys. Commit messages take a `feat:` or `chore:` prefix.
- **Content.** Every word is in `lib/content.js`; placeholder copy is lorem ipsum of the final length. When asked to remove text from the site, replace it with placeholder text and keep the section. The contact details are placeholders on purpose: ask before putting real ones in.
- **Check visual changes in a real browser, on a production build:**

  ```bash
  npm run build && npx next start -p 4173
  node scripts/shoot.mjs <outDir>   # screenshots of every beat and section
  node scripts/check.mjs <outDir>   # interaction checks; must stay green
  ```

  Both scripts default to `http://localhost:4173/`. Locally, the only expected console errors are 404s for `/_vercel/insights/script.js`: Analytics exists only on Vercel.
- **Port 4173.** Stopping the shell that ran `next start` can leave the server running. If the port is taken, stop the process listening on it first, or the old server keeps answering with stale files.
- **Assets.** `npm run assets` rewrites every file in `public/`. Commit only the files you meant to change.
- **Docs.** Log changes in `CHANGELOG.md`; keep `TODO.md` current.
