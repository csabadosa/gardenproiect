// ---------------------------------------------------------------------------
// export-leaflet-pdf.mjs — Garden Proiect "planters" flip-booklet exporter
//
// A small, fancy A6-portrait booklet for the flower-box / planter range,
// per Ferdi's brief: one product per spread — when you open it, the LEFT page
// shows the measurements (a generated isometric dimension sketch) and the
// RIGHT page shows the photo. Front + back cover included.
//
//   Page 1        : front cover (alone on the right in a 2-up viewer)
//   Pages 2..N    : per product → [dimension sketch] | [photo]  (a spread)
//   Last page     : back cover (contact + warranty line)
//
// Reads product metadata straight from lib/catalog.mjs (names, codes, dims),
// uses the real photos in public/products/<id>.png and the site's brand
// tokens/fonts, so it stays in sync with the catalog with no duplicated data.
//
// HOW TO RUN  (no dev server needed — it renders a self-contained HTML file)
//   node scripts/export-leaflet-pdf.mjs
//   Optional: OUT=/path/out.pdf   node scripts/export-leaflet-pdf.mjs
//
// Requirements: Playwright (devDependency). Ghostscript `gs` is used for
// color-safe compression if present (same rationale as the A4 exporter).
// ---------------------------------------------------------------------------

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, statSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { SECTIONS, CONTACT } from "../lib/catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const OUT = process.env.OUT || resolve(REPO, "Garden-Proiect-Planters-Booklet-2026-EN.pdf");
const RAW = resolve(REPO, ".leaflet-raw.pdf");
const TMP_HTML = resolve(REPO, ".leaflet-page.html");

// file:// URL for a public asset so Chromium (page origin = file://) can load it.
const asset = (rel) => pathToFileURL(resolve(REPO, "public", rel)).href;

// ---- Select the booklet's products ----------------------------------------
// Scope (agreed): planters only — LJ01 (its 3 sizes) + LJ03 + Bench-with-Planter.
// Each LJ01 size becomes its own spread; every entry below is one product page.
const byId = Object.fromEntries(
  SECTIONS.flatMap((s) => s.products).map((p) => [p.id, p])
);

// Parse "60 × 60 × 60 cm" or "Length 160 · Width 60 · Height 80 cm" → {l,w,h}.
function parseDims(str) {
  const nums = (str.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(",", ".")));
  if (nums.length >= 3) return { l: nums[0], w: nums[1], h: nums[2] };
  return null;
}

function buildEntries() {
  const entries = [];
  const lj01 = byId["flower-box-lj01"];
  if (lj01?.variants) {
    for (const v of lj01.variants) {
      entries.push({
        id: lj01.id,
        name: lj01.name,
        code: "LJ01",
        desc: lj01.desc,
        sizeLabel: v.label,
        dims: parseDims(v.label),
      });
    }
  }
  const lj03 = byId["carved-flower-box-lj03"];
  if (lj03) {
    entries.push({
      id: lj03.id,
      name: lj03.name,
      code: lj03.code,
      desc: lj03.desc,
      sizeLabel: lj03.dims,
      dims: parseDims(lj03.dims || ""),
    });
  }
  const bench = byId["bench-planter"];
  if (bench) {
    entries.push({
      id: bench.id,
      name: bench.name,
      code: bench.code || "",
      desc: bench.desc,
      sizeLabel: null, // no dimension data yet
      dims: null,
    });
  }
  return entries;
}

// ---- Generated isometric dimension "sketch" --------------------------------
// Draws a labelled isometric cuboid whose proportions follow the real L/W/H.
// Corners are indexed (i,j,k) ∈ {0,1}³: i=length, j=width(depth), k=height.
// Viewed front-above → the visible faces are TOP + the two faces meeting at
// the near vertical edge (front-bottom corner = i1 j1 k0).
function isoSketch(dims) {
  if (!dims) return null;
  const { l, w, h } = dims;
  const A = 0.866; // cos30 — isometric horizontal foreshortening
  const p = (i, j, k) => ({ x: i * l * A - j * w * A, y: i * l * 0.5 + j * w * 0.5 - k * h });
  const C = {
    O: p(0, 0, 0), I: p(1, 0, 0), J: p(0, 1, 0), K: p(0, 0, 1),
    IJ: p(1, 1, 0), IK: p(1, 0, 1), JK: p(0, 1, 1), IJK: p(1, 1, 1),
  };
  const all = Object.values(C);
  const minX = Math.min(...all.map((q) => q.x)), maxX = Math.max(...all.map((q) => q.x));
  const minY = Math.min(...all.map((q) => q.y)), maxY = Math.max(...all.map((q) => q.y));
  const availW = 250, availH = 210, pad = 52;
  const k = Math.min((availW - pad) / (maxX - minX), (availH - pad) / (maxY - minY));
  const offX = (availW - (maxX - minX) * k) / 2 - minX * k;
  const offY = (availH - (maxY - minY) * k) / 2 - minY * k;
  const S = (q) => `${(q.x * k + offX).toFixed(1)},${(q.y * k + offY).toFixed(1)}`;
  const M = (a, b) => ({ x: (a.x + b.x) / 2 * k + offX, y: (a.y + b.y) / 2 * k + offY });

  const top = `${S(C.K)} ${S(C.IK)} ${S(C.IJK)} ${S(C.JK)}`;
  const right = `${S(C.I)} ${S(C.IJ)} ${S(C.IJK)} ${S(C.IK)}`;
  const left = `${S(C.J)} ${S(C.IJ)} ${S(C.IJK)} ${S(C.JK)}`;
  const mLen = M(C.IJ, C.J);    // length: front corner → up-left bottom edge
  const mWid = M(C.IJ, C.I);    // width : front corner → up-right bottom edge
  const mHt = M(C.IJ, C.IJK);   // height: near vertical edge

  return `
  <svg viewBox="0 0 ${availW} ${availH}" width="100%" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${top}"   fill="#c7cfb2" stroke="#26402a" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="${left}"  fill="#9fae8a" stroke="#26402a" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="${right}" fill="#b6c09a" stroke="#26402a" stroke-width="1.4" stroke-linejoin="round"/>
    <g font-family="var(--font-poppins), sans-serif" font-weight="700" font-size="12" fill="#26402a"
       paint-order="stroke" stroke="#efeadd" stroke-width="3.5" stroke-linejoin="round">
      <text x="${mLen.x - 4}" y="${mLen.y + 15}" text-anchor="middle">${l} cm</text>
      <text x="${mWid.x + 4}" y="${mWid.y + 15}" text-anchor="middle">${w} cm</text>
      <text x="${mHt.x + 8}" y="${mHt.y + 4}" text-anchor="start">${h} cm</text>
    </g>
  </svg>`;
}

// ---- Page builders ---------------------------------------------------------
function coverPage() {
  return `
  <section class="pg cover">
    <img class="cover-logo" src="${asset("logo-full.png")}" alt="Garden Proiect"/>
    <div class="cover-kicker">Catalog 2026</div>
    <h1 class="cover-title">Flower<br/>Boxes</h1>
    <div class="cover-rule"></div>
    <div class="cover-frame"><img src="${asset("products/flower-box-lj01.png")}" alt=""/></div>
    <div class="cover-foot">${CONTACT.website}</div>
  </section>`;
}

function dimsPage(e) {
  const sketch = isoSketch(e.dims);
  const body = sketch
    ? `<div class="sketch">${sketch}</div>
       <div class="dim-line">${e.sizeLabel}</div>`
    : `<div class="sketch sketch--empty">
         <div class="empty-glyph">▢</div>
         <div class="empty-note">Dimensions on request</div>
       </div>`;
  return `
  <section class="pg dims">
    ${e.code ? `<div class="tag">${e.code}</div>` : ""}
    <h2 class="pname"${e.code ? "" : ' style="margin-top:2mm"'}>${e.name}</h2>
    ${body}
    <p class="matnote">${e.desc}</p>
    <div class="pg-foot">${CONTACT.website}</div>
  </section>`;
}

function photoPage(e) {
  return `
  <section class="pg photo">
    <div class="photo-frame"><img src="${asset(`products/${e.id}.png`)}" alt="${e.name}"/></div>
    <div class="photo-cap">
      <span class="photo-name">${e.name}</span>
      ${e.code ? `<span class="photo-code">${e.code}</span>` : ""}
    </div>
  </section>`;
}

function backPage() {
  return `
  <section class="pg back">
    <img class="back-logo" src="${asset("logo-mark.png")}" alt="Garden Proiect"/>
    <div class="back-block">
      <div class="back-row"><span>Phone</span><b>${CONTACT.phone}</b></div>
      <div class="back-row"><span>Web</span><b>${CONTACT.website}</b></div>
      <div class="back-row"><span>Facebook</span><b>${CONTACT.facebook}</b></div>
    </div>
    <p class="back-note">5-year warranty on solid-wood products. Prices do not include VAT.
       Custom colors and sizes available on request.</p>
  </section>`;
}

function buildHtml(entries) {
  const pages = [coverPage()];
  for (const e of entries) pages.push(dimsPage(e), photoPage(e));
  pages.push(backPage());
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Quicksand:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    :root{
      --cream:#efeadd; --cream-2:#e9eed9; --ink:#20211a; --muted:#4c5040;
      --olive:#7c8760; --green:#2f6b3b; --green-deep:#26402a; --sage:#9fae8a;
      --line:#cbd3b5; --font-poppins:'Poppins'; --font-quicksand:'Quicksand';
    }
    *{box-sizing:border-box;} html,body{margin:0;padding:0;}
    @page{ size:A6; margin:0; }
    body{ font-family:var(--font-quicksand),system-ui,sans-serif; color:var(--ink); }
    .pg{ position:relative; width:105mm; height:148mm; overflow:hidden;
         background:linear-gradient(180deg,var(--cream),var(--cream-2));
         break-after:page; page-break-after:always; padding:12mm 11mm; }
    .pg:last-child{ break-after:auto; }
    .pg-foot,.cover-foot{ position:absolute; left:0; right:0; bottom:7mm; text-align:center;
         font-family:var(--font-poppins); font-weight:600; font-size:8px; letter-spacing:.16em;
         text-transform:uppercase; color:var(--olive); }

    /* ---- Cover ---- */
    .cover{ display:flex; flex-direction:column; align-items:center; text-align:center; }
    .cover-logo{ height:60px; width:auto; margin-top:2mm; }
    .cover-kicker{ margin-top:8mm; font-family:var(--font-poppins); font-weight:700; font-size:10px;
         letter-spacing:.28em; text-transform:uppercase; color:var(--olive); }
    .cover-title{ font-family:var(--font-poppins); font-weight:800; font-size:42px; line-height:.92;
         color:var(--green-deep); margin:4px 0 0; }
    .cover-rule{ width:52px; height:3px; background:var(--green-deep); border-radius:2px; margin:12px 0 0; }
    .cover-frame{ margin-top:8mm; width:66mm; height:66mm; border-radius:14px; overflow:hidden;
         box-shadow:0 14px 30px -18px rgba(31,52,35,.5); background:#fff; }
    .cover-frame img{ width:100%; height:100%; object-fit:cover; display:block; }

    /* ---- Dimension (left) page ---- */
    .dims{ display:flex; flex-direction:column; }
    .tag{ align-self:flex-start; font-family:var(--font-poppins); font-weight:700; font-size:10px;
         letter-spacing:.06em; color:#fff; background:var(--green); padding:4px 10px; border-radius:999px; }
    .pname{ font-family:var(--font-poppins); font-weight:700; font-size:19px; line-height:1.08;
         text-transform:uppercase; color:var(--ink); margin:9px 0 0; }
    .sketch{ flex:1; display:flex; align-items:center; justify-content:center; margin:4mm 0; }
    .sketch--empty{ flex-direction:column; color:var(--olive); opacity:.75; }
    .empty-glyph{ font-size:64px; line-height:1; color:var(--sage); }
    .empty-note{ font-family:var(--font-poppins); font-weight:600; font-size:12px; margin-top:8px; }
    .dim-line{ text-align:center; font-family:var(--font-poppins); font-weight:700; font-size:15px;
         color:var(--green-deep); letter-spacing:.02em; }
    .matnote{ font-size:10px; line-height:1.45; color:var(--muted); margin:6mm 0 0; text-align:center; }

    /* ---- Photo (right) page ---- */
    .photo{ display:flex; flex-direction:column; }
    .photo-frame{ flex:1; border-radius:14px; overflow:hidden; background:#fff;
         box-shadow:0 14px 30px -18px rgba(31,52,35,.5); }
    .photo-frame img{ width:100%; height:100%; object-fit:cover; display:block; }
    .photo-cap{ margin-top:5mm; display:flex; align-items:baseline; justify-content:center; gap:8px; }
    .photo-name{ font-family:var(--font-poppins); font-weight:700; font-size:14px; text-transform:uppercase;
         color:var(--ink); }
    .photo-code{ font-family:var(--font-poppins); font-weight:700; font-size:11px; color:var(--green); }

    /* ---- Back cover ---- */
    .back{ display:flex; flex-direction:column; align-items:center; text-align:center; }
    .back-logo{ height:54px; width:auto; margin-top:10mm; }
    .back-block{ margin-top:10mm; width:100%; }
    .back-row{ display:flex; justify-content:space-between; padding:8px 2mm;
         border-bottom:1px solid rgba(38,64,42,.15); }
    .back-row span{ font-family:var(--font-poppins); font-weight:600; font-size:9px;
         letter-spacing:.16em; text-transform:uppercase; color:var(--olive); }
    .back-row b{ font-family:var(--font-poppins); font-weight:700; font-size:12px; color:var(--ink); }
    .back-note{ margin-top:auto; font-size:9.5px; line-height:1.5; color:var(--muted); }
  </style></head><body>${pages.join("")}</body></html>`;
}

async function main() {
  const entries = buildEntries();
  console.log(`→ Booklet products (${entries.length}):`);
  entries.forEach((e) => console.log(`    ${e.code || "—".padEnd(5)}  ${e.name}  ${e.sizeLabel || "(no dims)"}`));

  writeFileSync(TMP_HTML, buildHtml(entries));

  const browser = await chromium.launch();
  const page = await browser.newContext().then((c) => c.newPage());
  await page.goto(pathToFileURL(TMP_HTML).href, { waitUntil: "networkidle", timeout: 60000 });
  // Ensure webfonts + images are fully ready before printing.
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) =>
      img.complete && img.naturalWidth > 0 ? Promise.resolve()
        : new Promise((r) => { img.onload = img.onerror = r; })));
  });

  // Force the A6 sheet explicitly — Chromium's preferCSSPageSize does not
  // reliably honour `@page { size: A6 }` and falls back to Letter, which
  // leaves the A6 content in the top-left corner of an oversized sheet.
  await page.pdf({ path: RAW, printBackground: true, width: "105mm", height: "148mm" });
  await browser.close();

  // Color-safe Ghostscript compression (see A4 exporter for the ICC rationale).
  let gs = null;
  try { gs = execFileSync("which", ["gs"], { encoding: "utf8" }).trim(); } catch {}
  if (gs) {
    console.log("→ Compressing with Ghostscript (color-safe sRGB) …");
    try {
      execFileSync(gs, [
        "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/printer",
        "-dColorConversionStrategy=/sRGB", "-dProcessColorModel=/DeviceRGB",
        "-dConvertCMYKImagesToRGB=true", "-dEmbedAllFonts=true",
        "-dNOPAUSE", "-dBATCH", "-dQUIET", `-sOutputFile=${OUT}`, RAW,
      ], { stdio: "inherit" });
      rmSync(RAW, { force: true });
    } catch (e) {
      console.warn("⚠  Ghostscript failed — using uncompressed PDF.", e.message);
      renameSync(RAW, OUT);
    }
  } else {
    console.warn("⚠  Ghostscript not found — leaving PDF uncompressed.");
    renameSync(RAW, OUT);
  }

  rmSync(TMP_HTML, { force: true });
  if (existsSync(RAW)) rmSync(RAW, { force: true });
  console.log(`✓ Done: ${OUT} (${(statSync(OUT).size / 1e6).toFixed(2)} MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
