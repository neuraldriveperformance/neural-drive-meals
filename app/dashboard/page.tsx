'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import ProfileModal from '../Components/ProfileModal';
import { getSavedRecipes, unsaveRecipe, SavedRecipe } from '@/lib/recipes';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'recipes'>('plans');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Fetch Saved Meal Plans
        const { data: plansData, error: plansError } = await supabase
          .from('saved_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (!plansError && plansData) {
          setSavedPlans(plansData);
        }

        // 2. Fetch Bookmarked Recipes
        const recipesData = await getSavedRecipes();
        setSavedRecipes(recipesData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleDeletePlan = async (planId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.from('saved_plans').delete().eq('id', planId);
      if (!error) {
        setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const handleDeleteRecipe = async (recipeName: string) => {
    const success = await unsaveRecipe(recipeName);
    if (success) {
      setSavedRecipes((prev) => prev.filter((r) => r.recipe_name !== recipeName));
      if (selectedRecipe?.recipe_name === recipeName) {
        setSelectedRecipe(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-xl text-cyan-400 tracking-tight">
            NeuralDrive Meals
          </span>
          <nav className="flex space-x-4">
            <Link 
              href="/" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Meal Generator
            </Link>
            <Link 
              href="/dashboard" 
              className="text-cyan-400 font-medium text-sm border-b-2 border-cyan-400 pb-1"
            >
              Dashboard
            </Link>
          </nav>
        </div>

        <button
          onClick={async () => {
            const supabase = createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Saved Library</h1>
            <p className="text-slate-400 text-sm mt-1">
              Access your personal meal plans and recipe collection across all devices.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span>⚙️</span> Profile Settings
            </button>
            <Link
              href="/"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              + Create New Plan
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'plans'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Meal Plans ({savedPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recipes'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Recipes ({savedRecipes.length})
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading your saved library...
          </div>
        ) : activeTab === 'plans' ? (
          /* SAVED PLANS TAB */
          savedPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-lg text-slate-100">
                        {plan.title || plan.plan_name || 'Weekly Meal Plan'}
                      </h2>
                      <span className="text-xs text-slate-500">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-4">
                      {plan.plan_data?.calendar?.length || 7}-Day Custom Performance Protocol
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-2">
                    <Link
                      href="/"
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1"
                    >
                      View Plan Details →
                    </Link>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center py-12">
              <p className="text-slate-400 text-sm">No saved meal plans yet.</p>
              <Link
                href="/"
                className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
              >
                Generate a plan to save it here →
              </Link>
            </div>
          )
        ) : (
          /* SAVED RECIPES TAB */
          savedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRecipes.map((recipe) => (
                <div
                  key={recipe.id || recipe.recipe_name}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {recipe.meal_type || 'Recipe'}
                      </span>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.recipe_name)}
                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove bookmark"
                      >
                        ✕
                      </button>
                    </div>

                    <h3 className="font-semibold text-white text-sm leading-snug">
                      {recipe.recipe_name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {recipe.calories ? <span>{recipe.calories} kcal</span> : null}
                      {recipe.protein ? (
                        <span className="text-cyan-400 font-medium">{recipe.protein}g protein</span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-400 rounded-lg transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center py-12">
              <p className="text-slate-400 text-sm">No bookmarked recipes yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Expand any recipe card in the generator and click the <strong className="text-slate-300">🔖 Save</strong> button to pin it here.
              </p>
              <Link
                href="/"
                className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
              >
                Find and bookmark recipes →
              </Link>
            </div>
          )
        )}
      </main>

      {/* RECIPE DETAIL MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedRecipe.recipe_name}</h2>
                <p className="text-xs text-cyan-400">{selectedRecipe.meal_type}</p>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {(selectedRecipe.calories || selectedRecipe.protein) && (
              <div className="flex gap-4 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedRecipe.calories && (
                  <div>
                    Calories: <strong className="text-white">{selectedRecipe.calories}</strong>
                  </div>
                )}
                {selectedRecipe.protein && (
                  <div>
                    Protein: <strong className="text-cyan-400">{selectedRecipe.protein}g</strong>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Ingredients</h4>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {selectedRecipe.ingredients.map((ing: any, i: number) => (
                    <li key={i}>
                      {typeof ing === 'string' ? ing : `${ing.item || ing.name} (${ing.amount || ''})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Instructions</h4>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                  {selectedRecipe.instructions.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Household & Nutrition Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}