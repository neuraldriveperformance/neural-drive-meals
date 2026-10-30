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
  full_data: any;
  created_at?: string;
}

export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('saved_recipes')
    .insert([{
      user_id: user.id,
      recipe_name: recipe.name || recipe.title || 'Untitled Recipe',
      meal_type: recipe.type || recipe.mealType || 'Meal',
      calories: recipe.calories || recipe.macros?.calories || 0,
      protein: recipe.protein || recipe.macros?.protein || 0,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      full_data: recipe,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving recipe:', error);
    return null;
  }

  return data as SavedRecipe;
}

export async function unsaveRecipe(recipeName: string): Promise<boolean> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
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