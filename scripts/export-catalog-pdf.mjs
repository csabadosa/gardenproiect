// ---------------------------------------------------------------------------
// export-catalog-pdf.mjs — Garden Proiect printable catalog exporter (ENGLISH)
//
// Produces a polished, standalone A4 catalog PDF from the live web app:
//   • Page 1  : self-contained COVER (brand wordmark, "CATALOG 2026", lead
//               paragraph, contact chips, cover photo, VAT note).
//   • Page 2+ : all product sections exactly as the site renders them
//               (matted photos, cream background, live prices).
//   • Last    : a "Contents" page listing every section with the real page
//               number where it starts (leader dots), computed with a
//               two-pass render + pdftotext page scan.
//
// The navbar, language flags, live-price badge, warranty band, reference
// gallery and site footer are all hidden — only the VAT line is folded onto
// the cover so no important info is dropped.
//
// HOW TO RUN
//   1. Start the dev server (in another terminal):
//        cd <repo> && npm run dev          # serves http://localhost:3000
//   2. Run this script:
//        node scripts/export-catalog-pdf.mjs
//      By default it exports ALL languages (EN, RO, HU) in one run.
//      Optional env vars:
//        CATALOG_LANG=hu                   # export only Hungarian
//        CATALOG_LANG=en,hu                # export a subset (comma list)
//        BASE_URL=http://localhost:3001    # if dev runs on another port
//        OUT=/path/to/output.pdf           # override path (single language only)
//
// Requirements: Playwright (devDependency), poppler `pdftotext`, and
// Ghostscript `gs` (for final compression; skipped with a warning if absent).
// ---------------------------------------------------------------------------

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, statSync, renameSync, rmSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// Language labels. Product names, descriptions, codes, section titles and the
// cover text all render from the app in the chosen language automatically; only
// the injected TOC labels + the mount-check section title are localized here.
const LABELS = {
  en: { contents: "Contents", kicker: "Garden Proiect · Catalog 2026", confirm: "Benches & Seating" },
  ro: { contents: "Cuprins",  kicker: "Garden Proiect · Catalog 2026", confirm: "Bănci și șezut" },
  hu: { contents: "Tartalom", kicker: "Garden Proiect · Catalog 2026", confirm: "Padok és ülőhelyek" },
};

// Which languages to export. By default all three (EN, RO, HU) are generated in
// a single run; set CATALOG_LANG (a single code or a comma list, e.g. "hu" or
// "en,hu") to restrict the run to specific languages.
const LANGS = (process.env.CATALOG_LANG || "en,ro,hu")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s in LABELS);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
// Per-language output paths. OUT overrides the path ONLY when a single language
// is exported (it makes no sense to point every language at the same file).
const outPath = (lang) =>
  LANGS.length === 1 && process.env.OUT
    ? process.env.OUT
    : resolve(REPO, `Garden-Proiect-Catalog-2026-${lang.toUpperCase()}.pdf`);
const rawPath = (lang) => resolve(REPO, `.catalog-raw-${lang}.pdf`); // uncompressed intermediate

// ---- Advertisement / filler boxes -----------------------------------------
// Weave promo boxes into the product grid to use up half-empty rows. Each box
// is dropped in RIGHT AFTER the product whose id is `afterId`, and spans `span`
// grid columns (1–3). It flows with the grid, so it lands wherever that product
// lands (no fragile page numbers). Set ADS = [] to remove them all.
//
// The copy is LOCALIZED: each ad carries a `text` map keyed by language code
// (en/ro/hu), each holding a `{ tag, hint }` pair. At export time adHtml()
// picks the row matching the catalog's language (falling back to EN, then to
// whatever is defined) and wraps it in the .ad-inner / .ad-tag / .ad-hint box —
// so the Romanian catalog gets Romanian promos, the Hungarian one Hungarian,
// etc. For a box with fully custom markup, set `html` instead of `text` and it
// is used verbatim in every language.
//
//   Product ids live in lib/catalog.mjs (e.g. "waste-basket-2490" = MB01).
//   The default box fills the two empty cells beside the lone waste basket on
//   the Waste Baskets page.
const ADS = [
  {
    // Full-size image filler under the waste baskets — fills the blank space at
    // the bottom of the Waste Baskets page (language-independent, so `html`).
    afterId: "waste-basket-2490",
    span: 2,
    html: `<div class="ad-imgwrap"><img class="ad-img" src="/gallery/flowergarden.jpg" alt="" style="height:88mm" /></div>`,
  },
  {
    // Sits right after the Octagonal Pavilion (the last product of Shelters &
    // Structures), so it also nudges the following "Fencing & Signage" section
    // onto page 11. Replace this copy with the real promo when it's ready.
    afterId: "octagonal-pavilion",
    span: 2,
    html: `<div class="ad-imgwrap"><img class="ad-img" src="/gallery/garden.jpg" alt="" style="height:82mm" /></div>`,
  },
  {
    // Follows the Solid Wood Bell — the LAST product in the catalog — so this
    // closing promo sits at the bottom of the final product page (page 18, just
    // before the Contents page). Swap in the real copy when it's ready.
    afterId: "solid-wood-bell",
    span: 2,
    html: `<div class="ad-imgwrap"><img class="ad-img" src="/gallery/flowers.jpeg" alt="" style="height:82mm" /></div>`,
  },
];

// Resolve one ad's markup for a given language. A box with a literal `html`
// wins (used verbatim); otherwise the `text` row for `lang` is used, falling
// back to English and then to any defined language so a box never renders empty.
function adHtml(ad, lang) {
  if (ad.html) return ad.html;
  const t = ad.text?.[lang] || ad.text?.en || Object.values(ad.text || {})[0] || {};
  return `
      <div class="ad-inner">
        <div class="ad-tag">${t.tag || ""}</div>
        <div class="ad-hint">${t.hint || ""}</div>
      </div>`;
}

// Build the ADS array for one language: same placement (afterId/span), copy
// resolved to `lang`. Passed to buildCatalogDom, which only reads `html`.
const localizedAds = (lang) =>
  ADS.map((ad) => ({ afterId: ad.afterId, span: ad.span, html: adHtml(ad, lang) }));

// ---- Export-only CSS injected on top of the app's @media print rules -------
const EXPORT_CSS = `
  /* Hide all on-screen / non-catalog chrome */
  .topbar, .footer, .terms, .section:has(.gallery) { display: none !important; }

  html, body { background: var(--cream) !important; }

  /* ---- Full-bleed cream + per-page cream breathing room ------------------
     The app ships @page{margin:12mm}, and Chromium renders a paged-media
     margin as bare WHITE paper (the root cream background is NOT propagated
     into the margin band). We therefore drop the paper margin to 0 so the
     cream html/body background bleeds edge-to-edge on every sheet (no white
     anywhere), and instead create the top/bottom cream gap with a repeating
     table header/footer: a <thead>/<tfoot> spacer is re-drawn by the print
     engine at the top and bottom of EVERY page the product table spans, and
     — unlike a CSS margin — it reserves real cream space that pushes the
     first card row down even on pages that begin mid-grid.

     EXCEPTION — a 12mm BOTTOM margin is reserved for the print footer (the
     green "ground" mound + centred page number), which Chromium paints on every
     sheet via the footerTemplate in renderPdf(). The footer template fills that
     band edge-to-edge with the cream colour first, so no white shows; the left,
     right and top edges still bleed full. */
  @page { margin: 0 0 12mm 0 !important; size: A4; }

  /* The green footer band (mound + page number) is painted on EVERY page by
     Chromium — it cannot be suppressed per-page from CSS. So the two COVERS (the
     first sheet .hero and the last sheet .closing-page) get their page number
     dropped a different way: the final PDF is rendered in three page ranges and
     the covers use a mound-only footer (no number), while pages 2…N-1 use the
     numbered footer — see renderPdfFinal(). The covers still show the mound. */

  /* All product cards live in this ONE table at export time (see the DOM notes
     in buildCatalogDom). A single table — never a table nested in another
     table's cell — is essential: a nested fixed-layout table has its column
     widths silently broken by the outer cell and collapses to a sliver. Its
     three equal columns come from the <colgroup>; its <thead>/<tfoot> spacers
     repeat at the top and bottom of every printed page to reserve a cream band. */
  table.pageframe { width: 100% !important; table-layout: fixed !important;
                    border-collapse: collapse !important; background: var(--cream) !important; }
  table.pageframe > thead > tr > td,
  table.pageframe > tfoot > tr > td { padding: 0 !important; border: 0 !important;
                                      background: var(--cream) !important; }
  /* The reserved cream band at the very top and bottom of each printed page.
     Kept small (4mm) so more of each sheet is usable for cards. */
  table.pageframe .pf-spacer { height: 4mm; }

  /* -------- COVER (page 1) -------- */
  /* Force the two-column cover layout: at A4 print width (~794px) the app's
     responsive @media(max-width:960px) rule would otherwise collapse the hero
     to one column and spill it onto a second page. */
  .hero { break-after: page !important; break-inside: avoid !important;
          background: linear-gradient(180deg, var(--cream), var(--cream-2)) !important; }
  .hero-grid { grid-template-columns: 1.05fr 0.95fr !important;
               padding: 24px 0 20px !important; gap: 34px !important;
               align-items: center !important; min-height: 226mm; align-content: center; }
  .hero-media { max-width: none !important; }
  .hero .wrap { padding-left: 16mm !important; padding-right: 12mm !important; }
  .hero-title { font-size: 60px !important; }
  .hero-lead { font-size: 16px !important; max-width: 460px !important; }
  .hero-media .frame { box-shadow: none !important; aspect-ratio: 3/4 !important;
                       max-height: 150mm !important; margin: 0 auto !important; }

  /* -------- Full-width white header band on the COVERS (front + back) --------
     A long white strip carrying the tree mark + "Garden Proiect" wordmark in
     the brand's dark green (#14683e, the dominant colour sampled from the logo).
     It sits flush to the top of the front cover (page 1) — REPLACING the old
     stacked logo lockup, moved up here — and again, centred, on the closing
     page. box-sizing:border-box so its side padding never overflows. */
  .cover-banner { box-sizing: border-box; width: 100%; background: #fff;
                  display: flex; align-items: center; justify-content: center;
                  gap: 22px; padding: 11mm 16mm; text-align: center;
                  border-bottom: 1px solid rgba(20,104,62,0.18); }
  .cover-banner .cb-mark { height: 22mm; width: auto; display: block; }
  .cover-banner .cb-title { font-family: var(--font-poppins), sans-serif;
                            -webkit-text-stroke: 3px #9fae8a;
                            font-weight: 800; font-size: 56px; line-height: 1;
                            letter-spacing: 0.1em; color: #0c4127; margin: 0; }

  /* Hide the phone / website / Facebook chips on the FRONT cover (page 1). The
     closing page's cloned copy (.closing-contact) lives outside .hero, so it is
     unaffected and still shows the contact details on the back cover. */
  .hero .hero-contact { display: none !important; }

  /* Injected VAT note folded onto the cover */
  .cover-vat { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px;
               font-weight: 700; font-size: 13px; color: var(--green-deep);
               background: rgba(159,174,138,0.22); border: 1px solid rgba(47,107,59,0.22);
               padding: 8px 16px; border-radius: 999px; }

  /* ---- Cards as TABLE ROWS (never a CSS grid) -----------------------------
     Chromium's print engine ignores break-inside:avoid on CSS-grid items and
     happily slices a grid row across a page break — a card's photo/name land on
     one page, its price on the next. Table rows are kept intact reliably, so
     each product is a tr.pf-row with break-inside:avoid: a row that can't fit at
     a page foot moves down whole, never cut. Section headings are a full-width
     tr.pf-head. border-spacing is avoided — with table-layout:fixed it overflows
     the row and collapses the column.

     The table now has ONE full-width column (colgroup, COLS=1): every product
     is its own row, rendered as a horizontal card (big photo left, text right —
     see the one-product-per-row block below), three to an A4 sheet. */
  table.pageframe td { vertical-align: top !important; }
  table.pageframe tr.pf-row { break-inside: avoid !important; }
  table.pageframe tr.pf-row > td { padding: 3mm 0 !important; }
  table.pageframe tr.pf-head { break-inside: avoid !important; break-after: avoid !important; }
  table.pageframe tr.pf-head > td { padding: 6px 5px 5px !important; border: 0 !important; }
  table.pageframe > tbody > tr:first-child.pf-head > td { padding-top: 0 !important; }
  .section-head { margin-bottom: 0 !important; }

  /* ---- One product per full-width row: BIG photo (2/3) + text/price (1/3) --
     The client asked for larger photos, so each product now spans the FULL page
     width as its own table row, laid out HORIZONTALLY: the photo fills the left
     two-thirds at the row's full height, and the name / code / description /
     dimensions / price stack in the right third with the price pinned to the
     bottom (i.e. below the description). The card is a fixed 80mm tall, which
     makes THREE rows fit per A4 sheet EVEN on a page that also carries a section
     heading — heading (~16mm) + 3×(80mm + 6mm gutter) = 274mm stays under the
     285mm of usable height left once the 12mm footer band is reserved, while a
     fourth card cannot — so every page holds three products with no page-break
     fiddling. (Trimmed from 83mm to make room for the page-number footer.) */
  .card { display: flex !important; flex-direction: row !important; align-items: stretch !important;
          height: 80mm !important; width: 100% !important; padding: 0 !important; overflow: hidden !important; }

  /* Left 2/3 — the enlarged product photo, filling the full row height. Its
     4/3 aspect-ratio is dropped so the image fills the wide box; object-fit
     cover keeps it crisp and un-stretched (switch cover to contain if any
     product photo is being cropped in a way that matters). */
  .card-media { flex: 0 0 66.666% !important; width: 66.666% !important; height: 80mm !important;
                aspect-ratio: auto !important; align-self: stretch !important; }
  .card-media img { width: 100% !important; height: 100% !important; object-fit: cover !important; }

  /* Right 1/3 — the text column. A flex column so the price (.card-foot) can be
     pinned to the base with margin-top:auto, sitting under the description. */
  .card-body { flex: 1 1 33.334% !important; width: 33.334% !important; padding: 5mm 5mm 5mm 6mm !important;
               display: flex !important; flex-direction: column !important; overflow: hidden !important; }
  .card-name { font-size: 15px !important; line-height: 1.14 !important; margin: 0 !important; min-height: 0 !important;
               display: -webkit-box !important; -webkit-line-clamp: 2 !important;
               -webkit-box-orient: vertical !important; overflow: hidden !important; }
  .card-code { font-size: 11px !important; margin-top: 2px !important; }
  .card-row { font-size: 12px !important; line-height: 1.36 !important; gap: 8px !important;
              min-height: 0 !important; align-items: flex-start !important; }
  .card-row svg { width: 16px !important; height: 16px !important; flex: none !important; margin-top: 1px !important; }
  .card-row > span { display: -webkit-box !important; -webkit-line-clamp: 6 !important;
                     -webkit-box-orient: vertical !important; overflow: hidden !important; }
  .card-dims { font-size: 11px !important; padding-left: 24px !important; margin-top: 4px !important;
               min-height: 0 !important; overflow: hidden !important; }
  .card-dims svg { width: 14px !important; height: 14px !important; }
  .rule { margin: 6px 0 !important; }
  /* Price pinned to the bottom of the text column (below the description). */
  .card-foot { margin-top: auto !important; }

  /* Every 2nd product mirrors: photo to the RIGHT, text/price to the LEFT. Only
     the row direction flips — the text stays left-aligned and the price stays
     pinned to the bottom. The body's inner gutter is mirrored so the text keeps
     an even margin from the page edge on the flipped side too. */
  .card.card-flip { flex-direction: row-reverse !important; }
  .card.card-flip .card-body { padding: 5mm 6mm 5mm 5mm !important; }

  /* ---- Advertisement / filler boxes (see the ADS config) ------------------
     An ad cell sits in the same grid row as the products, so it's exactly as
     tall as a product card. .ad-inner fills the cell; restyle it (or replace
     the box's html) to taste. */
  /* height:1px on the cell is the Chromium trick that lets the child's
     height:100% resolve to the row's (stretched) height, so the ad box matches
     the product-card height instead of shrinking to its own content. */
  table.pageframe td.ad-box { vertical-align: top !important; height: 1px !important; }
  .ad-inner { height: 100%; box-sizing: border-box;
              border: 1.5px dashed rgba(47,107,59,0.45); border-radius: var(--radius);
              background: rgba(159,174,138,0.12);
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              text-align: center; padding: 8mm; }
  .ad-tag { font-family: var(--font-poppins), sans-serif; font-weight: 700; font-size: 11px;
            letter-spacing: 0.18em; text-transform: uppercase; color: var(--olive); }
  .ad-hint { font-family: var(--font-poppins), sans-serif; font-weight: 600; font-size: 16px;
             color: var(--green-deep); margin-top: 8px; }

  /* ---- Image filler ads (an <img> instead of a text box) -------------------
     Used when an ADS entry sets html to an <img class="ad-img">. Just the image,
     centred on the cream page (no backing panel) — sized by the inline height
     set per ad (e.g. style="height:88mm"), which keeps it from spilling onto the
     next page. No !important on the height here, so the per-ad inline height
     wins. */
  td.ad-box .ad-imgwrap { display: flex; align-items: center; justify-content: center; width: 100%; }
  td.ad-box .ad-img { max-width: 100%; width: auto; display: block; border-radius: 10px; }

  /* -------- Table of Contents (second-to-last page) -------- */
  .toc-page { break-before: page !important; break-inside: avoid !important;
              padding: 30mm 0 0 !important; }
  .toc-page .toc-kicker { color: var(--olive); font-weight: 700; letter-spacing: 0.16em;
                          text-transform: uppercase; font-size: 12px; }
  .toc-page h2 { font-family: var(--font-poppins), sans-serif; font-weight: 800;
                 font-size: 40px; color: var(--green-deep); margin: 6px 0 6px; }
  .toc-page .toc-rule { width: 74px; height: 3px; background: var(--green-deep);
                        border-radius: 2px; margin: 18px 0 30px; }
  .toc-list { list-style: none; margin: 0; padding: 0; }
  .toc-list li { display: flex; align-items: baseline; gap: 8px; padding: 11px 0;
                 border-bottom: 1px solid rgba(47,107,59,0.12); }
  .toc-list .toc-title { font-family: var(--font-poppins), sans-serif; font-weight: 600;
                         font-size: 17px; color: var(--ink); }
  .toc-list .toc-dots { flex: 1; border-bottom: 2px dotted rgba(47,107,59,0.35);
                        transform: translateY(-4px); }
  .toc-list .toc-num { font-family: var(--font-poppins), sans-serif; font-weight: 700;
                       font-size: 17px; color: var(--green); min-width: 28px; text-align: right; }

  /* -------- Closing / back-cover page (the very last sheet) -----------------
     A full A4 cream page: the white header band is anchored at the TOP, a large
     tree mark is centred in the MIDDLE, and the contact chips sit at the BOTTOM
     (just above the decorative mound). This page is a COVER — no page number. */
  /* min-height is the USABLE sheet height (297mm − the 12mm footer band); a full
     297mm here would overflow past the reserved band onto a blank extra page. The
     contact chips are pinned to the bottom of that usable area, just above the
     mound; the mound (no number) is drawn by the plain footer in renderPdfFinal. */
  .closing-page { break-before: page !important; break-inside: avoid !important;
                  position: relative; min-height: 282mm; display: flex;
                  flex-direction: column; align-items: center; justify-content: flex-start; }
  .closing-page .closing-contact { position: absolute; left: 0; right: 0; bottom: 14mm;
                  display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; padding: 0 16mm; }
  .closing-page .closing-mark { position: absolute; top: 50%; left: 50%;
                  transform: translate(-50%, -50%); height: 90mm; width: auto; display: block; }
  /* On the CLOSING page only, mirror the "G" of the wordmark so it faces the
     other way (the cover keeps it normal — this rule is scoped to .closing-page). */
  .closing-page .cb-title .cb-g { display: inline-block; transform: scaleX(-1); }
`;

// Garden Proiect brand — full logo lockup (tree + wordmark), transparent PNG
// generated by scripts/make-logo-assets.mjs. Served from /public.
// The white header-band contents for the covers: the tree mark + wordmark text.
const BANNER_HTML =
  `<img src="/logo-mark.png" alt="" class="cb-mark" />` +
  `<span class="cb-title"><span class="cb-g">G</span>ARDEN PROIECT</span>`;

async function waitForImages(page) {
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((res) => {
          const done = () => res();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );
    // Force decode so nothing is deferred at print time.
    await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
  });
}

// Build the cover injections + the TOC page + the closing page (with placeholder
// page numbers on the TOC).
async function buildCatalogDom(page, banner, labels, ads) {
  return page.evaluate(({ banner, labels, ads }) => {
    // A fresh white header band (tree mark + "Garden Proiect"). Built per-call
    // because the same node can't live on both the cover and the closing page.
    const makeBanner = () => {
      const b = document.createElement("div");
      b.className = "cover-banner";
      b.innerHTML = banner;
      return b;
    };

    // 1) White header band across the top of the cover — this carries the logo
    //    (moved up from the old in-column lockup, which is no longer injected).
    const hero = document.querySelector(".hero");
    if (hero && !hero.querySelector(".cover-banner")) {
      hero.insertBefore(makeBanner(), hero.firstChild);
    }

    // 2) VAT note folded onto the cover.
    // if (heroLeft && !heroLeft.querySelector(".cover-vat")) {
    //   const vat = document.createElement("div");
    //   vat.className = "cover-vat";
    //   vat.textContent = vatText;
    //   heroLeft.appendChild(vat);
    // }

    // 3) Collect the real, rendered product-section titles (exclude gallery).
    const sections = Array.from(document.querySelectorAll(".section")).filter(
      (s) => !s.querySelector(".gallery")
    );
    const titles = sections.map((s) => s.querySelector(".section-head h2")?.textContent?.trim() || "");

    // 3b) Pour every product from every section into ONE "pageframe" table.
    //     Rows of three cards (tr.pf-row) never break across a page (Chromium
    //     keeps table rows intact — unlike CSS-grid rows, which it slices), and
    //     full-width heading rows (tr.pf-head, colspan 3) flow inline between
    //     them so cards pack row-after-row with no per-section blank tail. The
    //     table lives inside a .wrap div (NOT nested in another table's cell —
    //     that silently breaks a fixed table's column widths). Its <thead>/
    //     <tfoot> spacers repeat top and bottom on every product page; the cover
    //     (.hero) stays before it and the Contents page is appended after.
    if (sections.length && !document.querySelector("table.pageframe")) {
      // ONE product per row now (big-photo layout) — a single full-width column.
      // Cards each take 1 column, so every product lands on its own row; any ad
      // box (span is clamped to COLS below) becomes a full-width banner row.
      const COLS = 1;
      const wrap = document.createElement("div");
      wrap.className = "wrap";
      const table = document.createElement("table");
      table.className = "pageframe";

      // Explicit equal columns — with table-layout:fixed the widths would
      // otherwise be read off the first row, which is a colspan-3 heading.
      const cg = document.createElement("colgroup");
      for (let c = 0; c < COLS; c++) {
        const col = document.createElement("col");
        col.style.width = `${(100 / COLS).toFixed(3)}%`;
        cg.appendChild(col);
      }
      table.appendChild(cg);

      const thead = document.createElement("thead");
      thead.innerHTML = `<tr><td colspan="${COLS}"><div class="pf-spacer"></div></td></tr>`;
      const tfoot = document.createElement("tfoot");
      tfoot.innerHTML = `<tr><td colspan="${COLS}"><div class="pf-spacer"></div></td></tr>`;
      table.appendChild(thead);
      table.appendChild(tfoot);

      const tb = document.createElement("tbody");
      // Running product index across ALL sections, so EVERY 2ND product gets the
      // `card-flip` class (photo swaps to the right, text/price to the left — see
      // .card.card-flip in EXPORT_CSS). Counts products only, never ad boxes.
      let prodN = 0;
      // For each section: a full-width heading row, then one product per row.
      sections.forEach((s) => {
        const head = s.querySelector(".section-head");
        if (head) {
          const hr = document.createElement("tr");
          hr.className = "pf-head";
          const td = document.createElement("td");
          td.colSpan = COLS;
          td.appendChild(head);
          hr.appendChild(td);
          tb.appendChild(hr);
        }
        const cards = Array.from(s.querySelectorAll(".card"));
        // Reserve the dimensions band on cards that have no dims line, so the
        // uniform-zone heights (see EXPORT_CSS) line up on every card.
        cards.forEach((card) => {
          if (!card.querySelector(".card-dims")) {
            const row = card.querySelector(".card-row");
            if (row) {
              const d = document.createElement("div");
              d.className = "card-dims";
              d.innerHTML = "&nbsp;";
              row.insertAdjacentElement("afterend", d);
            }
          }
        });
        // Build a token stream (cards, plus any ad boxes configured to follow a
        // product) and flow it into rows of COLS columns. A card takes 1 column,
        // an ad takes `span`; an ad that doesn't fit the current row's remaining
        // columns starts a fresh row.
        const idOf = (card) => {
          const src = card.querySelector(".card-media img")?.getAttribute("src") || "";
          const m = src.match(/\/products\/(.+?)\.[a-z0-9]+$/i);
          return m ? m[1] : "";
        };
        const tokens = [];
        cards.forEach((card) => {
          if (prodN % 2 === 1) card.classList.add("card-flip"); // every 2nd product mirrors
          prodN++;
          tokens.push({ type: "card", el: card });
          const ad = (ads || []).find((a) => a.afterId === idOf(card));
          if (ad) tokens.push({ type: "ad", span: Math.min(Math.max(ad.span || 1, 1), COLS), html: ad.html });
        });

        let tr = null, col = 0;
        const padRow = () => { while (tr && col < COLS) { tr.appendChild(document.createElement("td")); col++; } };
        const startRow = () => { tr = document.createElement("tr"); tr.className = "pf-row"; tb.appendChild(tr); col = 0; };
        for (const tk of tokens) {
          const span = tk.type === "ad" ? tk.span : 1;
          if (!tr || col + span > COLS) { padRow(); startRow(); }
          const td = document.createElement("td");
          if (span > 1) td.colSpan = span;
          if (tk.type === "card") {
            td.appendChild(tk.el);
          } else {
            td.className = "ad-box";
            td.innerHTML = tk.html;
          }
          tr.appendChild(td);
          col += span;
        }
        padRow();
      });
      table.appendChild(tb);

      wrap.appendChild(table);
      sections[0].parentNode.insertBefore(wrap, sections[0]);
      // Drop the now-empty original section shells.
      sections.forEach((s) => s.remove());
    }

    // 4) Build the Contents page at the very end (placeholder numbers for pass 1).
    if (!document.querySelector(".toc-page")) {
      const toc = document.createElement("section");
      toc.className = "toc-page";
      const rows = titles
        .map(
          (t, i) =>
            `<li><span class="toc-title">${t}</span><span class="toc-dots"></span>` +
            `<span class="toc-num" data-idx="${i}">0</span></li>`
        )
        .join("");
      toc.innerHTML =
        `<div class="wrap">` +
        `<div class="toc-kicker">${labels.kicker}</div>` +
        `<h2>${labels.contents}</h2><div class="toc-rule"></div>` +
        `<ul class="toc-list">${rows}</ul></div>`;
      // Append after the last product section (footer is hidden anyway).
      document.body.appendChild(toc);
    }

    // 5) Closing / back-cover page — the very last sheet. The white header band
    //    (tree mark + "Garden Proiect") sits at the TOP, a large tree mark is
    //    centred in the middle, and the contact chips are pinned to the BOTTOM
    //    (just above the mound, which the plain footer draws). No page number.
    if (!document.querySelector(".closing-page")) {
      const closing = document.createElement("section");
      closing.className = "closing-page";
      closing.appendChild(makeBanner());
      const mark = document.createElement("img");
      mark.src = "/closing-mark.png";
      mark.alt = "";
      mark.className = "closing-mark";
      closing.appendChild(mark);
      const heroContact = document.querySelector(".hero-contact");
      if (heroContact) {
        const contact = heroContact.cloneNode(true);
        contact.classList.add("closing-contact");
        closing.appendChild(contact);
      }
      document.body.appendChild(closing);
    }

    return titles;
  }, { banner, labels, ads });
}

function pdfPageText(file, pageNum) {
  try {
    return execFileSync("pdftotext", ["-f", String(pageNum), "-l", String(pageNum), "-layout", file, "-"], {
      encoding: "utf8",
    });
  } catch {
    return "";
  }
}

function pageCount(file) {
  const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  const m = info.match(/Pages:\s+(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Find the FIRST page whose extracted text contains the section title.
function findSectionPages(file, titles) {
  const pages = pageCount(file);
  const texts = [];
  for (let p = 1; p <= pages; p++) texts.push({ p, text: pdfPageText(file, p) });

  return titles.map((title) => {
    // Normalise whitespace so a line-wrapped heading still matches.
    const needle = title.replace(/\s+/g, " ").trim();
    for (const { p, text } of texts) {
      const hay = text.replace(/\s+/g, " ");
      if (hay.includes(needle)) return { title, page: p };
    }
    // Fallback: match on the distinctive first token(s).
    const alt = needle.split(/[—&]/)[0].trim();
    for (const { p, text } of texts) {
      if (alt && text.replace(/\s+/g, " ").includes(alt)) return { title, page: p };
    }
    return { title, page: 0 };
  });
}

// ---- Print footer: the green "ground" mound + centred page number ----------
// Painted by Chromium into the 12mm bottom margin band of EVERY sheet (see the
// @page rule in EXPORT_CSS). Notes on the Chromium header/footer engine:
//   • Only the special classes (pageNumber, totalPages, …) get live values, so
//     the number is a <span class="pageNumber">.
//   • The template renders in an isolated context with a TINY default font and
//     no inherited styles — every size/colour is set inline here.
//   • Backgrounds print only with -webkit-print-color-adjust:exact, set below.
// The band is filled cream first so no white paper shows even if the SVG fails;
// the mound is a shallow full-width lens (preserveAspectRatio:none stretches it)
// in the catalog's soft green, with the page number in white on its fuller
// middle. HEADER is an empty div so Chromium doesn't print its default title.
// The green "ground" mound — a shallow full-width lens (preserveAspectRatio:none
// stretches it edge-to-edge) in the catalog's soft green. Shared by the print
// footer (content pages, with a page number on top) and the DOM cover mounds
// (front + back covers, no number). Fills whatever 12mm-tall box contains it.
const MOUND_SVG =
  `<svg viewBox="0 0 1200 70" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">` +
  `<path d="M0,55 C400,18 800,18 1200,55 C800,65 400,65 0,55 Z" fill="#26422a"></path></svg>`;

// Two footer variants share the same 12mm cream band + mound (so the page layout
// is identical either way): FOOTER_NUM adds the centred page number, FOOTER_PLAIN
// omits it. Covers get FOOTER_PLAIN, inner pages FOOTER_NUM (see renderPdfFinal).
const footerHtml = (withNumber) => `
  <div style="position:fixed; left:0; right:0; bottom:0; width:100%; height:12mm; margin:0; padding:0;
              background:#efeadd; -webkit-print-color-adjust:exact; print-color-adjust:exact;
              font-family:'Poppins','Helvetica Neue',Arial,sans-serif;">
    ${MOUND_SVG}
    ${withNumber
      ? `<span class="pageNumber" style="position:absolute; left:0; right:0; bottom:2mm; text-align:center;
                 font-size:9px; font-weight:700; color:#ffffff;"></span>`
      : ``}
  </div>`;
const FOOTER_NUM = footerHtml(true);
const FOOTER_PLAIN = footerHtml(false);

// Common page.pdf() options. `@page { size:A4; margin:0 0 12mm 0 }` bleeds the
// cream html/body to the left/right/top paper edges (no white margin) and
// reserves a 12mm bottom band for the footer. Chromium ignores page.pdf({margin})
// when the page CSS sets an @page margin, so margins live in EXPORT_CSS.
const PDF_OPTS = {
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: `<div></div>`,
};

// Single-shot render (used by pass 1, where the numbers are irrelevant — we only
// scan the text to locate sections).
async function renderPdf(page) {
  return page.pdf({ ...PDF_OPTS, footerTemplate: FOOTER_NUM });
}

// Final render: pages 2…N-1 carry the numbered footer; the first and last sheets
// (the covers) carry the plain footer (mound, no number). Rendered as three page
// ranges and stitched back together with poppler's `pdfunite`. `pageRanges`
// preserves each page's ORIGINAL number, so the inner numbers still match the TOC.
async function renderPdfFinal(page, total, outPath) {
  const { writeFile } = await import("node:fs/promises");
  if (total < 3) {
    // Degenerate (no real inner pages) — just number everything.
    await writeFile(outPath, await renderPdf(page));
    return;
  }
  const cover = await page.pdf({ ...PDF_OPTS, pageRanges: "1", footerTemplate: FOOTER_PLAIN });
  const inner = await page.pdf({ ...PDF_OPTS, pageRanges: `2-${total - 1}`, footerTemplate: FOOTER_NUM });
  const back = await page.pdf({ ...PDF_OPTS, pageRanges: `${total}`, footerTemplate: FOOTER_PLAIN });
  const parts = ["cover", "inner", "back"].map((n) => outPath.replace(/\.pdf$/, `.${n}.pdf`));
  await Promise.all([writeFile(parts[0], cover), writeFile(parts[1], inner), writeFile(parts[2], back)]);
  try {
    execFileSync("pdfunite", [...parts, outPath], { stdio: "ignore" });
  } catch (err) {
    console.warn(`⚠  pdfunite failed (${err.message}) — falling back to numbered covers.`);
    await writeFile(outPath, await renderPdf(page));
  } finally {
    parts.forEach((p) => existsSync(p) && rmSync(p, { force: true }));
  }
}

// ---- Color-safe Ghostscript flags -------------------------------------------
// Chrome embeds each photo with a VALID sRGB ICCBased color space. A plain
// `-dPDFSETTINGS=/printer` pass, however, REWRITES those images with a
// BROKEN, zero-length ICC profile (`Couldn't allocate 0 bytes for profile` /
// `read ICCBased color space profile error`). Lenient renderers (Chrome,
// poppler/pdftoppm) ignore the bad profile, but STRICT engines (Acrobat,
// Apple Preview/Mail, MuPDF) then refuse to draw the image → the recipient
// sees blank photo cards. The fix is to force Ghostscript to transcode every
// image into clean DeviceRGB (`-dColorConversionStrategy=/sRGB
// -dProcessColorModel=/DeviceRGB`) so the output carries no ICC profile at
// all — `pdfimages -list` then reports the color space as `rgb`, not `icc`,
// and strict viewers render the photos. See scripts/export-catalog-pdf.mjs
// git history / the "STRICT verification" checklist for details.
const GS_COLOR_SAFE = [
  "-dColorConversionStrategy=/sRGB",
  "-dProcessColorModel=/DeviceRGB",
  "-dConvertCMYKImagesToRGB=true",
  "-dEmbedAllFonts=true",
];

// Compress a raw render into OUT with Ghostscript, falling back gracefully.
function compress(gs, raw, out) {
  if (!gs) {
    console.warn("⚠  Ghostscript (gs) not found — leaving PDF uncompressed.");
    renameSync(raw, out);
    return;
  }
  console.log("→ Compressing with Ghostscript (/printer, color-safe sRGB) …");
  try {
    const gsRun = (preset) =>
      execFileSync(
        gs,
        [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          `-dPDFSETTINGS=${preset}`,
          ...GS_COLOR_SAFE,
          "-dNOPAUSE",
          "-dBATCH",
          "-dQUIET",
          `-sOutputFile=${out}`,
          raw,
        ],
        { stdio: "inherit" }
      );
    gsRun("/printer");
    const mb = statSync(out).size / 1e6;
    if (mb > 28) {
      console.log(`  /printer gave ${mb.toFixed(1)} MB (>28) — retrying with /ebook …`);
      gsRun("/ebook");
    }
    rmSync(raw, { force: true });
  } catch (e) {
    console.warn("⚠  Ghostscript failed — using uncompressed PDF.", e.message);
    renameSync(raw, out);
  }
}

// Render a single language's catalog PDF using a fresh browser context (so the
// forced `gp-lang` localStorage value takes effect before the app mounts).
async function exportLang(browser, gs, lang) {
  const { writeFile } = await import("node:fs/promises");
  const L = LABELS[lang];
  const OUT = outPath(lang);
  const RAW = rawPath(lang);

  console.log(`\n══ ${lang.toUpperCase()} ═══════════════════════════════════════`);

  const context = await browser.newContext();
  // Force the chosen language before the app mounts.
  await context.addInitScript((l) => localStorage.setItem("gp-lang", l), lang);
  const page = await context.newPage();

  console.log(`→ Loading ${BASE_URL} (lang=${lang}) …`);
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120000 });

  // Confirm the language mounted (non-fatal).
  const langOk = await page.locator(".section-head h2", { hasText: L.confirm }).count();
  if (!langOk) console.warn(`⚠  Could not confirm ${lang} section title (“${L.confirm}”) — continuing anyway.`);
  else console.log(`✓ ${lang} confirmed (${L.confirm}).`);

  // Eager-load lazy images (app has a beforeprint handler) + wait for every image.
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  await page.addStyleTag({ content: EXPORT_CSS });
  await waitForImages(page);

  const titles = await buildCatalogDom(page, BANNER_HTML, L, localizedAds(lang));
  console.log(`✓ Built cover + TOC (${titles.length} sections).`);
  await waitForImages(page);

  // ---- Pass 1: render with placeholder TOC numbers, then locate sections ----
  console.log("→ Pass 1: rendering to locate section pages …");
  await writeFile(RAW, await renderPdf(page));
  const mapping = findSectionPages(RAW, titles);
  const totalPages = pageCount(RAW);
  console.log("  Section → page mapping:");
  mapping.forEach((m) => console.log(`    p.${String(m.page).padStart(3)}  ${m.title}`));

  // ---- Write the real page numbers back into the TOC, then re-render --------
  console.log("→ Pass 2: writing real page numbers into Contents …");
  await page.evaluate((pages) => {
    document.querySelectorAll(".toc-num").forEach((el) => {
      const idx = Number(el.getAttribute("data-idx"));
      el.textContent = String(pages[idx] ?? 0);
    });
  }, mapping.map((m) => m.page));
  await waitForImages(page);
  await renderPdfFinal(page, totalPages, RAW);

  await context.close();

  // ---- Verify TOC numbers match where sections actually landed -------------
  const verify = findSectionPages(RAW, titles);
  let allOk = true;
  verify.forEach((v, i) => {
    if (v.page !== mapping[i].page) allOk = false;
  });
  console.log(allOk ? "✓ TOC page numbers verified stable." : "⚠  Section pages shifted between passes!");

  // ---- Compress with Ghostscript (keep print quality, shrink size) ---------
  compress(gs, RAW, OUT);

  const finalMb = statSync(OUT).size / 1e6;
  console.log(`✓ Done: ${OUT} (${finalMb.toFixed(1)} MB)`);
  if (existsSync(RAW)) rmSync(RAW, { force: true });
}

async function main() {
  if (!LANGS.length) {
    console.error(`No valid languages selected. CATALOG_LANG must be one or more of: ${Object.keys(LABELS).join(", ")}`);
    process.exit(1);
  }
  console.log(`Exporting ${LANGS.length} language(s): ${LANGS.map((l) => l.toUpperCase()).join(", ")}`);

  let gs = null;
  try {
    gs = execFileSync("which", ["gs"], { encoding: "utf8" }).trim();
  } catch {}

  const browser = await chromium.launch();
  try {
    for (const lang of LANGS) await exportLang(browser, gs, lang);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
