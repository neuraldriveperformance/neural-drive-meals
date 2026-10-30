'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import ProfileModal from '../Components/ProfileModal';
import GroceryChecklist from '../Components/GroceryChecklist';
import MealPlanCalendar from '../Components/MealPlanCalendar';
import { getSavedRecipes, unsaveRecipe, SavedRecipe } from '@/lib/recipes';
import { getAllUserChecklists, deleteGroceryChecklist, updateChecklistTitle } from '@/lib/grocery';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'groceries' | 'recipes'>('plans');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const { data: plansData } = await supabase
          .from('saved_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (plansData) setSavedPlans(plansData);

        const userLists = await getAllUserChecklists();
        setChecklists(userLists);

        if (userLists.length > 0) {
          setOpenAccordions({ [userLists[0].plan_id]: true });
        }

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

  const handleStartRename = (planId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(planId);
    setTempTitle(currentTitle);
  };

  const handleSaveTitle = async (planId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!tempTitle.trim()) return;

    const success = await updateChecklistTitle(planId, tempTitle.trim());
    if (success) {
      setChecklists((prev) =>
        prev.map((c) => (c.plan_id === planId ? { ...c, plan_title: tempTitle.trim() } : c))
      );
    }
    setEditingTitleId(null);
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase.from('saved_plans').delete().eq('id', planId);
      if (!error) {
        setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
        await deleteGroceryChecklist(planId);
        setChecklists((prev) => prev.filter((c) => c.plan_id !== planId));
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const handleDeleteChecklist = async (planId: string) => {
    const success = await deleteGroceryChecklist(planId);
    if (success) {
      setChecklists((prev) => prev.filter((c) => c.plan_id !== planId));
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
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Saved Library</h1>
            <p className="text-slate-400 text-sm mt-1">
              Access your meal plans, active grocery lists, and recipe bookmarks across all devices.
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
            onClick={() => setActiveTab('groceries')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'groceries'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Grocery Lists ({checklists.length})
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

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading your dashboard library...
          </div>
        ) : activeTab === 'plans' ? (
          savedPlans.length > 0 ? (
            <div className="space-y-6">
              {savedPlans.map((plan) => {
                const calendar = plan.plan_data?.calendar || plan.calendar || [];

                return (
                  <div
                    key={plan.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors space-y-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                        <div>
                          <h2 className="font-bold text-lg text-slate-100">
                            {plan.title || 'Weekly Performance Meal Plan'}
                          </h2>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {calendar.length || 7}-Day Custom Performance Protocol
                            {plan.plan_data?.estimatedCost ? ` • ${plan.plan_data.estimatedCost}` : ''}
                            {plan.plan_data?.budgetLevel ? ` • ${plan.plan_data.budgetLevel.toUpperCase()} Budget` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                          📅 {new Date(plan.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* FULL UNCOMPRESSED WEEKLY CALENDAR OVERVIEW */}
                      {calendar.length > 0 && (
                        <div className="mt-4 bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {calendar.map((dayObj: any) => (
                              <div
                                key={dayObj.day}
                                className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 space-y-2 flex flex-col justify-between"
                              >
                                <div className="text-center font-extrabold text-cyan-400 text-xs border-b border-slate-800 pb-1">
                                  {dayObj.day}
                                </div>

                                <div className="space-y-2 flex-1">
                                  {dayObj.meals &&
                                    (Array.isArray(dayObj.meals)
                                      ? dayObj.meals
                                      : Object.entries(dayObj.meals).map(([type, data]: [string, any]) => ({
                                          type,
                                          ...data,
                                        }))
                                    ).map((meal: any, idx: number) => {
                                      if (!meal) return null;
                                      return (
                                        <div
                                          key={idx}
                                          className="bg-slate-950/90 border border-slate-800 p-2 rounded text-left space-y-1"
                                        >
                                          <div className="flex justify-between items-center text-[9px] font-extrabold text-cyan-400">
                                            <span className="uppercase">{meal.type}</span>
                                            {meal.calories ? (
                                              <span className="text-slate-400 font-normal">{meal.calories} kcal</span>
                                            ) : null}
                                          </div>

                                          {/* FULL UNCOMPRESSED MEAL TITLE */}
                                          <div className="text-xs font-semibold text-slate-100 leading-snug whitespace-normal break-words">
                                            {meal.name || meal.title || 'Meal'}
                                          </div>

                                          {(meal.protein !== undefined || meal.carbs !== undefined || meal.fat !== undefined) && (
                                            <div className="text-[10px] text-slate-400 font-mono pt-0.5 border-t border-slate-800/50">
                                              P: {meal.protein ?? '-'}g | C: {meal.carbs ?? '-'}g | F: {meal.fat ?? '-'}g
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
                        >
                          👁️ View Full Calendar & Interactive Swaps
                        </button>
                        <button
                          onClick={() => setActiveTab('groceries')}
                          className="text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1"
                        >
                          🛒 Jump to Grocery List
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-xs text-rose-400 hover:underline font-semibold"
                      >
                        Delete Plan
                      </button>
                    </div>
                  </div>
                );
              })}
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
        ) : activeTab === 'groceries' ? (
          checklists.length > 0 ? (
            <div className="space-y-4">
              {checklists.map((checklist) => {
                const isOpen = !!openAccordions[checklist.plan_id];
                const formattedDate = new Date(
                  checklist.created_at || checklist.updated_at
                ).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={checklist.plan_id}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                  >
                    <div
                      onClick={() => toggleAccordion(checklist.plan_id)}
                      className="p-4 bg-slate-900 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between border-b border-slate-800/80 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-bold text-sm">
                          {isOpen ? '▼' : '►'}
                        </span>

                        {editingTitleId === checklist.plan_id ? (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={tempTitle}
                              onChange={(e) => setTempTitle(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === 'Enter' && handleSaveTitle(checklist.plan_id, e)
                              }
                              className="bg-slate-950 border border-cyan-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSaveTitle(checklist.plan_id, e)}
                              className="bg-cyan-500 text-slate-950 text-xs font-bold px-2 py-1 rounded"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white whitespace-normal break-words">
                              {checklist.plan_title || `Grocery List (${formattedDate})`}
                            </h3>
                            <button
                              onClick={(e) =>
                                handleStartRename(
                                  checklist.plan_id,
                                  checklist.plan_title || '',
                                  e
                                )
                              }
                              className="text-[10px] text-slate-400 hover:text-cyan-400 px-1.5 py-0.5 rounded border border-slate-800 transition"
                            >
                              ✏️ Rename
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs text-cyan-400 font-mono bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                          📅 {formattedDate}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChecklist(checklist.plan_id);
                          }}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Delete List
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-4 bg-slate-950">
                        <GroceryChecklist
                          planId={checklist.plan_id}
                          planTitle={checklist.plan_title}
                          initialItems={checklist.items}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center py-12">
              <p className="text-slate-400 text-sm">No active grocery lists saved yet.</p>
              <Link
                href="/"
                className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
              >
                Generate a plan →
              </Link>
            </div>
          )
        ) : savedRecipes.length > 0 ? (
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

                  <h3 className="font-semibold text-white text-sm leading-snug whitespace-normal break-words">
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
            <Link
              href="/"
              className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
            >
              Find and bookmark recipes →
            </Link>
          </div>
        )}
      </main>

      {/* FULL PROTOCOL MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[95vw] w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white whitespace-normal break-words">
                  {selectedPlan.title || 'Weekly Protocol'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Saved on {new Date(selectedPlan.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {(selectedPlan.plan_data?.calendar || selectedPlan.calendar) && (
              <MealPlanCalendar 
                calendarDays={selectedPlan.plan_data?.calendar || selectedPlan.calendar} 
                isModal={true}
              />
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
              >
                Close Protocol Details
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white whitespace-normal break-words">
                  {selectedRecipe.recipe_name}
                </h2>
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
                    <li key={i} className="whitespace-normal break-words">
                      {typeof ing === 'string'
                        ? ing
                        : `${ing.item || ing.name} (${ing.amount || ''})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(selectedRecipe.instructions) &&
              selectedRecipe.instructions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Instructions</h4>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                    {selectedRecipe.instructions.map((step: string, i: number) => (
                      <li key={i} className="whitespace-normal break-words">{step}</li>
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

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}