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
  flour_cup: 120,
  pasta_cup: 100,
  barley_cup: 200,
  water_cup: 240,
  milk_cup: 245,
  oil_tbsp: 14,
};

const GRAIN_REGEX = /\b(rice|oats|oatmeal|quinoa|pasta|spaghetti|penne|macaroni|barley|farro|couscous|bulgur|grits|polenta|lentils)\b/i;

export function isGrainItem(name: string): boolean {
  return GRAIN_REGEX.test(name.toLowerCase());
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
  if (/\b(rice|oats|oatmeal|quinoa|bread|pasta|spaghetti|penne|tortilla|tortillas|barley|farro|couscous|grits|flour|cereal|bagel|bagels|pita|wrap|wraps)\b/.test(lower)) {
    return 'Grains & Bakery';
  }
  return 'Pantry & Other';
}

export function normalizeIngredientName(rawName: string): string {
  let name = rawName.toLowerCase();

  // Strip parenthetical notes like "(uncooked)", "(cooked)", "(boneless, skinless)"
  name = name.replace(/\([^)]*\)/g, '');

  // Strip preparation and state modifiers
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
  name = name.replace(/,\s*.*$/, ''); // Strip trailing comma clauses (e.g., ", diced")
  name = name.replace(modifierPattern, '');
  name = name.replace(/\s+/g, ' ').trim();

  // Title Case
  const titleCased = name.replace(/\b\w/g, (char) => char.toUpperCase());

  // CAVEAT: Protect grains so they explicitly remain labeled as (Uncooked)
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

export function standardizeIngredient(rawInput: string | any): FormattedIngredient {
  let rawStr = '';
  let explicitAmount = '';

  if (typeof rawInput === 'string') {
    rawStr = rawInput.trim();
  } else if (rawInput && typeof rawInput === 'object') {
    rawStr = (rawInput.item || rawInput.name || '').trim();
    explicitAmount = rawInput.amount || rawInput.quantity || '';
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

  const normalizedName = normalizeIngredientName(itemName);
  const category = determineCategory(normalizedName);
  const lowerName = normalizedName.toLowerCase();

  let primaryAmount = '';
  let metricAmount = '';
  let baseGrams = 0;

  // --- RULE 1: MEAT & POULTRY (lbs / oz -> g / kg) ---
  if (category === 'Meat & Seafood') {
    let totalOz = 0;
    if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') {
      totalOz = qty * 16;
    } else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      totalOz = qty;
    } else if (unit === 'g' || unit === 'grams') {
      totalOz = qty / 28.3495;
    } else {
      totalOz = qty * 4;
    }

    baseGrams = Math.round(totalOz * 28.3495);
    const lbs = parseFloat((totalOz / 16).toFixed(2));
    const roundedOz = Math.round(totalOz);

    primaryAmount = lbs >= 1 ? `${lbs} lbs (${roundedOz} oz)` : `${roundedOz} oz`;
    metricAmount = baseGrams >= 1000 ? `${(baseGrams / 1000).toFixed(2)} kg` : `${baseGrams} g`;
  }

  // --- RULE 2: GRAINS & DRY STAPLES (Always measured & labeled Uncooked) ---
  else if (isGrainItem(lowerName)) {
    let cups = qty;
    if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') cups = qty / 16;
    else if (unit === 'oz' || unit === 'ounce') cups = qty / 8;
    else if (unit === 'g' || unit === 'grams') cups = qty / 150;

    // If recipe listed cooked cups (typically ~2.5x volume of dry), adjust back to dry uncooked ratio
    if (/\bcooked\b/i.test(rawStr) && !/\buncooked\b/i.test(rawStr)) {
      cups = cups / 2.5;
    }

    let density = 160;
    if (lowerName.includes('rice')) density = DENSITY_CONVERSIONS.rice_cup;
    else if (lowerName.includes('oat')) density = DENSITY_CONVERSIONS.oats_cup;
    else if (lowerName.includes('quinoa')) density = DENSITY_CONVERSIONS.quinoa_cup;
    else if (lowerName.includes('pasta')) density = DENSITY_CONVERSIONS.pasta_cup;
    else if (lowerName.includes('barley')) density = DENSITY_CONVERSIONS.barley_cup;

    baseGrams = Math.round(cups * density);
    const roundedCups = parseFloat(cups.toFixed(2));
    primaryAmount = `${roundedCups} ${roundedCups === 1 ? 'cup' : 'cups'} (uncooked)`;
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
  else if (/\b(tbsp|tsp|tablespoon|teaspoon|cup|cups|c|fl oz|oz|ml|l)\b/.test(unit)) {
    let totalTbsp = 0;

    if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') totalTbsp = qty / 3;
    else if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') totalTbsp = qty;
    else if (unit === 'cup' || unit === 'cups' || unit === 'c') totalTbsp = qty * 16;
    else if (unit === 'fl oz' || unit === 'oz') totalTbsp = qty * 2;
    else if (unit === 'ml') totalTbsp = qty / 14.7868;

    const totalMl = Math.round(totalTbsp * 14.7868);

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

  // --- RULE 5: PRODUCE / COUNT ITEMS ---
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