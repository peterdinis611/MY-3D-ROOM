# Desk study (Three.js)

Interaktívna izba – Aperture and air demo v jednom projekte.

## Štruktúra

| Súbor / priečinok | Účel |
|-------------------|------|
| `index.html` | HTML shell, UI, dialógy, import map |
| `css/app.css` | Všetky štýly |
| `src/main.js` | Vstupný bod – načíta Three.js a spustí logiku |
| `src/app.js` | **Hlavný zdroják** – celá aplikácia (na úpravy) |
| `src/chunks/*.js` | Logické bloky odvodené z `app.js` (generované) |

## Spustenie

Vyžaduje HTTP server (kvôli ES modulom a import map):

```bash
cd "/cesta/k/three.js"
python3 -m http.server 8765
```

Potom otvor [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

## Úpravy kódu

1. Upravuj **`src/app.js`** – jeden súbor so všetkými `/* 01-… */` sekciami.
2. Ak chceš mať rozdelené súbory v `src/chunks/`, spusti:

```bash
node scripts/split-chunks.mjs
```

Prehliadač načítava `src/main.js`, ktorý zreťazí chunky v rovnakom poradí ako pôvodný skript.

## Poznámky

- Three.js ide z CDN cez `importmap` v `index.html`.
- Nastavenia a poznámky sa ukladajú do `localStorage`.