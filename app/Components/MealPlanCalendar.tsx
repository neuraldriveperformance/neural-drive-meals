'use client';

import React, { useState } from 'react';

export interface Meal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime?: string;
  ingredients: string[];
  instructions: string[];
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

interface MealPlanCalendarProps {
  calendarDays: DayPlan[];
  onSwapMeal?: (mealName: string, mealType: string) => Promise<void> | void;
}

const MEAL_ORDER: { [key: string]: number } = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snacks: 4,
  Snack: 4,
};

export default function MealPlanCalendar({ calendarDays, onSwapMeal }: MealPlanCalendarProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [swappingMealName, setSwappingMealName] = useState<string | null>(null);

  if (!calendarDays || calendarDays.length === 0) {
    return (
      <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 text-center text-gray-400">
        No meal calendar protocols generated.
      </div>
    );
  }

  const toggleExpand = (mealId: string) => {
    setExpandedMeal(expandedMeal === mealId ? null : mealId);
  };

  const handleShareRecipe = (meal: Meal) => {
    const text = `🍽️ ${meal.name} (${meal.type})
Macros: ${meal.calories} kcal | ${meal.protein}g P | ${meal.carbs}g C | ${meal.fat}g F
Prep Time: ${meal.prepTime || 'N/A'}

Ingredients:
${meal.ingredients.map((i) => `• ${i}`).join('\n')}

Instructions:
${meal.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert(`Copied "${meal.name}" recipe to clipboard!`);
    }
  };

  const handlePrintRecipe = (meal: Meal) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Recipe: ${meal.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; color: #111; }
            h1 { margin-bottom: 4px; }
            .badge { background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            .macros { margin: 10px 0; font-weight: bold; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <span class="badge">${meal.type.toUpperCase()}</span>
          <h1>${meal.name}</h1>
          <div class="macros">
            ${meal.calories} kcal | ${meal.protein}g Protein | ${meal.carbs}g Carbs | ${meal.fat}g Fat
          </div>
          <p><strong>Prep Time:</strong> ${meal.prepTime || 'N/A'}</p>
          <hr />
          <h3>Ingredients</h3>
          <ul>${meal.ingredients.map((i) => `<li>${i}</li>`).join('')}</ul>
          <h3>Instructions</h3>
          <ol>${meal.instructions.map((inst) => `<li>${inst}</li>`).join('')}</ol>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSwapClick = async (meal: Meal) => {
    if (!onSwapMeal) return;
    setSwappingMealName(meal.name);
    try {
      await onSwapMeal(meal.name, meal.type);
    } finally {
      setSwappingMealName(null);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {calendarDays.map((dayPlan, dIdx) => {
        const sortedMeals = [...(dayPlan.meals || [])].sort((a, b) => {
          const orderA = MEAL_ORDER[a.type] || 99;
          const orderB = MEAL_ORDER[b.type] || 99;
          return orderA - orderB;
        });

        return (
          <div
            key={dIdx}
            className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-3 flex flex-col space-y-3 min-w-0"
          >
            {/* DAY HEADER */}
            <div className="border-b border-[#1E2D4A] pb-2 text-center">
              <h3 className="text-sm font-black text-[#00F2FE] tracking-wider uppercase">
                {dayPlan.day}
              </h3>
              <div className="text-[10px] text-gray-400 uppercase font-mono">
                {sortedMeals.length} Scheduled
              </div>
            </div>

            {/* MEALS LIST */}
            <div className="space-y-2.5 flex-1">
              {sortedMeals.length === 0 ? (
                <div className="text-[11px] text-gray-500 text-center py-4 italic">
                  Rest / Fasting Day
                </div>
              ) : (
                sortedMeals.map((meal, mIdx) => {
                  const mealId = `${dayPlan.day}-${mIdx}`;
                  const isExpanded = expandedMeal === mealId;
                  const isSwapping = swappingMealName === meal.name;

                  return (
                    <div
                      key={mIdx}
                      className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-2.5 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center gap-1">
                        <span className="font-extrabold text-[#00F2FE] text-[9px] uppercase bg-[#0F1724] px-1.5 py-0.5 rounded border border-[#1E2D4A]">
                          {meal.type}
                        </span>
                        {meal.prepTime && (
                          <span className="text-[9px] text-gray-400 font-mono">
                            ⏱️ {meal.prepTime}
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-white text-xs leading-snug">
                        {meal.name}
                      </div>

                      {/* FULL MACROS */}
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono pt-0.5 text-center">
                        <span className="bg-[#0F1724] py-0.5 rounded text-amber-400 font-bold border border-[#1E2D4A]">
                          {meal.calories}k
                        </span>
                        <span className="bg-[#0F1724] py-0.5 rounded text-emerald-400 font-bold border border-[#1E2D4A]">
                          {meal.protein}g P
                        </span>
                        <span className="bg-[#0F1724] py-0.5 rounded text-cyan-400 border border-[#1E2D4A]">
                          {meal.carbs ?? 0}g C
                        </span>
                        <span className="bg-[#0F1724] py-0.5 rounded text-rose-400 border border-[#1E2D4A]">
                          {meal.fat ?? 0}g F
                        </span>
                      </div>

                      {/* TOGGLE RECIPE */}
                      <button
                        onClick={() => toggleExpand(mealId)}
                        className="w-full mt-1 text-[9px] font-extrabold uppercase bg-[#0F1724] hover:bg-[#1E2D4A] text-[#00F2FE] py-1 rounded border border-[#1E2D4A] transition"
                      >
                        {isExpanded ? 'Hide ▲' : 'Recipe ▼'}
                      </button>

                      {/* RECIPE DETAILS & ACTION BUTTON MATRIX */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-[#1E2D4A] space-y-2 text-gray-300 text-[10px]">
                          <div>
                            <strong className="text-[#00F2FE] block mb-0.5">
                              Ingredients:
                            </strong>
                            <ul className="list-disc pl-3 space-y-0.5">
                              {meal.ingredients?.map((ing, iIdx) => (
                                <li key={iIdx}>{ing}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <strong className="text-[#00F2FE] block mb-0.5">
                              Instructions:
                            </strong>
                            <ol className="list-decimal pl-3 space-y-0.5">
                              {meal.instructions?.map((inst, iIdx) => (
                                <li key={iIdx}>{inst}</li>
                              ))}
                            </ol>
                          </div>

                          {/* ACTION BUTTON MATRIX */}
                          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#1E2D4A]/50">
                            <button
                              onClick={() => handlePrintRecipe(meal)}
                              className="bg-[#0F1724] hover:bg-[#1E2D4A] text-gray-200 border border-[#1E2D4A] py-1 rounded text-[9px] font-bold uppercase transition text-center"
                            >
                              🖨️ Print
                            </button>
                            <button
                              onClick={() => handleShareRecipe(meal)}
                              className="bg-[#0F1724] hover:bg-[#1E2D4A] text-[#00F2FE] border border-[#1E2D4A] py-1 rounded text-[9px] font-bold uppercase transition text-center"
                            >
                              📤 Share
                            </button>
                            {onSwapMeal && (
                              <button
                                onClick={() => handleSwapClick(meal)}
                                disabled={isSwapping}
                                className={`bg-[#0F1724] hover:bg-[#1E2D4A] text-amber-400 border border-[#1E2D4A] py-1 rounded text-[9px] font-bold uppercase transition text-center ${
                                  isSwapping ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {isSwapping ? '⏳...' : '🔄 Swap'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}