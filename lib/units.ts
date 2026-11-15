// lib/units.ts

export interface FormattedIngredient {
  originalName: string;
  normalizedName: string;
  category: string;
  primaryAmount: string;
  metricAmount: string;
  dualDisplay: string;
  rawQuantityGrams?: number;
}

const DENSITY_CONVERSIONS: Record<string, number> = {
  rice_cup: 185,
  oats_cup: 90,
  quinoa_cup: 170,
  farro_cup: 170,
  couscous_cup: 175,
  bulgur_cup: 140,
  flour_cup: 120,
  pasta_cup: 100,
  barley_cup: 200,
  lentils_cup: 190,
  water_cup: 240,
  milk_cup: 245,
  oil_tbsp: 14,
};

// Expansion ratios (Cooked Volume -> Dry Uncooked Volume)
const COOKED_TO_DRY_RATIO: Record<string, number> = {
  quinoa: 3.0,
  rice: 2.5,
  barley: 2.5,
  farro: 2.5,
  couscous: 2.5,
  bulgur: 2.5,
  lentils: 2.5,
  oats: 2.0,
  oatmeal: 2.0,
  pasta: 2.0,
  spaghetti: 2.0,
  penne: 2.0,
  macaroni: 2.0,
};

const GRAIN_REGEX = /\b(rice|oats|oatmeal|quinoa|pasta|spaghetti|penne|macaroni|barley|farro|couscous|bulgur|grits|polenta|lentils)\b/i;

export function isGrainItem(name: string): boolean {
  return GRAIN_REGEX.test(name.toLowerCase());
}

/**
 * Strips any pre-formatted dual-unit prefix (e.g., "2.8 cups / 476 g Cooked Farro" -> "2.8 cups Cooked Farro")
 * so downstream parsers never accidentally include "/ 476 g" in the ingredient name.
 */
export function stripDualUnitString(rawText: string): string {
  return rawText
    .replace(
      /^([\d\.\/]+\s*(?:lbs?\s*\(\d+\s*oz\)|oz|lbs?|cups?(?:\s*\(uncooked\))?|tbsp|tsp|can\s*\(\d+\s*oz\)|medium|[A-Za-z]+)?)\s*\/\s*(?:approx\.\s*)?[\d\.]+\s*(?:g|kg|ml|L)\s+/i,
      '$1 '
    )
    .trim();
}

/**
 * Converts a cooked grain quantity back to its raw dry uncooked equivalent
 * BEFORE name normalization strips the "cooked" modifier.
 */
export function convertCookedGrainToDry(rawText: string, qty: number): number {
  const lower = rawText.toLowerCase();
  if (!isGrainItem(lower)) return qty;

  if (/\bcooked\b/i.test(lower) && !/\buncooked\b/i.test(lower)) {
    for (const [grain, ratio] of Object.entries(COOKED_TO_DRY_RATIO)) {
      if (lower.includes(grain)) {
        return qty / ratio;
      }
    }
    return qty / 2.5;
  }

  return qty;
}

export function determineCategory(name: string): string {
  const lower = name.toLowerCase();

  if (/\b(chicken|beef|steak|turkey|salmon|shrimp|pork|fish|tuna|bacon|sausage|lamb|cod|tilapia|bison|venison|tofu|tempeh)\b/.test(lower)) {
    return 'Meat & Seafood';
  }
  if (/\b(spinach|kale|onion|onions|garlic|pepper|peppers|bell pepper|jalapeno|broccoli|cauliflower|tomato|tomatoes|cherry tomatoes|roma tomatoes|lemon|lemons|lime|limes|avocado|avocados|berry|berries|strawberry|strawberries|blueberry|blueberries|raspberry|raspberries|apple|apples|banana|bananas|cilantro|parsley|basil|mint|lettuce|romaine|arugula|cucumber|cucumbers|zucchini|zucchinis|squash|carrot|carrots|celery|asparagus|green beans|potato|potatoes|sweet potato|sweet potatoes|mushroom|mushrooms|cabbage|ginger|scallion|scallions|green onion|green onions)\b/.test(lower)) {
    return 'Produce';
  }
  if (/\b(milk|cheese|cheddar|mozzarella|parmesan|feta|yogurt|greek yogurt|butter|ghee|cream|sour cream|cottage cheese|egg|eggs|egg whites)\b/.test(lower)) {
    return 'Dairy & Eggs';
  }
  if (/\b(rice|oats|oatmeal|quinoa|bread|pasta|spaghetti|penne|tortilla|tortillas|barley|farro|couscous|bulgur|grits|flour|cereal|bagel|bagels|pita|wrap|wraps)\b/.test(lower)) {
    return 'Grains & Bakery';
  }
  return 'Pantry & Other';
}

export function normalizeIngredientName(rawName: string): string {
  let name = rawName.toLowerCase();

  // Remove any stray metric slash prefixes if present
  name = name.replace(/^\/\s*(?:approx\.\s*)?[\d\.]+\s*(?:g|kg|ml|l)\s+/i, '');

  // Strip parenthetical notes like "(uncooked)", "(cooked)", "(boneless, skinless)"
  name = name.replace(/\([^)]*\)/g, '');

  const modifiers = [
    'cooked', 'uncooked', 'raw', 'dry', 'dried',
    'grilled', 'baked', 'roasted', 'pan-seared', 'seared', 'sauteed', 'sautéed',
    'steamed', 'boiled', 'poached', 'fried', 'air-fried', 'smoked', 'marinated',
    'seasoned', 'shredded', 'sliced', 'diced', 'chopped', 'minced', 'crushed',
    'grated', 'julienned', 'halved', 'quartered', 'cubed', 'peeled', 'seeded',
    'drained', 'rinsed', 'fresh', 'frozen', 'canned', 'boneless', 'skinless',
    'lean', 'extra-lean', 'organic', 'whole', 'low-fat', 'fat-free'
  ];

  const modifierPattern = new RegExp(`\\b(${modifiers.join('|')})\\b`, 'gi');
  name = name.replace(/,\s*.*$/, '');
  name = name.replace(modifierPattern, '');
  name = name.replace(/\s+/g, ' ').trim();

  const titleCased = name.replace(/\b\w/g, (char) => char.toUpperCase());

  if (isGrainItem(titleCased)) {
    return `${titleCased} (Uncooked)`;
  }

  return titleCased;
}

function parseQuantity(rawQty: string): number {
  if (!rawQty) return 1;
  const parts = rawQty.trim().split(' ');
  let total = 0;

  parts.forEach((part) => {
    if (part.includes('/')) {
      const [num, den] = part.split('/');
      if (den && !isNaN(parseFloat(num)) && !isNaN(parseFloat(den))) {
        total += parseFloat(num) / parseFloat(den);
      }
    } else if (!isNaN(parseFloat(part))) {
      total += parseFloat(part);
    }
  });

  return total || 1;
}

export function standardizeIngredient(
  rawInput: string | any,
  mode: 'recipe' | 'grocery' = 'recipe'
): FormattedIngredient {
  let rawStr = '';
  let explicitAmount = '';

  if (typeof rawInput === 'string') {
    rawStr = stripDualUnitString(rawInput.trim());
  } else if (rawInput && typeof rawInput === 'object') {
    rawStr = (rawInput.item || rawInput.name || '').trim();
    const rawAmt = (rawInput.amount || rawInput.quantity || '').toString().trim();
    explicitAmount = rawAmt.includes('/') ? rawAmt.split('/')[0].trim() : rawAmt;
  }

  const fullText = explicitAmount ? `${explicitAmount} ${rawStr}` : rawStr;
  const match = fullText.match(/^([\d\.\/\s]+)?\s*([A-Za-z]+)?\s+(.*)$/);

  let qty = 1;
  let unit = '';
  let itemName = fullText;

  if (match) {
    if (match[1]) qty = parseQuantity(match[1]);
    if (match[2]) unit = match[2].toLowerCase().trim();
    if (match[3]) itemName = match[3].trim();
  }

  if (mode === 'grocery') {
    qty = convertCookedGrainToDry(fullText, qty);
  }

  const normalizedName = normalizeIngredientName(itemName);
  const category = determineCategory(normalizedName);
  const lowerName = normalizedName.toLowerCase();

  let primaryAmount = '';
  let metricAmount = '';
  let baseGrams = 0;

  // --- RULE 1: MEAT & POULTRY (oz / lbs <-> g / kg) ---
  if (category === 'Meat & Seafood') {
    let totalOz = 0;
    if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') {
      totalOz = qty * 16;
    } else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      totalOz = qty;
    } else if (unit === 'g' || unit === 'gram' || unit === 'grams') {
      totalOz = qty / 28.3495;
    } else if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
      totalOz = (qty * 1000) / 28.3495;
    } else {
      totalOz = qty * 4;
    }

    baseGrams = unit === 'g' || unit === 'grams' ? Math.round(qty) : Math.round(totalOz * 28.3495);
    const lbs = parseFloat((totalOz / 16).toFixed(2));
    const roundedOz = parseFloat(totalOz.toFixed(1));

    primaryAmount = lbs >= 1 ? `${lbs} lbs (${Math.round(totalOz)} oz)` : `${roundedOz} oz`;
    metricAmount = baseGrams >= 1000 ? `${(baseGrams / 1000).toFixed(2)} kg` : `${baseGrams} g`;
  }

  // --- RULE 2: GRAINS & DRY STAPLES ---
  else if (isGrainItem(lowerName)) {
    let cups = qty;
    if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') cups = qty / 16;
    else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') cups = qty / 8;
    else if (unit === 'g' || unit === 'gram' || unit === 'grams') cups = qty / 170;

    let density = 170;
    if (lowerName.includes('rice')) density = DENSITY_CONVERSIONS.rice_cup;
    else if (lowerName.includes('oat')) density = DENSITY_CONVERSIONS.oats_cup;
    else if (lowerName.includes('quinoa')) density = DENSITY_CONVERSIONS.quinoa_cup;
    else if (lowerName.includes('farro')) density = DENSITY_CONVERSIONS.farro_cup;
    else if (lowerName.includes('couscous')) density = DENSITY_CONVERSIONS.couscous_cup;
    else if (lowerName.includes('bulgur')) density = DENSITY_CONVERSIONS.bulgur_cup;
    else if (lowerName.includes('pasta')) density = DENSITY_CONVERSIONS.pasta_cup;
    else if (lowerName.includes('barley')) density = DENSITY_CONVERSIONS.barley_cup;
    else if (lowerName.includes('lentil')) density = DENSITY_CONVERSIONS.lentils_cup;

    baseGrams = unit === 'g' || unit === 'grams' ? Math.round(qty) : Math.round(cups * density);
    const roundedCups = parseFloat(cups.toFixed(2));
    const stateTag = mode === 'grocery' ? ' (uncooked)' : '';
    primaryAmount = `${roundedCups} ${roundedCups === 1 ? 'cup' : 'cups'}${stateTag}`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 3: CANNED & PACKAGED GOODS ---
  else if (/\b(can|canned|jar)\b/.test(lowerName) || unit === 'can' || unit === 'cans') {
    const canOz = qty * 15;
    baseGrams = Math.round(canOz * 28.3495);
    primaryAmount = `${qty} can (${canOz} oz)`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 4: LIQUIDS, OILS & SPOON MEASURES (STEP-UP CASCADE) ---
  else if (/\b(tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|cup|cups|c|fl oz|oz|ml|l)\b/.test(unit)) {
    let totalTbsp = 0;

    if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') totalTbsp = qty / 3;
    else if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') totalTbsp = qty;
    else if (unit === 'cup' || unit === 'cups' || unit === 'c') totalTbsp = qty * 16;
    else if (unit === 'fl oz' || unit === 'oz') totalTbsp = qty * 2;
    else if (unit === 'ml') totalTbsp = qty / 14.7868;
    else if (unit === 'l') totalTbsp = (qty * 1000) / 14.7868;

    const totalMl = unit === 'ml' ? Math.round(qty) : Math.round(totalTbsp * 14.7868);

    if (totalTbsp >= 4) {
      const cups = parseFloat((totalTbsp / 16).toFixed(2));
      primaryAmount = `${cups} ${cups === 1 ? 'cup' : 'cups'}`;
    } else if (totalTbsp < 1 && totalTbsp > 0) {
      const tsp = parseFloat((totalTbsp * 3).toFixed(1));
      primaryAmount = `${tsp} tsp`;
    } else {
      const roundedTbsp = parseFloat(totalTbsp.toFixed(1));
      primaryAmount = `${roundedTbsp} tbsp`;
    }

    metricAmount = totalMl >= 1000 ? `${(totalMl / 1000).toFixed(2)} L` : `${totalMl} ml`;
  }

  // --- RULE 5: PURE WEIGHTS FOR PRODUCE/DAIRY/PANTRY ---
  else if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    baseGrams = Math.round(qty);
    const oz = parseFloat((qty / 28.3495).toFixed(1));
    primaryAmount = `${oz} oz`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 6: PRODUCE / COUNT ITEMS ---
  else {
    const roundedQty = parseFloat(qty.toFixed(2));
    baseGrams = Math.round(qty * 100);
    primaryAmount = unit ? `${roundedQty} ${unit}` : `${roundedQty} medium`;
    metricAmount = `approx. ${baseGrams} g`;
  }

  const dualDisplay = `${primaryAmount} / ${metricAmount}`;

  return {
    originalName: itemName,
    normalizedName,
    category,
    primaryAmount,
    metricAmount,
    dualDisplay,
    rawQuantityGrams: baseGrams,
  };
}