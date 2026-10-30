import { createBrowserClient } from '@supabase/ssr';

export interface GroceryItem {
  id: string;
  name: string;
  amount?: string;
  category: string;
  checked: boolean;
  isCustom?: boolean;
}

export interface GroceryCategoryGroup {
  category: string;
  items: GroceryItem[];
}

// Store Aisle Categories
export const AISLE_CATEGORIES = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Refrigerated',
  'Pantry & Grains',
  'Spices & Condiments',
  'Other / Custom',
] as const;

// Helper to auto-categorize ingredients based on keywords
export function categorizeIngredient(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();

  if (
    lower.includes('chicken') ||
    lower.includes('beef') ||
    lower.includes('salmon') ||
    lower.includes('turkey') ||
    lower.includes('steak') ||
    lower.includes('pork') ||
    lower.includes('fish') ||
    lower.includes('shrimp') ||
    lower.includes('bacon')
  ) {
    return 'Meat & Seafood';
  }

  if (
    lower.includes('spinach') ||
    lower.includes('broccoli') ||
    lower.includes('asparagus') ||
    lower.includes('avocado') ||
    lower.includes('pepper') ||
    lower.includes('onion') ||
    lower.includes('garlic') ||
    lower.includes('lemon') ||
    lower.includes('lime') ||
    lower.includes('berry') ||
    lower.includes('berries') ||
    lower.includes('apple') ||
    lower.includes('banana') ||
    lower.includes('sweet potato') ||
    lower.includes('potato') ||
    lower.includes('tomato') ||
    lower.includes('lettuce') ||
    lower.includes('kale')
  ) {
    return 'Produce';
  }

  if (
    lower.includes('egg') ||
    lower.includes('eggs') ||
    lower.includes('milk') ||
    lower.includes('cheese') ||
    lower.includes('yogurt') ||
    lower.includes('butter') ||
    lower.includes('cream')
  ) {
    return 'Dairy & Refrigerated';
  }

  if (
    lower.includes('oil') ||
    lower.includes('salt') ||
    lower.includes('pepper') ||
    lower.includes('powder') ||
    lower.includes('spice') ||
    lower.includes('sauce') ||
    lower.includes('dressing') ||
    lower.includes('honey') ||
    lower.includes('vinegar') ||
    lower.includes('mustard')
  ) {
    return 'Spices & Condiments';
  }

  return 'Pantry & Grains';
}

// Convert raw ingredients array into structured GroceryItem objects
export function parseIngredientsToGroceryList(ingredients: string[]): GroceryItem[] {
  return ingredients.map((ing, idx) => {
    const category = categorizeIngredient(ing);
    return {
      id: `item-${idx}-${Date.now()}`,
      name: ing,
      category,
      checked: false,
    };
  });
}

// Save checklist state to Supabase
export async function saveGroceryChecklist(planId: string, items: GroceryItem[]): Promise<boolean> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase.from('grocery_checklists').upsert(
    {
      user_id: user.id,
      plan_id: planId,
      items: items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,plan_id' }
  );

  if (error) {
    console.error('Error saving grocery checklist:', error);
    return false;
  }

  return true;
}

// Fetch checklist state from Supabase
export async function getGroceryChecklist(planId: string): Promise<GroceryItem[] | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('grocery_checklists')
    .select('items')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .single();

  if (error || !data) return null;

  return data.items as GroceryItem[];
}