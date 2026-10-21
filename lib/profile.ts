import { createBrowserClient } from '@supabase/ssr';

export interface UserProfile {
  id: string;
  daily_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
  dietary_preferences: string[];
  household_info: {
    household_size: number;
    dependents: Array<{
      age_group: string; // e.g., 'child', 'teen'
      allergies_restrictions: string[];
    }>;
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // If no profile exists yet, create one
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert([{ id: user.id }])
      .select()
      .single();
    return newProfile as UserProfile;
  }

  return data as UserProfile;
}

export async function updateUserProfile(profileUpdates: Partial<UserProfile>): Promise<boolean> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update({ ...profileUpdates, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return !error;
}