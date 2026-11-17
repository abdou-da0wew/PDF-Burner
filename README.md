# Ember / PDF

A browser-local PDF scorching tool built with SolidJS, Vite, and a small Bun static server. The interface uses Solid-native, shadcn-style Button/Card primitives and a trimmed local Phosphor icon font. It auto-detects English or Arabic, includes a language switch, and uses locally hosted Sono, Alumni Sans Collegiate One, and Firjar fonts. Scorch patterns vary by document and page while preserving a coherent singed-edge look. Burnt PDFs can be downloaded from a dedicated button. Nothing is uploaded; output pages are rasterized, so selectable text, forms, links, and source metadata are not preserved.

## Run it

- Install dependencies: `bun install` (or `npm install`)
- Frontend development: `bun run dev` (or `npm run dev`)
- Production build: `bun run build` (or `npm run build`)
- Serve production output: `bun run start`

## Code quality

- `bun run format` — Prettier formatting (authoritative formatter)
- `bun run format:check` — verify formatting
- `bun run lint` — Oxlint and Biome lint passes
- `bun run check` — TypeScript check for frontend source
- `bun run test` — DOM-flow and multi-page PDF pipeline tests

The UI is split into small source files; keep all tracked source/config files below 300 lines. Turbo task configuration is provided in `turbo.json`.
