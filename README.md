# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Alfonova-Node/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Alfonova-Node/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style cover art: multi-panel posters, bold lettering, and a Vice City sunset or neon colour grade, exported as a PNG to share.

## How it works

1. **Photos** — upload your own photos (or try the two built-in samples). Click a panel in the preview to select it, drag to reposition the photo, scroll to zoom, or fill every panel with one photo.
2. **Layout & grade** — five layouts (Hero + three, four-panel grid, full bleed, nine-panel grid, tilted snapshots) and four grades (Sunset, Neon night, Vice teal-pink, high-contrast B&W), each grade a true per-pixel gradient map over the photo.
3. **Lettering** — an editable bold title (Anton) and script subtitle (Pacifico), with size and top/bottom position controls.
4. **Export** — one click exports a PNG in 1080 x 1080, 1080 x 1350, or 1920 x 1080, or downloads all three at once.

Everything runs locally in desktop Chrome: the app is static files under `app/` with no build step and no network requests. Photos never leave your machine. Fonts are Anton, Bebas Neue, and Pacifico under the SIL Open Font License (licence texts beside them in `app/fonts/`). No Rockstar logo, artwork, character, or font is used.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Entry

Built for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) (`gta6-cover-art-01`). `main.ts` hands the app in with the kit's `vendor/makefun-app.ts`.
