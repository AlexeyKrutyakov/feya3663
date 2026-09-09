# @feya/web

Next.js 15 (App Router, src dir, Tailwind v4) front-end of the Feya dental app.

- `pnpm --filter @feya/web dev` — dev server on <http://localhost:3000>
- `NEXT_PUBLIC_API_URL` — base URL of `@feya/api` (default `http://localhost:3001`)
- `next.config.ts` uses `output: 'standalone'`; see `Dockerfile` for the container build.

Home page is currently a stub — the 3D fairy scene is specified in
`docs/12-home-3d-scene.md` and will replace it.
