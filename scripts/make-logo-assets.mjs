// Generates transparent, recolored logo assets from the flat green-on-light
// brand logo (public/gallery/gardenproiect_logo.jpeg).
//
// The source is effectively a 2-tone image (dark-green ink on a light
// background), so we treat luminance as a coverage/matte channel: light = 0
// opacity, dark = full opacity. We then repaint that matte in a flat brand
// color. This yields clean, anti-aliased, transparent marks that can be tinted
// green (light backgrounds) or white (the dark-green footer).
//
// Outputs (public/):
//   logo-full.png        full lockup (tree + "GARDEN PROIECT"), brand green
//   logo-mark.png        tree mark only, brand green
//   logo-mark-white.png  tree mark only, white
//
// Run: node scripts/make-logo-assets.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "public/gallery/gardenproiect_logo.jpeg");
const OUT = path.join(root, "public");

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// Background luminance: sample the four corners (assumed background).
const at = (x, y) => {
  const i = (y * W + x) * C;
  return lum(data[i], data[i + 1], data[i + 2]);
};
const bgL = Math.min(at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3));

// Ink luminance + the ink's actual green: average the darkest pixels.
let inkL = 255, gr = 0, gg = 0, gb = 0, gn = 0;
for (let i = 0; i < data.length; i += C) {
  const L = lum(data[i], data[i + 1], data[i + 2]);
  if (L < inkL) inkL = L;
}
const inkCut = inkL + (bgL - inkL) * 0.25; // "clearly ink" threshold
for (let i = 0; i < data.length; i += C) {
  const L = lum(data[i], data[i + 1], data[i + 2]);
  if (L <= inkCut) { gr += data[i]; gg += data[i + 1]; gb += data[i + 2]; gn++; }
}
const green = { r: Math.round(gr / gn), g: Math.round(gg / gn), b: Math.round(gb / gn) };
console.log(`bgL=${bgL.toFixed(0)} inkL=${inkL.toFixed(0)} green=rgb(${green.r},${green.g},${green.b})`);

// Build a coverage (alpha) map: 0 at background luminance, 1 at ink luminance.
const denom = Math.max(1, bgL - inkL);
const cov = new Float32Array(W * H);
for (let p = 0, i = 0; p < W * H; p++, i += C) {
  const L = lum(data[i], data[i + 1], data[i + 2]);
  cov[p] = Math.min(1, Math.max(0, (bgL - L) / denom));
}

// Render a coverage sub-rect into a flat-colored RGBA PNG, auto-trimmed.
async function emit(name, y0, y1, color) {
  const h = y1 - y0;
  const out = Buffer.alloc(W * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) {
      const a = cov[(y + y0) * W + x];
      const o = (y * W + x) * 4;
      out[o] = color.r; out[o + 1] = color.g; out[o + 2] = color.b;
      out[o + 3] = Math.round(a * 255);
    }
  }
  await sharp(out, { raw: { width: W, height: h, channels: 4 } })
    .trim({ threshold: 1 }) // drop fully-transparent margins
    .png()
    .toFile(path.join(OUT, name));
  console.log("wrote", name);
}

// Row coverage to split the tree mark (top block) from the wordmark below it.
const rowCov = new Float32Array(H);
for (let y = 0; y < H; y++) {
  let s = 0;
  for (let x = 0; x < W; x++) s += cov[y * W + x];
  rowCov[y] = s / W;
}
const ON = 0.004; // a row counts as "content" above this mean coverage
let treeTop = 0; while (treeTop < H && rowCov[treeTop] < ON) treeTop++;
// first content row (tree top); walk down until a sustained gap (the space
// between the tree and the "GARDEN" wordmark).
let y = treeTop, gap = 0, treeBottom = H;
const GAP_ROWS = Math.round(H * 0.03);
for (; y < H; y++) {
  if (rowCov[y] < ON) { gap++; if (gap >= GAP_ROWS) { treeBottom = y - gap + 1; break; } }
  else gap = 0;
}
console.log(`tree rows ${treeTop}..${treeBottom} of ${H}`);

await emit("logo-full.png", 0, H, green);
await emit("logo-mark.png", treeTop, treeBottom, green);
await emit("logo-mark-white.png", treeTop, treeBottom, { r: 255, g: 255, b: 255 });
console.log("done");
