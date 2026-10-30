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

export function parseIngredientsToGroceryList(rawIngredients: any[]): GroceryItem[] {
  const map = new Map<string, { amount: string; category: string }>();

  rawIngredients.forEach((ing) => {
    let name = '';
    let amount = '';
    let category = 'Pantry & Other';

    if (typeof ing === 'string') {
      name = ing.trim();
    } else if (ing && typeof ing === 'object') {
      name = (ing.item || ing.name || '').trim();
      amount = ing.amount || ing.quantity || '';
      if (ing.category) category = ing.category;
    }

    if (!name) return;

    const lower = name.toLowerCase();
    if (category === 'Pantry & Other') {
      if (
        lower.includes('chicken') ||
        lower.includes('beef') ||
        lower.includes('steak') ||
        lower.includes('turkey') ||
        lower.includes('salmon') ||
        lower.includes('shrimp') ||
        lower.includes('pork') ||
        lower.includes('fish') ||
        lower.includes('egg')
      ) {
        category = 'Meat & Seafood';
      } else if (
        lower.includes('spinach') ||
        lower.includes('kale') ||
        lower.includes('onion') ||
        lower.includes('garlic') ||
        lower.includes('pepper') ||
        lower.includes('broccoli') ||
        lower.includes('tomato') ||
        lower.includes('lemon') ||
        lower.includes('avocado') ||
        lower.includes('berry') ||
        lower.includes('apple')
      ) {
        category = 'Produce';
      } else if (
        lower.includes('milk') ||
        lower.includes('cheese') ||
        lower.includes('yogurt') ||
        lower.includes('butter') ||
        lower.includes('cream')
      ) {
        category = 'Dairy & Eggs';
      } else if (
        lower.includes('rice') ||
        lower.includes('oats') ||
        lower.includes('quinoa') ||
        lower.includes('bread') ||
        lower.includes('pasta') ||
        lower.includes('tortilla')
      ) {
        category = 'Grains & Bakery';
      }
    }

    const key = lower;
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        amount: existing.amount ? `${existing.amount}, ${amount}` : amount,
        category: existing.category || category,
      });
    } else {
      map.set(key, { amount, category });
    }
  });

  const items: GroceryItem[] = [];
  let index = 1;
  map.forEach((value, key) => {
    items.push({
      id: `item-${index++}-${Date.now()}`,
      name: key.replace(/\b\w/g, (c) => c.toUpperCase()),
      category: value.category,
      amount: value.amount,
      checked: false,
    });
  });

  return items;
}

export async function saveGroceryChecklist(
  planId: string,
  items: GroceryItem[],
  planTitle?: string
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('grocery_checklists').upsert(
      {
        user_id: user.id,
        plan_id: planId,
        plan_title: planTitle || 'Weekly Grocery List',
        items,
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
    return data as GroceryChecklistData;
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
    return data as GroceryChecklistData[];
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