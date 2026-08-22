'use client';

import React, { useState, useEffect } from 'react';
import MealPlanCalendar from './Components/MealPlanCalendar';
import GroceryList, { GroceryCategory } from './Components/GroceryList';

const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function Home() {
  const [clientName, setClientName] = useState('');
  const [dailyCalories, setDailyCalories] = useState<number | ''>('');
  const [proteinTarget, setProteinTarget] = useState<number | ''>('');
  const [householdSize, setHouseholdSize] = useState(1);
  const [budget, setBudget] = useState('moderate');
  const [maxPrepTime, setMaxPrepTime] = useState('no-limit');
  const [variety, setVariety] = useState(3);
  
  const [bulkPrep, setBulkPrep] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [exclusionInput, setExclusionInput] = useState('');

  const [recipeHistory, setRecipeHistory] = useState<string[]>([]);
  const [weeklyCalendar, setWeeklyCalendar] = useState<any[] | null>(null);
  const [groceries, setGroceries] = useState<GroceryCategory[]>([]);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);

  const [schedule, setSchedule] = useState<{ [day: string]: { [slot: string]: 'generate' | 'self' | 'off' } }>({
    MON: { Breakfast: 'off', Lunch: 'generate', Dinner: 'generate', Snacks: 'off' },
    TUE: { Breakfast: 'off', Lunch: 'generate', Dinner: 'generate', Snacks: 'off' },
    WED: { Breakfast: 'off', Lunch: 'self', Dinner: 'generate', Snacks: 'off' },
    THU: { Breakfast: 'off', Lunch: 'generate', Dinner: 'generate', Snacks: 'off' },
    FRI: { Breakfast: 'off', Lunch: 'generate', Dinner: 'generate', Snacks: 'off' },
    SAT: { Breakfast: 'off', Lunch: 'off', Dinner: 'off', Snacks: 'off' },
    SUN: { Breakfast: 'off', Lunch: 'off', Dinner: 'off', Snacks: 'off' },
  });

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ndp_recipe_history');
      if (savedHistory) {
        setRecipeHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Unable to load recipe history from localStorage:', e);
    }
  }, []);

  const cycleMealSlot = (day: string, slot: string) => {
    setSchedule((prev) => {
      const currentStatus = prev[day]?.[slot] || 'off';
      const nextStatus =
        currentStatus === 'off'
          ? 'generate'
          : currentStatus === 'generate'
          ? 'self'
          : 'off';
      return {
        ...prev,
        [day]: { ...(prev[day] || {}), [slot]: nextStatus },
      };
    });
  };

  const addExclusion = () => {
    if (exclusionInput.trim() && !exclusions.includes(exclusionInput.trim())) {
      setExclusions([...exclusions, exclusionInput.trim()]);
      setExclusionInput('');
    }
  };

  const removeExclusion = (item: string) => {
    setExclusions(exclusions.filter((e) => e !== item));
  };

  const updateGroceryMatrix = (calendarData: any[]) => {
    const rawGroceryMap: { [itemName: string]: number } = {};

    calendarData.forEach((dayObj) => {
      if (Array.isArray(dayObj.meals)) {
        dayObj.meals.forEach((meal: any) => {
          if (Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach((ing: string) => {
              rawGroceryMap[ing] = (rawGroceryMap[ing] || 0) + 1;
            });
          }
        });
      }
    });

    const categorizeItem = (name: string): string => {
      const lower = name.toLowerCase();
      if (
        lower.includes('beef') || lower.includes('steak') || lower.includes('chicken') ||
        lower.includes('turkey') || lower.includes('salmon') || lower.includes('cod') ||
        lower.includes('tuna') || lower.includes('sausage') || lower.includes('egg') ||
        lower.includes('yogurt') || lower.includes('whey') || lower.includes('cottage cheese')
      ) {
        return 'Proteins';
      }
      if (
        lower.includes('spinach') || lower.includes('zucchini') || lower.includes('asparagus') ||
        lower.includes('pepper') || lower.includes('cucumber') || lower.includes('broccoli') ||
        lower.includes('tomato') || lower.includes('avocado') || lower.includes('blueberry') ||
        lower.includes('pineapple') || lower.includes('apple') || lower.includes('banana')
      ) {
        return 'Produce';
      }
      if (
        lower.includes('rice') || lower.includes('oats') || lower.includes('quinoa') ||
        lower.includes('potato') || lower.includes('pasta') || lower.includes('bread') ||
        lower.includes('tortilla') || lower.includes('oatmeal')
      ) {
        return 'Grains & Carbs';
      }
      return 'Pantry / Condiments';
    };

    const categoryMap: { [cat: string]: { item: string; amount: string }[] } = {};

    Object.keys(rawGroceryMap).forEach((ingredient) => {
      const category = categorizeItem(ingredient);
      if (!categoryMap[category]) categoryMap[category] = [];
      categoryMap[category].push({ item: ingredient, amount: '' });
    });

    const formattedGroceries: GroceryCategory[] = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      items: categoryMap[cat],
    }));

    setGroceries(formattedGroceries);
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
          name: clientName,
          targetCalories: dailyCalories,
          targetProteinGrams: proteinTarget,
          exclusions,
          householdSize,
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate meal plan');
      }

      const generatedCalendar = data.weeklyCalendar || [];
      setWeeklyCalendar(generatedCalendar);
      setEstimatedCost(data.estimatedGroceryCost || `$75 – $115 USD`);

      const newRecipeNames: string[] = [];
      generatedCalendar.forEach((dayObj: any) => {
        if (Array.isArray(dayObj.meals)) {
          dayObj.meals.forEach((meal: any) => {
            if (meal && meal.name) {
              newRecipeNames.push(meal.name);
            }
          });
        }
      });

      if (newRecipeNames.length > 0) {
        const updatedHistory = Array.from(new Set([...recipeHistory, ...newRecipeNames])).slice(-60);
        setRecipeHistory(updatedHistory);
        try {
          localStorage.setItem('ndp_recipe_history', JSON.stringify(updatedHistory));
        } catch (e) {
          console.warn('Unable to persist recipe history to localStorage:', e);
        }
      }

      if (data.groceries && Array.isArray(data.groceries)) {
        const categoryMap: { [cat: string]: { item: string; amount: string }[] } = {};

        data.groceries.forEach((g: any) => {
          const cat = g.category || 'Produce & Pantry';
          const itemName = g.item || g.name || 'Item';
          const itemAmount = g.amount || g.quantity || '';

          if (!categoryMap[cat]) categoryMap[cat] = [];
          categoryMap[cat].push({ item: itemName, amount: itemAmount });
        });

        const formattedGroceries: GroceryCategory[] = Object.keys(categoryMap).map((cat) => ({
          category: cat,
          items: categoryMap[cat],
        }));

        setGroceries(formattedGroceries);
      }

      setTimeout(() => {
        const results = document.getElementById('results-section');
        if (results) results.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapMeal = async (oldMealName: string, mealType: string) => {
    try {
      const activeRecipeNames: string[] = [];
      weeklyCalendar?.forEach((dayObj) => {
        dayObj.meals?.forEach((m: any) => {
          if (m.name && m.name !== oldMealName) activeRecipeNames.push(m.name);
        });
      });

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          targetCalories: dailyCalories,
          targetProteinGrams: proteinTarget,
          exclusions,
          householdSize,
          budgetLevel: budget,
          weeklySchedule: { MON: { [mealType]: 'generate' } },
          varietyLevel: 5,
          maxPrepTime,
          recipeHistory: Array.from(new Set([...recipeHistory, ...activeRecipeNames, oldMealName])).slice(-60),
          seed: `${Date.now()}-${Math.random()}`,
          isSwapRequest: true,
        }),
      });

      const data = await response.json();
      const replacementMeal = data.weeklyCalendar?.[0]?.meals?.[0];

      if (!replacementMeal) throw new Error('Could not find a suitable replacement meal.');

      const updatedCalendar = weeklyCalendar?.map((dayObj) => ({
        ...dayObj,
        meals: dayObj.meals.map((meal: any) => (meal.name === oldMealName ? { ...replacementMeal, type: meal.type } : meal)),
      })) || null;

      if (updatedCalendar) {
        setWeeklyCalendar(updatedCalendar);
        updateGroceryMatrix(updatedCalendar);

        const updatedHistory = Array.from(new Set([...recipeHistory, replacementMeal.name])).slice(-60);
        setRecipeHistory(updatedHistory);
        localStorage.setItem('ndp_recipe_history', JSON.stringify(updatedHistory));
      }
    } catch (err: any) {
      alert(`Unable to swap meal: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#070A0F] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="border-b border-[#1E2D4A] pb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Neural Drive Performance Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#00F2FE] tracking-tight">
                NEURAL DRIVE PERFORMANCE
              </h1>
              <p className="text-xs md:text-sm text-gray-400">
                Precision Nutrition & Meal Planning Architecture
              </p>
            </div>
          </div>
        </header>

        <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#00F2FE]">
            Client Profile Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Client Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Daily Target Calories
              </label>
              <input
                type="number"
                placeholder="e.g. 2450"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Daily Protein Target (Grams)
              </label>
              <input
                type="number"
                placeholder="e.g. 160"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Household Multiplier (People)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={householdSize}
                onChange={(e) => setHouseholdSize(Number(e.target.value))}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Budget Tier
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
              >
                <option value="budget">Budget-Conscious</option>
                <option value="moderate">Moderate / Balanced</option>
                <option value="premium">Premium / Organic Focus</option>
              </select>
              <span className="text-[10px] text-gray-500 mt-1 block">
                *Estimated costs vary based on geographic location and retailer pricing.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
                Max Prep & Cook Time Per Meal
              </label>
              <select
                value={maxPrepTime}
                onChange={(e) => setMaxPrepTime(e.target.value)}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
              >
                <option value="15-mins">Under 15 Minutes</option>
                <option value="30-mins">Under 30 Minutes</option>
                <option value="45-mins">Under 45 Minutes</option>
                <option value="60-mins">Under 60 Minutes (1 Hour)</option>
                <option value="90-mins">Under 90 Minutes (1.5 Hours)</option>
                <option value="120-mins">Under 120 Minutes (2 Hours)</option>
                <option value="no-limit">No Limit (Default)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">
              Dietary Exclusions / Allergies
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="e.g. Dairy, Shellfish, Eggs"
                value={exclusionInput}
                onChange={(e) => setExclusionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExclusion()}
                className="flex-1 bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
              />
              <button
                type="button"
                onClick={addExclusion}
                className="bg-[#1E2D4A] hover:bg-[#00F2FE] hover:text-black font-bold px-5 py-2 rounded-lg text-sm transition"
              >
                Add
              </button>
            </div>
            {exclusions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {exclusions.map((item) => (
                  <span
                    key={item}
                    className="bg-[#162032] border border-[#00F2FE]/40 text-[#00F2FE] text-xs px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    {item}
                    <button
                      onClick={() => removeExclusion(item)}
                      className="hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase">
                Weekly Meal Schedule Matrix
              </label>
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
                      const status = schedule[day]?.[type] || 'off';
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => cycleMealSlot(day, type)}
                          className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded font-bold transition flex items-center justify-between ${
                            status === 'generate'
                              ? 'bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/50'
                              : status === 'self'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-[#0F1724] text-gray-500 border border-[#1E2D4A] hover:text-gray-300'
                          }`}
                        >
                          <span>{type}</span>
                          <span className="text-[10px]">
                            {status === 'generate' ? 'GEN' : status === 'self' ? 'SELF' : 'OFF'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#1E2D4A]">
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase">
                <span>Meal Variety Preference</span>
                <span className="text-[#00F2FE]">
                  {variety === 1 && 'Level 1/5 - Repeat Same Meals Daily'}
                  {variety === 2 && 'Level 2/5 - Heavy Batch Cooking'}
                  {variety === 3 && 'Level 3/5 - Balanced Rotation'}
                  {variety === 4 && 'Level 4/5 - High Variety'}
                  {variety === 5 && 'Level 5/5 - 100% Unique Meals Daily'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={variety}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVariety(val);
                  if (val === 5) {
                    setBulkPrep(false);
                  }
                }}
                className="w-full accent-[#00F2FE]"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-semibold mt-1">
                <span>1 (Same Meals Each Day)</span>
                <span>3 (Balanced)</span>
                <span>5 (100% Unique Every Day)</span>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 bg-[#162032] border border-[#1E2D4A] p-3 rounded-xl transition ${
                variety === 5 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <input
                type="checkbox"
                id="bulkPrep"
                checked={bulkPrep}
                disabled={variety === 5}
                onChange={(e) => setBulkPrep(e.target.checked)}
                className="w-5 h-5 accent-[#00F2FE] rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="bulkPrep"
                className={variety === 5 ? 'cursor-not-allowed' : 'cursor-pointer'}
              >
                <div className="text-xs font-bold text-white">Bulk Batch Prep</div>
                <div className="text-[10px] text-gray-400">
                  {variety === 5
                    ? 'Disabled at Level 5 Variety (requires 100% unique meals)'
                    : 'Repeat batch cooked meals across days'}
                </div>
              </label>
            </div>
          </div>

          <div className="bg-[#162032]/60 border border-[#1E2D4A] p-3 rounded-xl flex items-center gap-3">
            <input
              type="checkbox"
              id="disclaimer"
              checked={disclaimerAgreed}
              onChange={(e) => setDisclaimerAgreed(e.target.checked)}
              className="w-4 h-4 accent-[#00F2FE] rounded cursor-pointer flex-shrink-0"
            />
            <label htmlFor="disclaimer" className="text-[11px] text-gray-400 leading-tight cursor-pointer">
              <strong className="text-gray-300">IMPORTANT LEGAL DISCLAIMER:</strong> These meal plans and macro recommendations generated by Neural Drive Performance are for educational and informational purposes only and do not substitute for professional medical or dietetic advice.
            </label>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition flex items-center justify-center gap-2 ${
              loading
                ? 'bg-[#1E2D4A] text-gray-400 cursor-not-allowed'
                : 'bg-[#00F2FE] hover:bg-[#00c8d4] text-black shadow-lg shadow-[#00F2FE]/20'
            }`}
          >
            {loading ? 'GENERATING NEURAL MEAL PLAN...' : '🚀 GENERATE CUSTOM MEAL PLAN'}
          </button>
        </div>

        <div id="results-section" className="space-y-12">
          {weeklyCalendar && weeklyCalendar.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#00F2FE] uppercase tracking-wider">
                1. Weekly Calendar Protocol
              </h2>
              <MealPlanCalendar 
                calendarDays={weeklyCalendar} 
                onSwapMeal={handleSwapMeal} 
                onSelectMeal={(meal: any) => setSelectedMeal(meal)} 
              />
            </div>
          )}

          {groceries && groceries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#00F2FE] uppercase tracking-wider">
                2. Consolidated Grocery Matrix
              </h2>
              <GroceryList categories={groceries} estimatedCost={estimatedCost} />
            </div>
          )}
        </div>
      </div>

      {/* RECIPE DETAILS MODAL OVERLAY */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0F1724] border border-[#00F2FE]/40 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto relative text-white shadow-2xl">
            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#00F2FE] font-black text-xl transition"
            >
              ✕
            </button>

            <span className="text-xs font-black uppercase text-[#00F2FE] tracking-widest">
              {selectedMeal.type || 'Meal Protocol'}
            </span>
            <h3 className="text-2xl font-black mt-1 text-white">{selectedMeal.name}</h3>

            <div className="grid grid-cols-4 gap-2 my-4 p-3 bg-[#162032] border border-[#1E2D4A] rounded-xl text-center text-xs">
              <div>
                <p className="text-gray-400 text-[10px] uppercase">Calories</p>
                <p className="font-extrabold text-[#00F2FE] text-sm">{selectedMeal.calories || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase">Protein</p>
                <p className="font-extrabold text-[#00F2FE] text-sm">{selectedMeal.protein ? `${selectedMeal.protein}g` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase">Carbs</p>
                <p className="font-extrabold text-[#00F2FE] text-sm">{selectedMeal.carbs ? `${selectedMeal.carbs}g` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase">Fat</p>
                <p className="font-extrabold text-[#00F2FE] text-sm">{selectedMeal.fat ? `${selectedMeal.fat}g` : '—'}</p>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#00F2FE]">
                Ingredients
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                {Array.isArray(selectedMeal.ingredients) ? (
                  selectedMeal.ingredients.map((ing: string, i: number) => (
                    <li key={i}>{ing}</li>
                  ))
                ) : (
                  <li>{selectedMeal.ingredients || 'No ingredients listed.'}</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#00F2FE]">
                Preparation & Cooking Instructions
              </h4>
              {Array.isArray(selectedMeal.instructions) ? (
                <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
                  {selectedMeal.instructions.map((step: string, i: number) => (
                    <li key={i} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-300 leading-relaxed">{selectedMeal.instructions || 'No preparation steps provided.'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}