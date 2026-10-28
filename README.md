# No Empty Tree

Families share their holiday wish lists; donors adopt single gifts or whole lists. A
React + TypeScript single-page app (Vite, React Router, Tailwind CSS) backed by Supabase.
See [docs/APPLICATION_OVERVIEW.md](docs/APPLICATION_OVERVIEW.md) for how it fits together.

## Development

```bash
npm install
```

```bash
npm run dev
```

The dev server runs at `http://localhost:4200/` and reloads as you edit files under `src/`.

## Checks

```bash
npm run typecheck
```

```bash
npm test
```

## Building

```bash
npm run build
```

The production build goes to `dist/`, which Vercel serves (see `vercel.json`).
`npm run preview` serves that build locally.
