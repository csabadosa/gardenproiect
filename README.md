# Garden Proiect — Catalog 2026 (web version)

A web recreation of the Garden Proiect 2026 catalog. The look, products, photos
and text are copied from the PDF catalog. **Prices are read live from an Excel
file** — edit `prices.xlsx`, save, and the website updates on its own within a
few seconds (no rebuild, no code changes).

## Run it

```bash
npm run dev
```

Then open <http://localhost:3000>.

### Opening it from another device on your Wi-Fi

The dev server also serves on your laptop's LAN IP, so you can open it from a
phone/tablet/other computer on the same network at `http://<your-laptop-ip>:3000`
(e.g. `http://192.168.0.42:3000`). Find your IP with `ipconfig getifaddr en0`.

Next.js blocks cross-origin dev requests unless the IP's subnet is listed in
`allowedDevOrigins` in `next.config.ts`. Common home/hotspot ranges are already
included; if your network uses a different range, add it there (e.g.
`"192.168.2.*"`) and restart `npm run dev`.

## How the live prices work

```
prices.xlsx  ──read──►  /api/prices (server)  ──poll every 5s──►  the web page
   ▲ you edit this
```

1. `prices.xlsx` (in this folder) holds one row per price.
2. The server reads that file fresh on every request — nothing is cached.
3. The page asks the server for prices every 5 seconds and updates the numbers
   in place (a brief highlight shows what changed). The little badge at the top
   shows the file's last-saved time.

### Editing a price

1. Open **`prices.xlsx`** in Excel (or Numbers / Google Sheets — keep it `.xlsx`).
2. Change a value in the **`Price (lei)`** column.
3. **Save** the file.
4. Within ~5 seconds the website shows the new price. (If the page was open the
   whole time, you don't even need to refresh.)

Columns:

| Column           | Meaning                                                        |
| ---------------- | ------------------------------------------------------------- |
| ID (do not edit) | Links the row to the product + its photo. Leave it alone.     |
| Product          | Human-readable name (for your reference).                     |
| Variant / Size   | For products sold in sizes (e.g. the Flower Box).             |
| **Price (lei)**  | **The number you edit.** Leave blank for "request a quote".   |
| Unit             | Optional suffix, e.g. `lei/m` for the fence.                  |
| Note             | Shown instead of a price when Price is blank.                 |

> Tip: while Excel has the file open with unsaved changes, the page keeps showing
> the last saved values. It updates the moment you save.

## Languages

Three flag buttons in the navbar switch the whole page between **Română (RO)**,
**English (EN)** and **Magyar (HU)** — product names, descriptions, section
titles and all interface text. The choice is remembered per browser
(`localStorage`). The default on first visit is **Romanian**; change
`DEFAULT_LANG` in `lib/i18n.mjs` to pick another.

- Translations live in `languages/ro.json`, `languages/en.json`, `languages/hu.json`
  (`benches` = product names + codes, plus `ui` / `sections` / `descriptions` / `dims`).
- `lib/i18n.mjs` maps each product ID to its entry in those files.
- Prices are **not** translated — they come from `prices.xlsx` and are shown the
  same in every language.

Note: `prices.xlsx` uses Hungarian product labels so colleagues can read it; this
is cosmetic and independent of the website language.

## Regenerating the price sheet

`prices.xlsx` was generated from the catalog's original prices. If you ever want
to rebuild it from scratch (this **discards** your edits):

```bash
node scripts/gen-prices.mjs --force
```

Without `--force` the script refuses to overwrite an existing file.

## Where things live

- `prices.xlsx` — the prices you edit.
- `lib/catalog.mjs` — product names, codes, descriptions, photos, sizes (and the
  starting/fallback prices).
- `lib/prices.js` — reads `prices.xlsx`.
- `app/api/prices/route.ts` — serves the prices to the page.
- `app/page.tsx` — the catalog page.
- `components/prices-context.tsx` — the live-polling + price display.
- `public/products/` — one photo per product; `public/gallery/` — realizations.
