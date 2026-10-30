import { createBrowserClient } from '@supabase/ssr';

export interface SavedRecipe {
  id?: string;
  user_id?: string;
  recipe_name: string;
  meal_type?: string;
  calories?: number;
  protein?: number;
  ingredients?: any;
  instructions?: any;
  full_data?: any;
  created_at?: string;
}

export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved recipes:', error);
    return [];
  }

  return data as SavedRecipe[];
}

export async function saveRecipe(recipe: any): Promise<SavedRecipe | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert('Please sign in to bookmark recipes!');
    return null;
  }

  // Primary payload with full metadata
  const payload: any = {
    user_id: user.id,
    recipe_name: recipe.name || recipe.title || 'Untitled Recipe',
    meal_type: recipe.type || 'Meal',
    calories: Number(recipe.calories) || 0,
    protein: Number(recipe.protein) || 0,
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    full_data: recipe,
  };

  let { data, error } = await supabase
    .from('saved_recipes')
    .insert([payload])
    .select()
    .single();

  // Fallback to basic payload if schema column mismatch occurs
  if (error) {
    console.warn('Full payload insert failed, retrying with core columns:', error.message);
    const fallbackPayload = {
      user_id: user.id,
      recipe_name: recipe.name || recipe.title || 'Untitled Recipe',
      meal_type: recipe.type || 'Meal',
    };

    const retry = await supabase
      .from('saved_recipes')
      .insert([fallbackPayload])
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Error saving recipe:', error);
    alert(`Failed to bookmark: ${error.message}`);
    return null;
  }

  return data as SavedRecipe;
}

export async function unsaveRecipe(recipeName: string): Promise<boolean> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', user.id)
    .eq('recipe_name', recipeName);

  if (error) {
    console.error('Error removing saved recipe:', error);
    return false;
  }

  return true;
}