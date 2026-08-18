// i18n glue: turns the language JSON files into simple lookup helpers keyed by
// the site's product IDs / English source strings.
import en from "../languages/en.json";
import ro from "../languages/ro.json";
import hu from "../languages/hu.json";

export const LANGS = ["ro", "en", "hu"];
export const DEFAULT_LANG = "ro";

const DICTS = { en, ro, hu };

export function getDict(lang) {
  return DICTS[lang] || DICTS[DEFAULT_LANG];
}

// Maps each product ID (used in catalog.mjs / prices.xlsx) to its key in the
// `benches` object of the language files.
export const SLUG_TO_KEY = {
  "round-bench": "round bench",
  "bench-bl01": "bench",
  "bench-ic01": "bench 2",
  "bench-mi01": "bench 4",
  "bench-st01": "bench 3",
  "bench-mi02": "bench 5",
  "bench-ic02": "bench 6",
  "bench-planter": "bench with flowers",
  "bench-bike-rack": "bench with bike rack",
  "bench-carved": "bench 7",
  "waste-basket-ib01": "garbage bin",
  "waste-basket-1880": "garbage bin 2",
  "waste-basket-1400": "garbage bin 3",
  "waste-basket-2490": "garbage bin 4",
  "carved-flower-box-lj03": "flower pot",
  "flower-box-lj01": "flower pot 2",
  "water-wheel-well": "well with a water wheel",
  "garden-daybed": "sun lounger",
  "round-bench-table": "round table with benches",
  "table-icm01": "table",
  "chess-table": "chess table with two benches",
  "bus-stop-bm02": "bus station",
  "bus-stop-bm01": "bus station 2",
  "szekely-gate": "Secler gate",
  "octagonal-pavilion": "Octagonal pavilon",
  "solid-wood-fence": "solid wood fence",
  "information-board": "Info station",
  "bike-rack-bt01": "bicycle rack",
  "swing-frame-lp02": "Garden swing 2",
  "swing-frame-lp01": "Garden swing",
  "swing": "Swing",
  "childrens-swing": "Child swing",
  "large-swing": "Big swing",
  "hexagonal-sandpit": "Hexagonal sandbox",
  "balance-beam": "Balancing snake",
  "hexagonal-climbing": "Hexagonal climbing frame",
  "small-boat": "Wooden ship",
  "airplane-curved": "Spring rocker airplane",
  "sensory-maze": "Labirynth game for developing senzomotor skills",
  "airplane-ap01": "Airplane",
  "mini-playground": "Mini castle playground",
  "two-seat-swing-tw02": "Double solid wood swing set with tower-style slide",
  "two-seat-swing-tw03": "Double solid wood swing set with slide",
  "steamboat-karibi": "Caribbean ship",
  "rustic-two-seat-swing": "Rustic styled Double solid wood swing",
  "carousel": "Carousel",
  "rustic-swing-roof": "Rustic Solid Wood Swing with Roof",
  "solid-wood-bell": "Solid wood bell tower",
};

export function tName(lang, slug, fallback) {
  const key = SLUG_TO_KEY[slug];
  const title = key && getDict(lang).benches?.[key]?.title;
  return title || fallback || slug;
}

export function tDesc(lang, engDesc) {
  return getDict(lang).descriptions?.[engDesc] || engDesc;
}

export function tSection(lang, engTitle) {
  return getDict(lang).sections?.[engTitle] || engTitle;
}

export function tDims(lang, engDims) {
  return getDict(lang).dims?.[engDims] || engDims;
}

export function tUi(lang, key) {
  const d = getDict(lang).ui || {};
  if (d[key] !== undefined) return d[key];
  return getDict("en").ui?.[key] ?? "";
}
