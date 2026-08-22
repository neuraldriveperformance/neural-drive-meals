'use client';

import React, { useState, useEffect } from 'react';
import MealPlanCalendar from './Components/MealPlanCalendar';
import GroceryList, { GroceryCategory } from './Components/GroceryList';

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

  // 2. Household Scaling Layer with Adults, Teens, and Children
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

  const [recipeHistory, setRecipeHistory] = useState<string[]>([]);
  const [weeklyCalendar, setWeeklyCalendar] = useState<any[] | null>(null);
  const [groceries, setGroceries] = useState<GroceryCategory[]>([]);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);

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

  // Calculate Portion Weight based on Adult (1.0x), Teen (0.8x), and Child (0.5x) Coefficients
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

      if (data.groceries && Array.isArray(data.groceries)) {
        const categoryMap: { [cat: string]: { item: string; amount: string }[] } = {};
        data.groceries.forEach((g: any) => {
          const cat = g.category || 'Produce & Pantry';
          if (!categoryMap[cat]) categoryMap[cat] = [];
          categoryMap[cat].push({ item: g.item || g.name || 'Item', amount: g.amount || g.quantity || '' });
        });

        setGroceries(Object.keys(categoryMap).map((cat) => ({ category: cat, items: categoryMap[cat] })));
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
          isSwapRequest: true,
          swapTarget: { day: dayToSwap, type: mealTypeToSwap },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to swap meal');

      if (data.swappedMeal && weeklyCalendar) {
        const updatedCalendar = weeklyCalendar.map((dayObj: any) => {
          if (dayObj.day === dayToSwap) {
            const updatedMeals = dayObj.meals.map((meal: any) => {
              if (meal.type === mealTypeToSwap) {
                return data.swappedMeal;
              }
              return meal;
            });
            return { ...dayObj, meals: updatedMeals };
          }
          return dayObj;
        });

        setWeeklyCalendar(updatedCalendar);

        if (data.swappedMeal.name) {
          const updatedHistory = Array.from(
            new Set([...recipeHistory, data.swappedMeal.name])
          ).slice(-60);
          setRecipeHistory(updatedHistory);
          localStorage.setItem('ndp_recipe_history', JSON.stringify(updatedHistory));
        }
      }
    } catch (err: any) {
      alert(`Error swapping meal: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#070A0F] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
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
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Daily Calories
                    </label>
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

            {/* COLUMN 2: EXPANDED HOUSEHOLD SCALING LAYER */}
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
                  {/* Adult, Teen, and Child Counters */}
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
                              : 'bg-[#0F1724] text-gray-500 border border-[#1E2D4A] hover:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{type}</span>
                            <span className="text-[9px] px-1 rounded bg-[#0F1724]">
                              {slotData.status.toUpperCase()}
                            </span>
                          </div>

                          {slotData.status === 'generate' && (
                            <button
                              type="button"
                              onClick={(e) => toggleMealShared(day, type, e)}
                              className={`text-[9px] py-0.5 px-1.5 rounded flex items-center justify-between transition ${
                                slotData.shared
                                  ? 'bg-[#00F2FE] text-black font-extrabold'
                                  : 'bg-[#162032] text-gray-400 border border-[#1E2D4A]'
                              }`}
                            >
                              <span>{slotData.shared ? '👨‍👩‍👧 Shared' : '👤 Solo'}</span>
                              <span>{slotData.shared ? `${totalPortionWeight}x` : '1.0x'}</span>
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

          {/* PREFERENCES & SUBMISSION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1E2D4A]">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Household Budget Tier</label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              >
                <option value="budget">Budget-Conscious</option>
                <option value="moderate">Moderate / Balanced</option>
                <option value="premium">Premium / Organic Focus</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Max Prep & Cook Time Per Meal</label>
              <select
                value={maxPrepTime}
                onChange={(e) => setMaxPrepTime(e.target.value)}
                className="w-full bg-[#162032] border border-[#1E2D4A] rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              >
                <option value="15-mins">Under 15 Minutes</option>
                <option value="30-mins">Under 30 Minutes</option>
                <option value="45-mins">Under 45 Minutes</option>
                <option value="60-mins">Under 60 Minutes</option>
                <option value="no-limit">No Limit</option>
              </select>
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
              <strong className="text-gray-300">IMPORTANT LEGAL DISCLAIMER:</strong> These meal plans and macro recommendations are for educational purposes only and do not substitute for professional medical or dietetic advice.
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
            {loading ? 'GENERATING SCALED MEAL PLAN...' : '🚀 GENERATE CUSTOM CLIENT & HOUSEHOLD MEAL PLAN'}
          </button>
        </div>

        {/* RESULTS SECTION */}
        <div id="results-section" className="space-y-12">
          {weeklyCalendar && weeklyCalendar.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#00F2FE] uppercase tracking-wider">
                1. Weekly Client Calendar Protocol
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
                2. Scaled Household Grocery Matrix
              </h2>
              <GroceryList categories={groceries} estimatedCost={estimatedCost} />
            </div>
          )}
        </div>
      </div>

      {/* RECIPE DETAILS MODAL */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0F1724] border border-[#00F2FE]/40 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto relative text-white shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#00F2FE] font-black text-xl transition"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-black uppercase text-[#00F2FE] tracking-widest">
                {selectedMeal.type || 'Meal Protocol'}
              </span>
              <h3 className="text-2xl font-black mt-1 text-white">{selectedMeal.name}</h3>
            </div>

            {selectedMeal.familyFriendlyNote && (
              <div className="bg-amber-500/10 border border-amber-500/40 p-3 rounded-xl flex items-start gap-2.5">
                <span className="text-base">👨‍👩‍👧</span>
                <div>
                  <h5 className="text-[11px] font-extrabold uppercase text-amber-300">Family Deconstruction Tip</h5>
                  <p className="text-xs text-amber-100/90 leading-snug">{selectedMeal.familyFriendlyNote}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 p-3 bg-[#162032] border border-[#1E2D4A] rounded-xl text-center text-xs">
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

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#00F2FE]">
                Ingredients (Client 1-Adult Serving)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                {Array.isArray(selectedMeal.ingredients) ? (
                  selectedMeal.ingredients.map((ing: string, i: number) => <li key={i}>{ing}</li>)
                ) : (
                  <li>{selectedMeal.ingredients}</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#00F2FE]">Preparation Steps</h4>
              {Array.isArray(selectedMeal.instructions) ? (
                <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
                  {selectedMeal.instructions.map((step: string, i: number) => (
                    <li key={i} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-300">{selectedMeal.instructions}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}