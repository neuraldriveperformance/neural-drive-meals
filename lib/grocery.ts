// lib/grocery.ts
import { createBrowserClient } from '@supabase/ssr';
import {
  standardizeIngredient,
  normalizeIngredientName,
  determineCategory,
  convertCookedGrainToDry,
  stripDualUnitString,
} from '@/lib/units';

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

export function parseIngredientsToGroceryList(
  rawIngredients: any[],
  enableBulkPrep: boolean = false
): GroceryItem[] {
  const map = new Map<
    string,
    {
      totalQuantity: number;
      unit: string;
      category: string;
      originalName: string;
      seenRecipes: Set<string>;
    }
  >();

  rawIngredients.forEach((ing) => {
    let rawStr = '';
    let explicitAmount = '';
    let recipeName = '';

    if (typeof ing === 'string') {
      rawStr = stripDualUnitString(ing.trim());
    } else if (ing && typeof ing === 'object') {
      rawStr = stripDualUnitString((ing.item || ing.name || '').trim());
      const rawAmt = (ing.amount || ing.quantity || '').toString().trim();
      explicitAmount = rawAmt.includes('/') ? rawAmt.split('/')[0].trim() : rawAmt;
      recipeName = (ing.recipeName || ing.mealName || '').trim().toLowerCase();
    }

    if (!rawStr || rawStr.toLowerCase().includes('self-provided')) return;

    const fullText = explicitAmount ? `${explicitAmount} ${rawStr}` : rawStr;
    const match = fullText.match(/^([\d\.\/]+)\s*([A-Za-z]+)?\s+(.*)$/);

    let qty = 1;
    let rawUnit = '';
    let rawItemName = fullText;

    if (match) {
      const rawQty = match[1];
      rawUnit = match[2] ? match[2].trim() : '';
      rawItemName = match[3] ? match[3].trim() : fullText;

      if (rawQty.includes('/')) {
        const [num, den] = rawQty.split('/');
        qty = parseFloat(num) / parseFloat(den);
      } else {
        qty = parseFloat(rawQty);
      }
    }

    // Convert cooked grain quantities (e.g., "2.8 cups Cooked Farro") to dry uncooked equivalent
    qty = convertCookedGrainToDry(fullText, qty);

    const normalized = normalizeIngredientName(rawItemName);
    const category = determineCategory(normalized);
    const key = normalized;

    if (!map.has(key)) {
      map.set(key, {
        totalQuantity: 0,
        unit: rawUnit,
        category,
        originalName: normalized,
        seenRecipes: new Set<string>(),
      });
    }

    const entry = map.get(key)!;

    if (enableBulkPrep) {
      const recipeKey = recipeName || `anon-${normalized}`;
      if (entry.seenRecipes.has(recipeKey)) {
        return;
      }
      entry.seenRecipes.add(recipeKey);
      entry.totalQuantity += qty;
    } else {
      entry.totalQuantity += qty;
    }
  });

  const items: GroceryItem[] = [];
  let index = 1;

  map.forEach((val) => {
    if (val.totalQuantity <= 0) return;

    const roundedQty = parseFloat(val.totalQuantity.toFixed(2));
    const rawCombinedString = val.unit
      ? `${roundedQty} ${val.unit} ${val.originalName}`
      : `${roundedQty} ${val.originalName}`;

    // Pass 'grocery' mode so grains keep their "(uncooked)" unit label without re-dividing
    const standardized = standardizeIngredient(rawCombinedString, 'grocery');

    items.push({
      id: `item-${index++}-${Date.now()}`,
      name: val.originalName,
      category: val.category,
      amount: standardized.dualDisplay,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

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

export async function updateGroceryChecklistItems(
  planId: string,
  items: GroceryItem[]
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

export async function updateChecklistTitle(
  planId: string,
  newTitle: string
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

export async function getGroceryChecklist(
  planId: string
): Promise<GroceryChecklistData | null> {
  const supabase = getSupabase();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('grocery_checklists')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .single();

    if (error || !data) return null;

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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