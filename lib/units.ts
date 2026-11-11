// lib/units.ts

export interface FormattedIngredient {
  originalName: string;
  normalizedName: string;
  category: string;
  primaryAmount: string; // Imperial standard (e.g. "1.5 lbs (24 oz)")
  metricAmount: string;  // Metric standard (e.g. "680 g")
  dualDisplay: string;   // Full string (e.g. "1.5 lbs (24 oz) / 680 g")
  rawQuantityGrams?: number; // Base weight in grams for precise cross-recipe aggregation
}

// Gram/ml weights per standard unit for density estimates
const DENSITY_CONVERSIONS: Record<string, number> = {
  // Grains (raw/uncooked)
  rice_cup: 185,
  oats_cup: 90,
  quinoa_cup: 170,
  flour_cup: 120,
  // Liquids
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

/**
  Parse quantity strings including fractions ("1 1/2", "3/4", "1.5")
 */
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

/**
 * Standardize any ingredient string into Imperial + Metric dual units
 */
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
  
  // Match regex: [Quantity] [Unit] [Item Name]
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
      totalOz = qty * 4; // Default baseline ~4 oz per serving if unstated
    }

    baseGrams = Math.round(totalOz * 28.3495);
    const lbs = parseFloat((totalOz / 16).toFixed(2));
    const roundedOz = Math.round(totalOz);

    primaryAmount = lbs >= 1 ? `${lbs} lbs (${roundedOz} oz)` : `${roundedOz} oz`;
    metricAmount = baseGrams >= 1000 ? `${(baseGrams / 1000).toFixed(2)} kg` : `${baseGrams} g`;
  }
  
  // --- RULE 2: GRAINS & DRY STAPLES (cups uncooked -> g) ---
  else if (category === 'Grains & Bakery' || /\b(rice|quinoa|oats|oatmeal|pasta|flour)\b/.test(lowerName)) {
    if (unit === 'cup' || unit === 'cups' || unit === 'c') {
      let density = 150; // Average default dry cup weight
      if (lowerName.includes('rice')) density = DENSITY_CONVERSIONS.rice_cup;
      else if (lowerName.includes('oat')) density = DENSITY_CONVERSIONS.oats_cup;
      else if (lowerName.includes('quinoa')) density = DENSITY_CONVERSIONS.quinoa_cup;
      else if (lowerName.includes('flour')) density = DENSITY_CONVERSIONS.flour_cup;

      baseGrams = Math.round(qty * density);
      const roundedCups = parseFloat(qty.toFixed(2));
      primaryAmount = `${roundedCups} ${roundedCups === 1 ? 'cup' : 'cups'} (uncooked)`;
      metricAmount = `${baseGrams} g`;
    } else if (unit === 'g' || unit === 'grams') {
      baseGrams = qty;
      const cups = parseFloat((qty / 150).toFixed(2));
      primaryAmount = `${cups} cups (uncooked)`;
      metricAmount = `${Math.round(qty)} g`;
    } else {
      primaryAmount = `${qty} ${unit || 'serving'}`.trim();
      metricAmount = `${Math.round(qty * 100)} g`;
    }
  }

  // --- RULE 3: CANNED & PACKAGED GOODS (oz -> g) ---
  else if (/\b(can|canned|jar)\b/.test(lowerName) || unit === 'can' || unit === 'cans') {
    const canOz = qty * 15; // Standard 15 oz can standard
    baseGrams = Math.round(canOz * 28.3495);
    primaryAmount = `${qty} can (${canOz} oz)`;
    metricAmount = `${baseGrams} g`;
  }

  // --- RULE 4: LIQUIDS & OILS (tbsp / tsp / fl oz / cups -> ml) ---
  else if (/\b(tbsp|tsp|tablespoon|teaspoon|cup|cups|fl oz|oz|ml|l)\b/.test(unit)) {
    let ml = 0;
    if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') ml = qty * 14.7868;
    else if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') ml = qty * 4.92892;
    else if (unit === 'cup' || unit === 'cups' || unit === 'c') ml = qty * 240;
    else if (unit === 'fl oz' || unit === 'oz') ml = qty * 29.5735;
    else if (unit === 'ml') ml = qty;

    const roundedMl = Math.round(ml);
    const roundedQty = parseFloat(qty.toFixed(2));
    primaryAmount = `${roundedQty} ${unit}`;
    metricAmount = `${roundedMl} ml`;
  }

  // --- RULE 5: PRODUCE / COUNT ITEMS (Count -> Estimated Grams) ---
  else {
    const roundedQty = parseFloat(qty.toFixed(2));
    baseGrams = Math.round(qty * 100); // 100g average item estimate
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