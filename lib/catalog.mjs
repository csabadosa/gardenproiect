// Single source of truth for the Garden Proiect catalog.
// Product METADATA lives here (names, codes, descriptions, images, sizes).
// PRICES are seeded here too, but at runtime the website reads prices from
// prices.xlsx — so editing that spreadsheet changes what the page shows.
//
// This file is plain ESM JavaScript so it can be imported both by the
// Next.js app and by the `scripts/gen-prices.mjs` generator.

const MAT = "Wood (oak, acacia) and metal with special paint. Available in selected colors.";

export const CONTACT = {
  phone: "+40 720 110 777",
  website: "www.gardenproiect.ro",
  facebook: "gardenproiectkft",
};

// Each product:
//   id     – slug, also the join key to prices.xlsx and the image file name
//   name   – display name
//   code   – product code (optional)
//   desc   – material / description text
//   dims   – optional dimensions line
//   note   – optional note shown instead of a price (e.g. "request a quote")
//   seed   – starting price in lei (number) OR
//   unit   – optional price unit suffix (e.g. "lei/m")
//   variants – optional array of { label, seed } for products sold in sizes
export const SECTIONS = [
  {
    title: "Benches & Seating",
    products: [
      { id: "round-bench", name: "Round Bench", code: "GPBS01", desc: "Wood (oak, acacia) and metal treated with a special protective coating. Available in various colors upon request.", dims: "Outer Ø 320 · Inner 180 · Seat height 45 · Back height 85 cm", seed: 5926 },
      { id: "bench-bl01", name: "Bench", code: "GPBS02", desc: "Wood (oak, acacia) and metal with a special coating. Available in different colors upon request.", dims: "Length 180 · Seat height 45 · Back height 85 cm", seed: 2766 },
      { id: "bench-ic01", name: "Bench", code: "GPBS03", desc: "Wood (oak, acacia) and metal treated with special paint. Available in selected colors.", dims: "Length 180 · Seat height 45 · Back height 85 cm", seed: 2200 },
      { id: "bench-mi01", name: "Bench", code: "GPBS05", desc: "Wood (oak, acacia), treated with special paint. Carved decoration. Available in selected colors.", dims: "Length 130 · Seat height 45 · Back height 62 cm", seed: 2850 },
      { id: "bench-st01", name: "Bench", code: "GPBS04", desc: "Wood (oak, acacia) and carved stone. Available in selected colors.", dims: "Length 180 · Depth 55 · Height 45 cm", seed: 3450 },
      { id: "bench-mi02", name: "Bench", code: "GPBS06", desc: "Wood (oak, acacia), treated with special paint. Carved motifs. Available in selected colors.", dims: "Length 360 · Seat height 45 · Back height 82 cm", seed: 3826 },
      { id: "bench-ic02", name: "Bench", code: "GPBS07", desc: "Wood (oak, acacia) and metal treated with special paint. Available in selected colors.", dims: "Length 180 · Depth 50 · Height 90 cm", seed: 1880 },
      { id: "bench-planter", name: "Bench with Planter", code: "GPBS08", desc: MAT, dims: "Length 260 · Depth 55", seed: 3826 },
      { id: "bench-bike-rack", name: "Bench with Bike Rack", code: "GPBS09", desc: MAT, dims: "Length 260 · Depth 55", seed: 3000 },
      { id: "bench-carved", name: "Bench", code: "GPBS10", desc: "Solid wood bench with metal bracing", dims: "Length 190 · Depth 55", seed: 2499 },
    ],
  },
  {
    title: "Waste Baskets",
    products: [
      { id: "waste-basket-ib01", name: "Waste Basket", code: "GPWB01", desc: MAT, dims: "Height 148 · Width 75", seed: 1920 },
      { id: "waste-basket-1880", name: "Round Roofed Waste Basket", code: "GPWB02", desc: MAT, dims: "Width 50 · Height 122 cm", seed: 1880 },
      { id: "waste-basket-1400", name: "Square Roofed Waste Basket", code: "GPWB03", desc: MAT, seed: 1400 },
      { id: "waste-basket-2490", name: "Waste Basket", code: "GPWB04", desc: "Wood (oak, acacia) and metal with special paint. Carved motifs. Available in selected colors.", dims: "55 × 55 · Height 115 cm", seed: 2490 },
    ],
  },
  {
    title: "Planters, Boxes & Wells",
    products: [
      { id: "carved-flower-box-lj03", name: "Carved Flower Box", code: "GPPB01", desc: MAT, dims: "Length 160 · Width 60 · Height 80 cm", seed: 1800 },
      { id: "flower-box-lj01", name: "Flower Box", code: "GPPB02", desc: MAT, variants: [
        { label: "60 × 60 × 60 cm", seed: 800 },
        { label: "80 × 80 × 60 cm", seed: 990 },
        { label: "100 × 100 × 60 cm", seed: 1200 },
      ] },
      { id: "water-wheel-well", name: "Water Wheel Well", code: "GPPB03", desc: MAT, dims: "172 × 172 · Height 300 cm", seed: 11200 },
    ],
  },
  {
    title: "Tables & Sets",
    products: [
      { id: "garden-daybed", name: "Garden Daybed", code: "GPTS01", desc: MAT, dims: "Length 140 · Seat height 45 · Back height 100 cm", seed: 2280 },
      { id: "round-bench-table", name: "Round Bench and Table", code: "GPTS02", desc: MAT, dims: "Width 225 · Depth 195 · Seat height 60 cm", seed: 8850 },
      { id: "table-icm01", name: "Table", code: "GPTS03", desc: MAT, dims: "Top 180 × 90 cm", seed: 3500 },
      { id: "chess-table", name: "Chess Table with Two Benches", code: "GPTS04", desc: MAT, dims: "Length 240 · Width 90 · Height 90 cm", seed: 5700 },
    ],
  },
  {
    title: "Shelters & Structures",
    products: [
      { id: "bus-stop-bm02", name: "Bus Stop Shelter", code: "GPSS01", desc: MAT, seed: 42000 },
      { id: "bus-stop-bm01", name: "Bus Stop Shelter", code: "GPSS02", desc: MAT, seed: 42000 },
      { id: "szekely-gate", name: "Székely Gate", code: "GPSS03", desc: MAT, seed: 28000 },
      { id: "octagonal-pavilion", name: "Octagonal Pavilion", code: "GPSS04", desc: "Pine wood, treated with special paint. Available in selected colors. Roof on request (quote). Table and chairs on request (quote).", seed: 21000 },
      { id: "solid-wood-bell", name: "Solid Wood Bell", code: "GPSS05", desc: MAT, note: "Please request a quote!" },
    ],
  },
  {
    title: "Fencing & Signage",
    products: [
      { id: "solid-wood-fence", name: "Solid Wood Fence", code: "GPFS01", desc: MAT, seed: 350, unit: "lei/m" },
      { id: "information-board", name: "Information Board", code: "GPFS02", desc: MAT, dims: "Width 180 · Height 240 cm", seed: 3106 },
      { id: "bike-rack-bt01", name: "Bike Rack", code: "GPFS03", desc: "Carved stone, metal.", dims: "Length 148 · Height 44 cm", seed: 3750 },
    ],
  },
  {
    title: "Playground — Swings & Play",
    products: [
      { id: "swing-frame-lp02", name: "Swing Frame", code: "GPPS02", desc: MAT, seed: 3750 },
      { id: "swing-frame-lp01", name: "Swing Frame", code: "GPPS01", desc: "Wood (oak, acacia) and metal with special paint. Available in selected colors. Recommended for private gardens.", dims: "Length 400 · Height 50 cm", seed: 3750 },
      { id: "swing-frame-sw04", name: "Seesaw", code: "GPPS03", desc: MAT, dims: "Length 250 · Height 70 cm", seed: 3750 },
      { id: "swing", name: "Swing", code: "GPPS04", desc: MAT, dims: "Seat 46 × 34 cm", seed: 300 },
      { id: "childrens-swing", name: "Children's Swing", code: "GPPS05", desc: MAT, dims: "Seat 46 × 34 · Height 35 cm", seed: 376 },
      { id: "large-swing", name: "Large Swing", code: "GPPS07", desc: MAT, dims: "Length 200 · Depth 50 · Height 80 cm", seed: 750 },
      { id: "hexagonal-sandpit", name: "Hexagonal Sandpit", code: "GPPS06", desc: MAT, dims: "370 × 220 cm", seed: 976 },
      { id: "balance-beam", name: "Balance Beam (Snake-Shaped)", code: "GPPS08", desc: MAT, dims: "Length 300 · Height 20 cm", seed: 3000 },
      { id: "hexagonal-climbing", name: "Hexagonal Climbing Structure", code: "GPPS09", desc: MAT, dims: "Width 306 · Depth 153 · Height 200 cm", seed: 8400 },
      { id: "small-boat", name: "Small Boat / Watercraft", code: "GPPS10", desc: MAT, dims: "Length 260 · Width 95 · Height 200 cm", seed: 5250 },
      { id: "airplane-curved", name: "Airplane with Curved Frame", code: "GPPS11", desc: MAT, dims: "Length 112 · Width 40 · Height 75 cm", seed: 2500 },
      { id: "sensory-maze", name: "Sensory-Motor Development Maze Game", code: "GPPS12", desc: MAT, dims: "83 × 83 · Height 45 cm", seed: 1050 },
      { id: "airplane-ap01", name: "Airplane", code: "GPPS13", desc: MAT, dims: "Length 90 · Height 35 cm", seed: 2100 },
    ],
  },
  {
    title: "Large Play Structures",
    products: [
      { id: "mini-playground", name: "Mini Playground Complex – Castle Type", code: "GPLP01", desc: MAT, seed: 16500 },
      { id: "two-seat-swing-tw02", name: "Two-Seat Swing, Solid Wood, with Tower-Type Slide", code: "GPLP02", desc: MAT, dims: "Width 455 · Height 380 cm", seed: 17500 },
      { id: "two-seat-swing-tw03", name: "Two-Seat Swing, Solid Wood, with Tower Slide", code: "GPLP03", desc: MAT, dims: "Width 450 · Height 350 cm", seed: 17500 },
      { id: "steamboat-karibi", name: "Steamboat", code: "GPLP04", desc: MAT, seed: 28000 },
      { id: "rustic-two-seat-swing", name: "Rustic Two-Seat Swing, Solid Wood", code: "GPLP05", desc: MAT, dims: "Width 485 · Depth 220 · Height 260 cm", seed: 3750 },
      { id: "carousel", name: "Carousel", code: "GPLP06", desc: "Wood and metal with special paint. Available in selected colors.", seed: 21000 },
      { id: "rustic-swing-roof", name: "Rustic Solid Wood Swing with Roof", code: "GPLP07", desc: MAT, dims: "Width 375 · Depth 275 · Height 375 cm", seed: 4800 },
    ],
  },
];

// Flat list of all products.
export const ALL_PRODUCTS = SECTIONS.flatMap((s) =>
  s.products.map((p) => ({ ...p, section: s.title }))
);

// Reference gallery images (real installations), served from /gallery.
export const GALLERY = [
  "i-026-279", "i-026-280", "i-026-281", "i-026-282", "i-026-283", "i-026-284",
  "i-026-285", "i-026-286", "i-026-287", "i-026-288", "i-026-289", "i-026-290",
].map((f) => `/gallery/${f}.png`);

// The warranty / terms text from the catalog's inside cover.
export const TERMS = [
  "We provide a 5-year warranty on products made of solid wood, calculated from the date of manufacture. The warranty for purchased products is valid in accordance with the legislation in force at the time of purchase. The warranty covers only defects resulting from manufacturing faults or hidden material defects and becomes void if the products are used improperly or contrary to their intended purpose.",
  "The customer acknowledges that products made from natural materials, such as solid wood or solid wood plywood, may vary in texture and in the shades achieved through different finishing processes. Such variations are considered natural characteristics of the material and do not constitute quality defects.",
  "At the customer's request, solid wood may be substituted with pine wood; however, in this case, the warranty period is reduced to 1 year. A custom quotation is required for such requests.",
  "Payment terms: 50% advance payment upon ordering, with the remaining balance payable upon delivery, unless otherwise specified in the contract.",
  "Please request a custom quotation regarding the terms and costs of loading, transportation, assembly, and installation. Should you require any further information, we will be pleased to assist you. Do not hesitate to contact us.",
];
