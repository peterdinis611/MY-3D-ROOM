# Desk study (Three.js + Vite)

Interaktívna izba – Aperture and air.

## Štruktúra

| Súbor / priečinok | Účel                                      |
| ----------------- | ----------------------------------------- |
| `index.html`      | HTML shell, UI, dialógy                   |
| `css/app.css`     | Štýly                                     |
| `src/main.js`     | Vite vstup – Three.js + spustenie app     |
| `src/app.js`      | **Hlavný zdroják** (úpravy sem)           |
| `src/chunks/`     | Voliteľné logické bloky (`npm run split`) |
| `vite.config.js`  | Konfigurácia Vite                         |

## Spustenie

```bash
npm install
npm run dev
```

Otvorí sa [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## Formátovanie (Biome)

```bash
npm run format   # formátovanie
npm run lint     # lint
npm run check    # format + lint + safe fixes
```

Konfigurácia: `biome.json` (2 medzery, single quotes). Generované `src/chunks/` sú vylúčené.

## Build

```bash
npm run build    # výstup do dist/
npm run preview  # náhľad produkčného buildu
```

## Úpravy

Upravuj **`src/app.js`**. Vite má HMR – po uložení sa stránka obnoví.

Voliteľne rozdeliť na chunky na čítanie:

```bash
npm run split
```

## Poznámky

- Three.js je npm závislosť (`three@0.160`).
- Nastavenia a poznámky idú do `localStorage`.
