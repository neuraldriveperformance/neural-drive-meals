// lib/units.ts

export interface FormattedIngredient {
  originalName: string;
  normalizedName: string;
  category: string;
  primaryAmount: string; // Imperial standard (e.g. "4.38 cups")
  metricAmount: string;  // Metric standard (e.g. "1050 ml")
  dualDisplay: string;   // Full string (e.g. "4.38 cups / 1050 ml")
  rawQuantityGrams?: number;
}

const DENSITY_CONVERSIONS: Record<string, number> = {
  rice_cup: 185,
  oats_cup: 90,
  quinoa_cup: 170,
  flour_cup: 120,
  water_cup: 240,
  milk_cup: 245,
  oil_tbsp: 14,
};

function determineCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/\b(chicken|beef|steak|turkey|salmon|shrimp|pork|fish|tuna|bacon|sausage|lamb)\b/.test(lower)) {
    return 'Meat & Seafood';
  }
  if (/\b(spinach|kale|onion|garlic|pepper|peppers|broccoli|tomato|tomatoes|lemon|lime|avocado|berry|berries|apple|cilantro|lettuce|cucumber|zucchini|carrot|carrots)\b/.test(lower)) {
    return 'Produce';
  }
  if (/\b(milk|cheese|yogurt|butter|cream|egg|eggs)\b/.test(lower)) {
    return 'Dairy & Eggs';
  }
  if (/\b(rice|oats|quinoa|bread|pasta|tortilla|tortillas|barley|grits|flour|cereal)\b/.test(lower)) {
    return 'Grains & Bakery';
  }
  return 'Pantry & Other';
}

function normalizeName(rawName: string): string {
  let name = rawName.toLowerCase();
  name = name.replace(/,\s*(cooked|drained|rinsed|raw|chopped|diced|minced|fresh|frozen|dry|uncooked)/g, '');
  name = name.replace(/\b(cooked|drained|rinsed|raw|chopped|diced|minced|fresh|frozen|dry|uncooked)\b/g, '');
  name = name.replace(/\s+/g, ' ').trim();
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
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

  const normalizedName = normalizeName(itemName);
  const category = determineCategory(normalizedName);
  const lowerName = normalizedName.toLowerCase();

  let primaryAmount = '';
  let metricAmount = '';
  let baseGrams = 0;

  // --- RULE 1: MEAT & POULTRY (lbs / oz -> g / kg) ---
  if (category === 'Meat & Seafood' || /\b(chicken|beef|steak|turkey|pork|salmon|shrimp|fish)\b/.test(lowerName)) {
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
  
  // --- RULE 2: GRAINS & DRY STAPLES (cups uncooked -> g) ---
  else if (category === 'Grains & Bakery' || /\b(rice|quinoa|oats|oatmeal|pasta|flour)\b/.test(lowerName)) {
    let cups = qty;
    if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') cups = qty / 16;
    else if (unit === 'oz' || unit === 'ounce') cups = qty / 8;
    else if (unit === 'g' || unit === 'grams') cups = qty / 150;

    let density = 150;
    if (lowerName.includes('rice')) density = DENSITY_CONVERSIONS.rice_cup;
    else if (lowerName.includes('oat')) density = DENSITY_CONVERSIONS.oats_cup;
    else if (lowerName.includes('quinoa')) density = DENSITY_CONVERSIONS.quinoa_cup;
    else if (lowerName.includes('flour')) density = DENSITY_CONVERSIONS.flour_cup;

    baseGrams = Math.round(cups * density);
    const roundedCups = parseFloat(cups.toFixed(2));
    primaryAmount = `${roundedCups} ${roundedCups === 1 ? 'cup' : 'cups'} (uncooked)`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 3: CANNED & PACKAGED GOODS (oz -> g) ---
  else if (/\b(can|canned|jar)\b/.test(lowerName) || unit === 'can' || unit === 'cans') {
    const canOz = qty * 15;
    baseGrams = Math.round(canOz * 28.3495);
    primaryAmount = `${qty} can (${canOz} oz)`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 4: LIQUIDS, OILS & SPOON MEASURES (STEP-UP CASCADE: TBSP -> CUPS) ---
  else if (/\b(tbsp|tsp|tablespoon|teaspoon|cup|cups|c|fl oz|oz|ml|l)\b/.test(unit)) {
    let totalTbsp = 0;

    if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') totalTbsp = qty / 3;
    else if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') totalTbsp = qty;
    else if (unit === 'cup' || unit === 'cups' || unit === 'c') totalTbsp = qty * 16;
    else if (unit === 'fl oz' || unit === 'oz') totalTbsp = qty * 2;
    else if (unit === 'ml') totalTbsp = qty / 14.7868;

    const totalMl = Math.round(totalTbsp * 14.7868);

    // Step-up cascade: convert large tbsp totals into cups (e.g. 70 tbsp -> 4.38 cups)
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