import { createBrowserClient } from '@supabase/ssr';

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  amount: string;
  checked: boolean;
}

export interface GroceryChecklistData {
  id?: string;
  user_id?: string;
  plan_id: string;
  plan_title: string;
  items: GroceryItem[];
  created_at?: string;
  updated_at?: string;
}

const getSupabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// --- HELPER FUNCTIONS FOR CLEANING & COMBINING INGREDIENTS ---

function normalizeItemName(rawName: string): string {
  let name = rawName.toLowerCase();

  // Strip common modifiers (comma separated or standalone words)
  name = name.replace(/,\s*(cooked|drained|rinsed|raw|chopped|diced|minced|fresh|frozen|dry)/g, '');
  name = name.replace(/\b(cooked|drained|rinsed|raw|chopped|diced|minced|fresh|frozen|dry)\b/g, '');
  name = name.replace(/\s+/g, ' ').trim();

  // Return formatted Title Case
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

function determineCategory(name: string, fallbackCategory = 'Pantry & Other'): string {
  if (fallbackCategory !== 'Pantry & Other') return fallbackCategory;

  const lower = name.toLowerCase();
  if (/\b(chicken|beef|steak|turkey|salmon|shrimp|pork|fish|egg|eggs|tofu|tempeh)\b/.test(lower)) {
    return 'Meat & Seafood';
  }
  if (/\b(spinach|kale|onion|garlic|pepper|peppers|broccoli|tomato|lemon|lime|avocado|berry|berries|apple|cilantro)\b/.test(lower)) {
    return 'Produce';
  }
  if (/\b(milk|cheese|yogurt|butter|cream)\b/.test(lower)) {
    return 'Dairy & Eggs';
  }
  if (/\b(rice|oats|quinoa|bread|pasta|tortilla|tortillas|barley|grits)\b/.test(lower)) {
    return 'Grains & Bakery';
  }
  return 'Pantry & Other';
}

export function parseIngredientsToGroceryList(rawIngredients: any[]): GroceryItem[] {
  // Map key format: "NormalizedName_unit"
  const map = new Map<string, { totalQuantity: number; unit: string; category: string; originalName: string }>();

  rawIngredients.forEach((ing) => {
    let rawStr = '';
    let explicitAmount = '';
    let categoryInput = 'Pantry & Other';

    if (typeof ing === 'string') {
      rawStr = ing.trim();
    } else if (ing && typeof ing === 'object') {
      rawStr = (ing.item || ing.name || '').trim();
      explicitAmount = ing.amount || ing.quantity || '';
      if (ing.category) categoryInput = ing.category;
    }

    if (!rawStr || rawStr.includes('Self-provided')) return;

    // Combine explicit amount and item string if separate, e.g. "1.4 Cup" + "Cooked Quinoa"
    const fullText = explicitAmount ? `${explicitAmount} ${rawStr}` : rawStr;

    // Regex to match quantity (digits/fractions), optional unit, and remaining ingredient name
    const match = fullText.match(/^([\d\.\/]+)\s*([A-Za-z]+)?\s+(.*)$/);

    if (match) {
      let qty = 0;
      const rawQty = match[1];
      const rawUnit = match[2] ? match[2].trim() : '';
      const rawItemName = match[3] ? match[3].trim() : fullText;

      if (rawQty.includes('/')) {
        const [num, den] = rawQty.split('/');
        qty = parseFloat(num) / parseFloat(den);
      } else {
        qty = parseFloat(rawQty);
      }

      const normalized = normalizeItemName(rawItemName);
      const category = determineCategory(normalized, categoryInput);
      const key = `${normalized}_${rawUnit.toLowerCase()}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.totalQuantity += qty;
      } else {
        map.set(key, {
          totalQuantity: qty,
          unit: rawUnit,
          category,
          originalName: normalized,
        });
      }
    } else {
      // Fallback when no numeric quantity is found
      const normalized = normalizeItemName(rawStr);
      const category = determineCategory(normalized, categoryInput);
      const key = `${normalized}_nounit`;

      if (!map.has(key)) {
        map.set(key, {
          totalQuantity: 1,
          unit: '',
          category,
          originalName: normalized,
        });
      }
    }
  });

  const items: GroceryItem[] = [];
  let index = 1;

  map.forEach((val) => {
    const roundedQty = parseFloat(val.totalQuantity.toFixed(2));
    const amountStr = val.unit ? `${roundedQty} ${val.unit}` : `${roundedQty}`;

    items.push({
      id: `item-${index++}-${Date.now()}`,
      name: val.originalName,
      category: val.category,
      amount: amountStr,
      checked: false,
    });
  });

  return items;
}

// --- SUPABASE PERSISTENCE FUNCTIONS ---

export async function saveGroceryChecklist(
  planId: string,
  items: GroceryItem[],
  planTitle?: string
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Explicitly format items to ensure `checked` boolean is preserved accurately
    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      amount: item.amount || '',
      checked: Boolean(item.checked),
    }));

    const { error } = await supabase.from('grocery_checklists').upsert(
      {
        user_id: user.id,
        plan_id: planId,
        plan_title: planTitle || 'Weekly Grocery List',
        items: formattedItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,plan_id' }
    );

    if (error) {
      console.error('Error saving grocery checklist:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save grocery checklist:', err);
    return false;
  }
}

export async function updateGroceryChecklistItems(planId: string, items: GroceryItem[]): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      amount: item.amount || '',
      checked: Boolean(item.checked),
    }));

    const { error } = await supabase
      .from('grocery_checklists')
      .update({
        items: formattedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('plan_id', planId);

    if (error) {
      console.error('Error updating checklist items:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update checklist items:', err);
    return false;
  }
}

export async function updateChecklistTitle(planId: string, newTitle: string): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grocery_checklists')
      .update({ plan_title: newTitle, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('plan_id', planId);

    return !error;
  } catch (err) {
    console.error('Error updating checklist title:', err);
    return false;
  }
}

export async function getGroceryChecklist(planId: string): Promise<GroceryChecklistData | null> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('grocery_checklists')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .single();

    if (error || !data) return null;

    // Normalize incoming items array to strictly enforce booleans
    const cleanItems = Array.isArray(data.items)
      ? data.items.map((i: any) => ({ ...i, checked: Boolean(i.checked) }))
      : [];

    return {
      ...data,
      items: cleanItems,
    } as GroceryChecklistData;
  } catch (err) {
    console.error('Error fetching checklist:', err);
    return null;
  }
}

export async function getAllUserChecklists(): Promise<GroceryChecklistData[]> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('grocery_checklists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((checklist: any) => ({
      ...checklist,
      items: Array.isArray(checklist.items)
        ? checklist.items.map((i: any) => ({ ...i, checked: Boolean(i.checked) }))
        : [],
    })) as GroceryChecklistData[];
  } catch (err) {
    console.error('Error fetching all checklists:', err);
    return [];
  }
}

export async function deleteGroceryChecklist(planId: string): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grocery_checklists')
      .delete()
      .eq('user_id', user.id)
      .eq('plan_id', planId);

    return !error;
  } catch (err) {
    console.error('Error deleting grocery checklist:', err);
    return false;
  }
}