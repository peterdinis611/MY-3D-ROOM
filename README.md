# Desk study (Three.js + Vite + TypeScript)

Interaktívna izba – Aperture and air.

## Štruktúra

| Súbor / priečinok | Účel |
| ----------------- | ---- |
| `index.html` | HTML shell, UI, dialógy |
| `css/app.css` | Štýly |
| `src/main.ts` | Vite vstup |
| `src/app.ts` | **Hlavný zdroják** scény (+ extras) |
| `src/dom.ts` | Typed DOM helpery |
| `src/chunks/` | Voliteľné logické bloky (`npm run split`) |
| `tsconfig.json` | TypeScript |
| `vite.config.ts` | Vite |

## Spustenie

```bash
npm install
npm run dev
```

Otvorí sa [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## TypeScript

```bash
npm run typecheck   # tsc --noEmit
```

`src/app.ts` má zatiaľ `// @ts-nocheck` (veľký legacy modul). Nový kód dávaj do malých typed súborov (`dom.ts`, …) a postupne odřezávaj časti z `app.ts`.

## Formátovanie (Biome)

```bash
npm run format
npm run lint
npm run check
```

## Build

```bash
npm run build    # tsc + vite → dist/
npm run preview
```

## Úpravy

Upravuj **`src/app.ts`**. Vite HMR obnoví stránku po uložení.

```bash
npm run split    # voliteľné chunky len na čítanie
```
