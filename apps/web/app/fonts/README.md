# Bundled fonts

Self-hosted **IBM Plex Sans** and **IBM Plex Mono** (latin subset, `.woff2`),
consumed via `next/font/local` in `app/layout.tsx`.

- **Source:** the `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono`
  distributions (upstream: https://github.com/IBM/plex).
- **License:** SIL Open Font License 1.1 (OFL) — free to bundle and self-host.
  Full text: https://github.com/IBM/plex/blob/master/LICENSE.txt
- **Weights:** Sans 400/500/600/700, Mono 400/500/600.

Why local: `next/font/google` fetches fonts from Google Fonts **at build time**,
which intermittently failed Vercel production deploys on a network blip. Bundling
the files makes builds deterministic and offline-safe with no visual change.
