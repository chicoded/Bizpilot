import type { IndustryPack } from "./types";

/**
 * One file per trade. Adding an industry means adding a pack here and
 * listing it in `ALL_PACKS` — no feature code changes.
 */

/** General retail: the fallback every unclassified shop lands on. */
export const retailPack: IndustryPack = {
  industries: ["RETAIL", "SUPERMARKET", "MINI_MART", "COSMETICS", "OTHER"],
  capabilities: ["batch_tracking", "expiry_alerts"],
  categoryPresets: [
    "Favorites",
    "Drinks",
    "Snacks",
    "Toiletries",
    "Household",
    "Provisions",
    "Frozen",
  ],
  productNoun: { singular: "Product", plural: "Products" },
  posMode: "standard",
  productAttributes: [],
};

/** Food service. Currently the only fully built vertical. */
export const foodServicePack: IndustryPack = {
  industries: ["RESTAURANT", "FAST_FOOD", "CAFE"],
  capabilities: [
    "rush_pos",
    "kitchen_display",
    "combo_meals",
    "voice_orders",
    "plate_builder",
  ],
  categoryPresets: [
    "Favorites",
    "Combos",
    "Rice",
    "Proteins",
    "Drinks",
    "Sides",
    "Desserts",
    "Breakfast",
    "Snacks",
    "Specials",
  ],
  productNoun: { singular: "Menu item", plural: "Menu" },
  posMode: "rush",
  productAttributes: [
    {
      name: "portionSize",
      label: "Portion size",
      type: "select",
      options: [
        { value: "SMALL", label: "Small" },
        { value: "REGULAR", label: "Regular" },
        { value: "LARGE", label: "Large" },
      ],
    },
    {
      name: "prepMinutes",
      label: "Prep time (minutes)",
      type: "number",
      min: 0,
      max: 240,
      placeholder: "10",
    },
    { name: "isSpicy", label: "Spicy", type: "boolean" },
  ],
};

/**
 * Pharmacy. Capabilities are declared ahead of the features that will read
 * them, so the surfaces can be built one at a time without touching routing.
 */
export const pharmacyPack: IndustryPack = {
  industries: ["PHARMACY"],
  capabilities: [
    "batch_tracking",
    "expiry_alerts",
    "prescription_log",
    "controlled_register",
  ],
  categoryPresets: [
    "Favorites",
    "Analgesics",
    "Antibiotics",
    "Antimalarials",
    "Vitamins",
    "First Aid",
    "Baby Care",
    "Toiletries",
  ],
  productNoun: { singular: "Drug", plural: "Drugs" },
  posMode: "scan_first",
  productAttributes: [
    {
      name: "nafdacNumber",
      label: "NAFDAC number",
      type: "text",
      maxLength: 32,
      placeholder: "A4-1234",
      // Deliberately permissive: NAFDAC formats vary and rejecting a valid
      // registration is worse than accepting an odd one. Tighten only against
      // real numbers from live shops.
      pattern: /^[A-Za-z0-9]{1,4}[-/]?\d{3,6}$/,
      patternMessage: "Enter the NAFDAC number as printed on the pack",
    },
    {
      name: "drugSchedule",
      label: "Schedule",
      type: "select",
      options: [
        { value: "OTC", label: "Over the counter" },
        { value: "POM", label: "Prescription only" },
        { value: "CONTROLLED", label: "Controlled" },
      ],
    },
    {
      name: "activeIngredient",
      label: "Active ingredient",
      type: "text",
      maxLength: 120,
      placeholder: "Paracetamol 500mg",
    },
    {
      name: "requiresPrescription",
      label: "Requires prescription",
      type: "boolean",
    },
  ],
};

export const fashionPack: IndustryPack = {
  industries: ["FASHION"],
  capabilities: ["variant_matrix", "season_tracking"],
  categoryPresets: [
    "Favorites",
    "Tops",
    "Bottoms",
    "Dresses",
    "Footwear",
    "Bags",
    "Accessories",
  ],
  productNoun: { singular: "Item", plural: "Items" },
  posMode: "standard",
  productAttributes: [
    { name: "size", label: "Size", type: "text", maxLength: 24, placeholder: "M / 42" },
    { name: "color", label: "Colour", type: "text", maxLength: 32, placeholder: "Navy" },
    { name: "material", label: "Material", type: "text", maxLength: 64 },
    {
      name: "season",
      label: "Season",
      type: "select",
      options: [
        { value: "ALL_YEAR", label: "All year" },
        { value: "DRY", label: "Dry season" },
        { value: "RAINY", label: "Rainy season" },
      ],
    },
  ],
};

export const electronicsPack: IndustryPack = {
  industries: ["ELECTRONICS"],
  capabilities: ["serial_tracking", "warranty_tracking"],
  categoryPresets: [
    "Favorites",
    "Phones",
    "Laptops",
    "Accessories",
    "Audio",
    "Cables",
    "Power",
  ],
  productNoun: { singular: "Item", plural: "Items" },
  posMode: "scan_first",
  productAttributes: [
    {
      name: "serialNumber",
      label: "Serial number",
      type: "text",
      maxLength: 64,
      placeholder: "SN-00482913",
    },
    {
      name: "warrantyMonths",
      label: "Warranty (months)",
      type: "number",
      min: 0,
      max: 120,
      placeholder: "12",
    },
    { name: "brand", label: "Brand", type: "text", maxLength: 48 },
  ],
};

export const ALL_PACKS: readonly IndustryPack[] = [
  retailPack,
  foodServicePack,
  pharmacyPack,
  fashionPack,
  electronicsPack,
];

/** Used when a business has no industry set, or one we don't recognise. */
export const FALLBACK_PACK = retailPack;
