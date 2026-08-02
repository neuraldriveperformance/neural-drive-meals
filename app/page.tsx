'use client';

import React, { useState } from 'react';
import MealPlanCalendar from './Components/MealPlanCalendar';
import GroceryList, { GroceryCategory } from './Components/GroceryList';

export default function Home() {
  // CLIENT PROFILE INPUTS - START BLANK BY DEFAULT
  const [clientName, setClientName] = useState('');
  const [dailyCalories, setDailyCalories] = useState<number | ''>('');
  const [proteinTarget, setProteinTarget] = useState<number | ''>('');
  const [householdSize, setHouseholdSize] = useState(1);
  const [budget, setBudget] = useState('moderate');
  const [maxPrepTime, setMaxPrepTime] = useState('no-limit');
  const [variety, setVariety] = useState(3);
  
  // CHECKBOXES START UNCHECKED BY DEFAULT
  const [bulkPrep, setBulkPrep] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [exclusionInput, setExclusionInput] = useState('');

  // WEEKLY MATRIX INITIALIZED: LUNCH AND DINNER DEFAULT FOR MON-FRI ONLY
  const [schedule, setSchedule] = useState<{ [day: string]: string[] }>({
    MON: ['Lunch', 'Dinner'],
    TUE: ['Lunch', 'Dinner'],
    WED: ['Lunch', 'Dinner'],
    THU: ['Lunch', 'Dinner'],
    FRI: ['Lunch', 'Dinner'],
    SAT: [],
    SUN: [],
  });

  const [loading, setLoading] = useState(false);
  const [weeklyCalendar, setWeeklyCalendar] = useState<any[] | null>(null);
  const [groceries, setGroceries] = useState<GroceryCategory[] | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<string>('');

  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  const toggleMealSlot = (day: string, slot: string) => {
    setSchedule((prev) => {
      const current = prev[day] || [];
      const updated = current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot];
      return { ...prev, [day]: updated };
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate meal plan');
      }

      setWeeklyCalendar(data.weeklyCalendar || []);
      setEstimatedCost(data.estimatedGroceryCost || `$75 – $115 USD`);

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

  return (
    <main className="min-h-screen bg-[#070A0F] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER WITH BRANDING LOGO */}
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

          {/* EXCLUSIONS */}
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

          {/* WEEKLY SCHEDULE MATRIX */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-3">
              Weekly Meal Schedule Matrix
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysOfWeek.map((day) => (
                <div key={day} className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-3 space-y-2 flex flex-col">
                  <div className="text-center font-extrabold text-xs text-[#00F2FE] border-b border-[#1E2D4A] pb-1.5">
                    {day}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {mealTypes.map((type) => {
                      const active = schedule[day]?.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleMealSlot(day, type)}
                          className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded font-bold transition flex items-center justify-between ${
                            active
                              ? 'bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/50'
                              : 'bg-[#0F1724] text-gray-500 border border-[#1E2D4A] hover:text-gray-300'
                          }`}
                        >
                          <span>{type}</span>
                          <span className="text-[10px]">{active ? '✓' : '+'}</span>
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
                <span className="text-[#00F2FE]">Level {variety}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={variety}
                onChange={(e) => setVariety(Number(e.target.value))}
                className="w-full accent-[#00F2FE]"
              />
            </div>

            <div className="flex items-center gap-3 bg-[#162032] border border-[#1E2D4A] p-3 rounded-xl">
              <input
                type="checkbox"
                id="bulkPrep"
                checked={bulkPrep}
                onChange={(e) => setBulkPrep(e.target.checked)}
                className="w-5 h-5 accent-[#00F2FE] rounded cursor-pointer"
              />
              <label htmlFor="bulkPrep" className="cursor-pointer">
                <div className="text-xs font-bold text-white">Bulk Batch Prep</div>
                <div className="text-[10px] text-gray-400">Repeat batch cooked meals across days</div>
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

        {/* OUTPUT RESULTS DISPLAY */}
        <div id="results-section" className="space-y-12">
          {weeklyCalendar && weeklyCalendar.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#00F2FE] uppercase tracking-wider">
                1. Weekly Calendar Protocol
              </h2>
              <MealPlanCalendar calendarDays={weeklyCalendar} />
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
    </main>
  );
}
