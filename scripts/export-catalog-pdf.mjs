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
// lands (no fragile page numbers). Put whatever you like in `html` — an <img>,
// text, an offer. Set ADS = [] to remove them all.
//
//   Product ids live in lib/catalog.mjs (e.g. "waste-basket-2490" = MB01).
//   The default box fills the two empty cells beside the lone waste basket on
//   the Waste Baskets page.
const ADS = [
  {
    afterId: "waste-basket-2490",
    span: 2,
    html: `
      <div class="ad-inner">
        <div class="ad-tag">Advertisement</div>
        <div class="ad-hint">Placeholder text — there will be an ad here in the future</div>
      </div>`,
  },
];

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
     first card row down even on pages that begin mid-grid. */
  @page { margin: 0 !important; size: A4; }

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
               align-items: center !important; min-height: 250mm; align-content: center; }
  .hero-media { max-width: none !important; }
  .hero .wrap { padding-left: 16mm !important; padding-right: 12mm !important; }
  .hero-title { font-size: 60px !important; }
  .hero-lead { font-size: 16px !important; max-width: 460px !important; }
  .hero-media .frame { box-shadow: none !important; aspect-ratio: 3/4 !important;
                       max-height: 150mm !important; margin: 0 auto !important; }

  /* Injected brand lockup (full logo) on the cover */
  .cover-brand { margin-bottom: 28px; }
  .cover-logo { height: 104px; width: auto; display: block; }

  /* Injected VAT note folded onto the cover */
  .cover-vat { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px;
               font-weight: 700; font-size: 13px; color: var(--green-deep);
               background: rgba(159,174,138,0.22); border: 1px solid rgba(47,107,59,0.22);
               padding: 8px 16px; border-radius: 999px; }

  /* ---- Cards as TABLE ROWS (never a CSS grid) -----------------------------
     Chromium's print engine ignores break-inside:avoid on CSS-grid items and
     happily slices a grid row across a page break — a card's photo/name land on
     one page, its price on the next. Table rows are kept intact reliably, so
     each row of three cards is a tr.pf-row with break-inside:avoid: a row that
     can't fit at a page foot moves down whole, never cut. Section headings are a
     full-width tr.pf-head (colspan 3). The 5px cell padding is the inter-card
     gutter (≈10px between neighbours). border-spacing is avoided — with
     table-layout:fixed it overflows the row and collapses the columns.

     At A4 print width (~794px) the app's @media(max-width:960px) rule would
     collapse the on-screen grid to 2 columns; the table's colgroup forces a
     clean 3-up — narrower cards are proportionally shorter (4/3 media scales
     with width), so more rows fit per page. */
  table.pageframe td { vertical-align: top !important; }
  table.pageframe tr.pf-row { break-inside: avoid !important; }
  table.pageframe tr.pf-row > td { padding: 4px !important; }
  /* Card fills its cell so all three in a row share one height. */
  table.pageframe tr.pf-row > td > .card { height: 100% !important; }
  table.pageframe tr.pf-head { break-inside: avoid !important; break-after: avoid !important; }
  table.pageframe tr.pf-head > td { padding: 6px 5px 5px !important; border: 0 !important; }
  table.pageframe > tbody > tr:first-child.pf-head > td { padding-top: 0 !important; }
  .section-head { margin-bottom: 0 !important; }
  /* Compact cards so THREE rows fit per A4 sheet (the default 4/3 photo left
     room for only two, half-emptying every page that ended a section). A shorter
     photo, tighter body padding/leading, slimmer dividers and smaller inline
     icons shave enough off each row for a third to fit. */
  .card { padding: 2mm !important; }
  .card-media { aspect-ratio: 4/1.75 !important; }
  .card-body { padding: 5px 4px 0 !important; }
  .card-name { font-size: 12.5px !important; line-height: 1.08 !important; }
  .card-code { font-size: 10px !important; margin-top: 1px !important; }
  .card-row { font-size: 10.5px !important; line-height: 1.28 !important; gap: 6px !important;
              align-items: flex-start !important; }
  .card-row svg { width: 15px !important; height: 15px !important; flex: none !important;
                  margin-top: 1px !important; }
  .card-dims { font-size: 10px !important; padding-left: 18px !important; margin-top: 3px !important; }
  .card-dims svg { width: 13px !important; height: 13px !important; }
  .rule { margin: 4px 0 !important; }

  /* ---- Uniform card zones -------------------------------------------------
     Every product div is the same size: the title, description and price bands
     each reserve a FIXED height on every card (the media is already uniform —
     same width, fixed aspect), so the three bands line up across the whole
     catalog. Heights are sized to the tallest real content (title ≤2 lines,
     description ≤5 lines, dims ≤2 lines, price ≤2 lines for the flower box's
     dual price) and long text is line-clamped, so nothing overflows and shorter
     cards simply carry blank space. The price is pinned to the bottom so its
     baseline is identical everywhere. Cards lacking a dimensions line get an
     empty .card-dims placeholder injected in buildCatalogDom so the band is
     still reserved. */
  .card-body { display: flex !important; flex-direction: column !important; }
  .card-name { min-height: 2.16em !important; margin: 0 !important;
               display: -webkit-box !important; -webkit-line-clamp: 2 !important;
               -webkit-box-orient: vertical !important; overflow: hidden !important; }
  .card-row { min-height: 6.4em !important; }
  .card-row > span { display: -webkit-box !important; -webkit-line-clamp: 5 !important;
                     -webkit-box-orient: vertical !important; overflow: hidden !important; }
  .card-dims { min-height: 2.6em !important; overflow: hidden !important; }
  .card-foot { margin-top: auto !important; min-height: 2.4em !important;
               display: flex !important; align-items: flex-end !important; }

  /* ---- Advertisement / filler boxes (see the ADS config) ------------------
     An ad cell sits in the same grid row as the products, so it's exactly as
     tall as a product card. .ad-inner fills the cell; restyle it (or replace
     the box's html) to taste. */
  table.pageframe td.ad-box { vertical-align: top !important; }
  .ad-inner { height: 100%; box-sizing: border-box;
              border: 1.5px dashed rgba(47,107,59,0.45); border-radius: var(--radius);
              background: rgba(159,174,138,0.12);
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              text-align: center; padding: 8mm; }
  .ad-tag { font-family: var(--font-poppins), sans-serif; font-weight: 700; font-size: 11px;
            letter-spacing: 0.18em; text-transform: uppercase; color: var(--olive); }
  .ad-hint { font-family: var(--font-poppins), sans-serif; font-weight: 600; font-size: 16px;
             color: var(--green-deep); margin-top: 8px; }

  /* -------- Table of Contents (last page) -------- */
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
`;

// Garden Proiect brand — full logo lockup (tree + wordmark), transparent PNG
// generated by scripts/make-logo-assets.mjs. Served from /public.
const LOGO_SVG = `<img src="/logo-full.png" alt="Garden Proiect" class="cover-logo" />`;

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

// Build the cover injections + the TOC page (with placeholder page numbers).
async function buildCatalogDom(page, logoSvg, labels, ads) {
  return page.evaluate(({ logo, labels, ads }) => {
    const heroLeft = document.querySelector(".hero-grid > div");
    const vatText =
      document.querySelector(".terms-vat")?.textContent?.trim() || "Prices do not include VAT.";

    // 1) Brand wordmark at the top of the cover (topbar is hidden).
    if (heroLeft && !heroLeft.querySelector(".cover-brand")) {
      const brand = document.createElement("div");
      brand.className = "cover-brand";
      brand.innerHTML = logo;
      heroLeft.insertBefore(brand, heroLeft.firstChild);
    }

    // 2) VAT note folded onto the cover.
    if (heroLeft && !heroLeft.querySelector(".cover-vat")) {
      const vat = document.createElement("div");
      vat.className = "cover-vat";
      vat.textContent = vatText;
      heroLeft.appendChild(vat);
    }

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
      const COLS = 3;
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
      // For each section: a full-width heading row, then rows of up to 3 cards.
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

    return titles;
  }, { logo: logoSvg, labels, ads });
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

async function renderPdf(page) {
  return page.pdf({
    printBackground: true,
    // Honour the injected `@page { margin: 0; size: A4 }` so the cream
    // html/body background bleeds to every paper edge (no white margin). The
    // per-page top/bottom cream breathing room is supplied by the repeating
    // pageframe <thead>/<tfoot> spacers, not by a paper margin. NOTE: this
    // Chromium ignores the page.pdf({margin}) option when the page CSS has an
    // @page margin, so the margin MUST be controlled via @page in EXPORT_CSS.
    preferCSSPageSize: true,
  });
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

  const titles = await buildCatalogDom(page, LOGO_SVG, L, ADS);
  console.log(`✓ Built cover + TOC (${titles.length} sections).`);
  await waitForImages(page);

  // ---- Pass 1: render with placeholder TOC numbers, then locate sections ----
  console.log("→ Pass 1: rendering to locate section pages …");
  await writeFile(RAW, await renderPdf(page));
  const mapping = findSectionPages(RAW, titles);
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
  await writeFile(RAW, await renderPdf(page));

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
