'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MealPlanCalendar from './Components/MealPlanCalendar';
import GroceryChecklist from './Components/GroceryChecklist';
import { createClient } from '@/lib/supabaseClient';
import { getUserProfile } from '@/lib/profile';
import { parseIngredientsToGroceryList, saveGroceryChecklist } from '@/lib/grocery';

const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

interface HouseholdConfig {
  adults: number;
  teens: number;
  children: number;
  familyDislikes: string[];
}

interface MealSlotState {
  status: 'generate' | 'self' | 'off';
  shared: boolean;
}

type WeeklySchedule = {
  [day: string]: {
    [slot: string]: MealSlotState;
  };
};

export default function Home() {
  const [clientName, setClientName] = useState('');

  // 1. Client Nutrition Layer
  const [clientCalories, setClientCalories] = useState<number | ''>('');
  const [clientProtein, setClientProtein] = useState<number | ''>('');
  const [clientExclusions, setClientExclusions] = useState<string[]>([]);
  const [exclusionInput, setExclusionInput] = useState('');

  // 2. Household Scaling Layer
  const [household, setHousehold] = useState<HouseholdConfig>({
    adults: 1,
    teens: 0,
    children: 0,
    familyDislikes: [],
  });
  const [dislikeInput, setDislikeInput] = useState('');

  // 3. Engine Preferences & Controls
  const [budget, setBudget] = useState('moderate');
  const [maxPrepTime, setMaxPrepTime] = useState('no-limit');
  const [variety, setVariety] = useState(3);
  const [bulkPrep, setBulkPrep] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase Saving States
  const [savingPlan, setSavingPlan] = useState(false);
  const [savePlanMessage, setSavePlanMessage] = useState<string | null>(null);

  const [recipeHistory, setRecipeHistory] = useState<string[]>([]);
  const [weeklyCalendar, setWeeklyCalendar] = useState<any[] | null>(null);
  const [activePlanId, setActivePlanId] = useState<string>('active-plan');
  const [estimatedCost, setEstimatedCost] = useState('');

  // 4. Schedule Matrix State
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    MON: { Breakfast: { status: 'self', shared: false }, Lunch: { status: 'generate', shared: false }, Dinner: { status: 'generate', shared: true }, Snacks: { status: 'off', shared: false } },
    TUE: { Breakfast: { status: 'self', shared: false }, Lunch: { status: 'generate', shared: false }, Dinner: { status: 'generate', shared: true }, Snacks: { status: 'off', shared: false } },
    WED: { Breakfast: { status: 'self', shared: false }, Lunch: { status: 'generate', shared: false }, Dinner: { status: 'generate', shared: true }, Snacks: { status: 'off', shared: false } },
    THU: { Breakfast: { status: 'self', shared: false }, Lunch: { status: 'generate', shared: false }, Dinner: { status: 'generate', shared: true }, Snacks: { status: 'off', shared: false } },
    FRI: { Breakfast: { status: 'self', shared: false }, Lunch: { status: 'generate', shared: false }, Dinner: { status: 'generate', shared: true }, Snacks: { status: 'off', shared: false } },
    SAT: { Breakfast: { status: 'off', shared: false }, Lunch: { status: 'off', shared: false }, Dinner: { status: 'off', shared: false }, Snacks: { status: 'off', shared: false } },
    SUN: { Breakfast: { status: 'off', shared: false }, Lunch: { status: 'off', shared: false }, Dinner: { status: 'off', shared: false }, Snacks: { status: 'off', shared: false } },
  });

  const supabase = createClient();

  const totalPortionWeight = Number(
    (household.adults * 1.0 + household.teens * 0.8 + household.children * 0.5).toFixed(1)
  );

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ndp_recipe_history');
      if (savedHistory) setRecipeHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.warn('Unable to load recipe history from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    async function loadProfileDefaults() {
      try {
        const profile = await getUserProfile();
        if (!profile) return;

        if (profile.daily_calories) setClientCalories(profile.daily_calories);
        if (profile.protein_grams) setClientProtein(profile.protein_grams);
        if (profile.dietary_preferences?.length) setClientExclusions(profile.dietary_preferences);

        if (profile.household_info) {
          const info = profile.household_info;
          setHousehold((prev) => ({
            ...prev,
            adults: info.household_size ?? prev.adults,
            teens: info.teens ?? prev.teens,
            children: info.children ?? prev.children,
          }));
        }
      } catch (err) {
        console.error('Failed to load user profile defaults:', err);
      }
    }

    loadProfileDefaults();
  }, []);

  const addClientExclusion = () => {
    const val = exclusionInput.trim();
    if (val && !clientExclusions.includes(val)) {
      setClientExclusions([...clientExclusions, val]);
      setExclusionInput('');
    }
  };

  const removeClientExclusion = (item: string) => {
    setClientExclusions(clientExclusions.filter((e) => e !== item));
  };

  const addFamilyDislike = () => {
    const val = dislikeInput.trim();
    if (val && !household.familyDislikes.includes(val)) {
      setHousehold({ ...household, familyDislikes: [...household.familyDislikes, val] });
      setDislikeInput('');
    }
  };

  const removeFamilyDislike = (item: string) => {
    setHousehold({ ...household, familyDislikes: household.familyDislikes.filter((d) => d !== item) });
  };

  const cycleMealSlot = (day: string, slot: string) => {
    setSchedule((prev) => {
      const current = prev[day]?.[slot] || { status: 'off', shared: false };
      const nextStatus: 'generate' | 'self' | 'off' =
        current.status === 'off' ? 'generate' : current.status === 'generate' ? 'self' : 'off';
      return {
        ...prev,
        [day]: { ...(prev[day] || {}), [slot]: { ...current, status: nextStatus } },
      };
    });
  };

  const toggleMealShared = (day: string, slot: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSchedule((prev) => {
      const current = prev[day]?.[slot] || { status: 'off', shared: false };
      return {
        ...prev,
        [day]: { ...(prev[day] || {}), [slot]: { ...current, shared: !current.shared } },
      };
    });
  };

  const handleSavePlanToSupabase = async () => {
    if (!weeklyCalendar) return;

    setSavingPlan(true);
    setSavePlanMessage(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        setSavePlanMessage('Please log in to save meal plans.');
        setSavingPlan(false);
        return;
      }

      const planTitle = clientName
        ? `${clientName}'s Weekly Performance Plan`
        : 'Weekly Performance Meal Plan';

      // 1. Insert saved plan and retrieve the created record ID
      const { data: insertedPlan, error: planError } = await supabase
        .from('saved_plans')
        .insert({
          user_id: user.id,
          title: planTitle,
          plan_data: {
            calendar: weeklyCalendar,
            estimatedCost,
            household,
            portionWeight: totalPortionWeight,
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (planError) throw planError;

      // 2. Parse ingredients from generated calendar
      const rawIngredients = weeklyCalendar.flatMap((day) =>
        day.meals?.flatMap((meal: any) => meal.ingredients || []) || []
      );
      const parsedGroceryItems = parseIngredientsToGroceryList(rawIngredients);

      // 3. Save grocery list using the exact inserted plan ID
      const targetPlanId = insertedPlan?.id || activePlanId;
      const checklistTitle = clientName ? `${clientName}'s Grocery List` : 'Weekly Grocery List';
      
      await saveGroceryChecklist(targetPlanId, parsedGroceryItems, checklistTitle);

      setSavePlanMessage('Successfully saved plan & linked grocery list to your Library!');
    } catch (err: any) {
      console.error('Save error:', err);
      setSavePlanMessage(`Error saving plan: ${err.message || err}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!disclaimerAgreed) {
      alert('Please read and check the legal disclaimer before generating a plan.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || 'Primary Client',
          clientCalories: clientCalories || undefined,
          clientProtein: clientProtein || undefined,
          clientExclusions,
          household,
          totalPortionWeight,
          budgetLevel: budget,
          weeklySchedule: schedule,
          varietyLevel: variety,
          enableBulkPrep: bulkPrep,
          maxPrepTime,
          recipeHistory,
          seed: `${Date.now()}-${Math.random()}`,
          isSwapRequest: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate meal plan');

      const generatedCalendar = data.weeklyCalendar || [];
      const newPlanId = `plan-${Date.now()}`;
      setActivePlanId(newPlanId);
      setWeeklyCalendar(generatedCalendar);
      setEstimatedCost(data.estimatedGroceryCost || `$120 – $220 USD`);

      const newRecipeNames: string[] = [];
      generatedCalendar.forEach((dayObj: any) => {
        dayObj.meals?.forEach((meal: any) => {
          if (meal?.name) newRecipeNames.push(meal.name);
        });
      });

      if (newRecipeNames.length > 0) {
        const updatedHistory = Array.from(new Set([...recipeHistory, ...newRecipeNames])).slice(-60);
        setRecipeHistory(updatedHistory);
        localStorage.setItem('ndp_recipe_history', JSON.stringify(updatedHistory));
      }

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapMeal = async (dayToSwap: string, mealTypeToSwap: string) => {
    try {
      const targetDayPlan = weeklyCalendar?.find((d: any) => d.day === dayToSwap);
      const targetMeal = targetDayPlan?.meals?.find((m: any) => m.type === mealTypeToSwap);
      const oldMealName = targetMeal?.name;

      const currentCalendarMeals: string[] = [];
      weeklyCalendar?.forEach((dayObj: any) => {
        dayObj.meals?.forEach((m: any) => {
          if (m?.name) currentCalendarMeals.push(m.name);
        });
      });

      const combinedExclusions = Array.from(new Set([...recipeHistory, ...currentCalendarMeals]));

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || 'Primary Client',
          clientCalories: clientCalories || undefined,
          clientProtein: clientProtein || undefined,
          clientExclusions,
          household,
          totalPortionWeight,
          budgetLevel: budget,
          weeklySchedule: schedule,
          varietyLevel: variety,
          enableBulkPrep: bulkPrep,
          maxPrepTime,
          recipeHistory: combinedExclusions,
          seed: `${Date.now()}-${Math.random()}`,
          isSwapRequest: true,
          swapTarget: { day: dayToSwap, type: mealTypeToSwap },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to swap meal');

      if (data.swappedMeal && weeklyCalendar) {
        const replacementMeal = data.swappedMeal;

        const updatedCalendar = weeklyCalendar.map((dayObj: any) => {
          const updatedMeals = dayObj.meals.map((meal: any) => {
            const matchesOldMeal = oldMealName && meal.name === oldMealName;
            const isExactTargetSlot = dayObj.day === dayToSwap && meal.type === mealTypeToSwap;

            if (matchesOldMeal || isExactTargetSlot) {
              return {
                ...replacementMeal,
                type: meal.type,
              };
            }
            return meal;
          });

          return { ...dayObj, meals: updatedMeals };
        });

        setWeeklyCalendar([...updatedCalendar]);

        if (replacementMeal.name) {
          const updatedHistory = Array.from(
            new Set([...recipeHistory, replacementMeal.name])
          ).slice(-60);
          setRecipeHistory(updatedHistory);
          localStorage.setItem('ndp_recipe_history', JSON.stringify(updatedHistory));
        }
      }
    } catch (err: any) {
      alert(`Error swapping meal globally: ${err.message}`);
    }
  };

  const handlePrintFullProtocol = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[#070A0F] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER NAVIGATION */}
        <header className="border-b border-[#1E2D4A] pb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
              <img src="/logo.png" alt="NDP Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#00F2FE] tracking-tight">
                NEURAL DRIVE PERFORMANCE
              </h1>
              <p className="text-xs md:text-sm text-gray-400">
                Precision Client Nutrition & Household Scaling Engine
              </p>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-[#00F2FE] font-bold text-xs md:text-sm border-b-2 border-[#00F2FE] pb-1"
            >
              Generator
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition text-xs md:text-sm font-medium"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        {/* CONFIGURATION PANEL */}
        <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COLUMN 1: CLIENT NUTRITION LAYER */}
            <div className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-5 space-y-4">
              <div className="border-b border-[#1E2D4A] pb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#00F2FE]">
                  1. Client Nutrition Layer (Strict 1-Serving Macros)
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Targets apply strictly to the primary client. Recipes generate 1 adult portion.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Mercer"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">
                        Daily Calories
                      </label>
                      <a
                        href="https://tdeecalculator.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-semibold text-[#00F2FE] hover:underline"
                      >
                        Calculate TDEE ↗
                      </a>
                    </div>
                    <input
                      type="number"
                      placeholder="e.g. 2400"
                      value={clientCalories}
                      onChange={(e) => setClientCalories(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Daily Protein (g)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 180"
                      value={clientProtein}
                      onChange={(e) => setClientProtein(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Strict Client Exclusions / Allergies
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="e.g. Peanuts, Shellfish"
                      value={exclusionInput}
                      onChange={(e) => setExclusionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addClientExclusion()}
                      className="flex-1 bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                    />
                    <button
                      type="button"
                      onClick={addClientExclusion}
                      className="bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Add
                    </button>
                  </div>
                  {clientExclusions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {clientExclusions.map((item) => (
                        <span key={item} className="bg-[#0F1724] border border-[#00F2FE]/40 text-[#00F2FE] text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          {item}
                          <button type="button" onClick={() => removeClientExclusion(item)} className="hover:text-red-400 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: HOUSEHOLD SCALING LAYER */}
            <div className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-[#1E2D4A] pb-3 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#00F2FE]">
                    2. Household Scaling Layer (Grocery & Portions)
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Scales raw grocery quantities on shared meals using unique age-group portion multipliers.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Adults Counter */}
                    <div className="bg-[#0F1724] border border-[#1E2D4A] p-2.5 rounded-xl flex flex-col justify-between">
                      <div className="mb-2">
                        <div className="text-xs font-bold text-white">Adults</div>
                        <div className="text-[9px] text-gray-400">1.0x Portion</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, adults: Math.max(1, household.adults - 1) })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-[#00F2FE]">{household.adults}</span>
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, adults: household.adults + 1 })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Teens Counter */}
                    <div className="bg-[#0F1724] border border-[#1E2D4A] p-2.5 rounded-xl flex flex-col justify-between">
                      <div className="mb-2">
                        <div className="text-xs font-bold text-white">Teens</div>
                        <div className="text-[9px] text-gray-400">0.8x Portion</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, teens: Math.max(0, household.teens - 1) })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-[#00F2FE]">{household.teens}</span>
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, teens: household.teens + 1 })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Children Counter */}
                    <div className="bg-[#0F1724] border border-[#1E2D4A] p-2.5 rounded-xl flex flex-col justify-between">
                      <div className="mb-2">
                        <div className="text-xs font-bold text-white">Children</div>
                        <div className="text-[9px] text-gray-400">0.5x Portion</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, children: Math.max(0, household.children - 1) })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-[#00F2FE]">{household.children}</span>
                        <button
                          type="button"
                          onClick={() => setHousehold({ ...household, children: household.children + 1 })}
                          className="w-5 h-5 bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold rounded flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multiplier Readout */}
                  <div className="bg-[#0F1724]/80 border border-[#00F2FE]/30 p-2.5 rounded-lg text-center">
                    <span className="text-xs text-gray-300">
                      Shared Meal Multiplier: <strong className="text-[#00F2FE] text-sm">{totalPortionWeight}x Adult Portions</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Family Preferences & Dislikes
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="e.g. Spicy, Mushrooms"
                        value={dislikeInput}
                        onChange={(e) => setDislikeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addFamilyDislike()}
                        className="flex-1 bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                      />
                      <button
                        type="button"
                        onClick={addFamilyDislike}
                        className="bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Add
                      </button>
                    </div>
                    {household.familyDislikes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {household.familyDislikes.map((item) => (
                          <span key={item} className="bg-[#0F1724] border border-amber-500/40 text-amber-300 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                            {item}
                            <button type="button" onClick={() => removeFamilyDislike(item)} className="hover:text-red-400 font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VARIETY & BATCH PREP CONTROLS */}
          <div className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#1E2D4A] pb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#00F2FE]">
                3. Recipe Variety & Batch Cooking Strategy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">
                    Meal Variety Level ({variety}/5)
                  </label>
                  <span className="text-[#00F2FE] font-bold text-[11px]">
                    {variety === 1
                      ? '1 - High Repeat (Fast Prep)'
                      : variety === 2
                      ? '2 - Moderate Repeats'
                      : variety === 3
                      ? '3 - Balanced Rotation'
                      : variety === 4
                      ? '4 - High Variety'
                      : '5 - Maximum Variety (Unique Daily)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={variety}
                  onChange={(e) => setVariety(Number(e.target.value))}
                  className="w-full accent-[#00F2FE] bg-[#0F1724] rounded-lg h-2 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between bg-[#0F1724] border border-[#1E2D4A] p-3 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-white">Enable Batch Cooking Strategy</div>
                  <div className="text-[10px] text-gray-400">Reuses cooked proteins/grains across consecutive lunches/dinners</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkPrep(!bulkPrep)}
                  className={`px-4 py-1.5 rounded-lg font-black text-xs transition ${
                    bulkPrep ? 'bg-[#00F2FE] text-black' : 'bg-[#1E2D4A] text-gray-400'
                  }`}
                >
                  {bulkPrep ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>

          {/* SCHEDULE MATRIX */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase">
                  Weekly Schedule Matrix & Shared Toggles
                </label>
                <p className="text-[10px] text-gray-500">Click slot to cycle. Click badge to toggle 👤 Solo vs 👨‍👩‍👧 Shared.</p>
              </div>
              <div className="flex gap-3 text-[10px] font-semibold">
                <span className="text-[#00F2FE]">● Generate</span>
                <span className="text-amber-400">● Self-Provided</span>
                <span className="text-gray-500">○ Off</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysOfWeek.map((day) => (
                <div key={day} className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-3 space-y-2 flex flex-col">
                  <div className="text-center font-extrabold text-xs text-[#00F2FE] border-b border-[#1E2D4A] pb-1.5">
                    {day}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {mealTypes.map((type) => {
                      const slotData = schedule[day]?.[type] || { status: 'off', shared: false };
                      return (
                        <div
                          key={type}
                          onClick={() => cycleMealSlot(day, type)}
                          className={`w-full text-left text-[11px] p-2 rounded font-bold transition flex flex-col gap-1 cursor-pointer select-none ${
                            slotData.status === 'generate'
                              ? 'bg-[#00F2FE]/15 border border-[#00F2FE]/50 text-white'
                              : slotData.status === 'self'
                              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-200'
                              : 'bg-[#0F1724] border border-[#1E2D4A] text-gray-500'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{type}</span>
                            <span className="text-[9px] uppercase font-mono">
                              {slotData.status === 'generate' ? 'AI' : slotData.status === 'self' ? 'Self' : 'Off'}
                            </span>
                          </div>

                          {slotData.status === 'generate' && (
                            <button
                              type="button"
                              onClick={(e) => toggleMealShared(day, type, e)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border self-start transition ${
                                slotData.shared
                                  ? 'bg-[#00F2FE] text-black border-[#00F2FE] font-black'
                                  : 'bg-[#0F1724] text-gray-400 border-[#1E2D4A]'
                              }`}
                            >
                              {slotData.shared ? '👨‍👩‍👧 Shared' : '👤 Solo'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DISCLAIMER & GENERATE ACTION BAR */}
          <div className="border-t border-[#1E2D4A] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <input
                type="checkbox"
                checked={disclaimerAgreed}
                onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-[#0F1724] text-[#00F2FE] focus:ring-0"
              />
              <span>I confirm nutrition targets are for reference and I agree to the service disclaimer.</span>
            </label>

            <button
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full sm:w-auto bg-[#00F2FE] hover:bg-cyan-400 text-black font-black px-8 py-3.5 rounded-xl text-sm transition shadow-lg shadow-[#00F2FE]/10 disabled:opacity-50"
            >
              {loading ? 'Generating Precision Protocol...' : '⚡ Generate Performance Protocol'}
            </button>
          </div>
        </div>

        {/* RESULTS SECTION */}
        {weeklyCalendar && (
          <div id="results-section" className="space-y-8 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E2D4A] pb-4">
              <div>
                <h2 className="text-xl font-black text-white">Your Weekly Plan is Ready</h2>
                {estimatedCost && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Estimated Weekly Grocery Cost: {estimatedCost}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSavePlanToSupabase}
                  disabled={savingPlan}
                  className="bg-[#162032] hover:bg-[#1E2D4A] text-[#00F2FE] border border-[#00F2FE]/50 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {savingPlan ? 'Saving...' : '💾 Save Plan to Dashboard'}
                </button>
                <button
                  onClick={handlePrintFullProtocol}
                  className="bg-[#162032] hover:bg-[#1E2D4A] text-gray-200 border border-[#1E2D4A] font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Protocol / PDF
                </button>
              </div>
            </div>

            {savePlanMessage && (
              <div className="text-xs text-[#00F2FE] bg-[#162032] border border-[#00F2FE]/40 p-3 rounded-xl">
                {savePlanMessage}
              </div>
            )}

            {/* WEEKLY MEAL CALENDAR */}
            <MealPlanCalendar calendarDays={weeklyCalendar} onSwapMeal={handleSwapMeal} />

            {/* INTERACTIVE DIGITAL GROCERY CHECKLIST */}
            <GroceryChecklist
              planId={activePlanId}
              planTitle={clientName ? `${clientName}'s Grocery List` : 'Weekly Grocery List'}
              rawIngredients={
                weeklyCalendar.flatMap((day) =>
                  day.meals?.flatMap((meal: any) => meal.ingredients || []) || []
                )
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}