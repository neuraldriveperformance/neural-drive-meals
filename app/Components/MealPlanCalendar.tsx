'use client';

import React, { useState, useEffect } from 'react';
import { getSavedRecipes, saveRecipe, unsaveRecipe } from '@/lib/recipes';

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
  familyFriendlyNote?: string;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

interface MealPlanCalendarProps {
  calendarDays: DayPlan[];
  onSwapMeal?: (day: string, mealType: string) => Promise<void> | void;
  onSelectMeal?: (meal: Meal) => void;
}

const MEAL_ORDER: { [key: string]: number } = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snacks: 4,
  Snack: 4,
};

export default function MealPlanCalendar({
  calendarDays,
  onSwapMeal,
  onSelectMeal,
}: MealPlanCalendarProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());

  // Load existing bookmarked recipe names on mount
  useEffect(() => {
    async function loadBookmarks() {
      const recipes = await getSavedRecipes();
      const names = new Set(recipes.map((r) => r.recipe_name));
      setSavedNames(names);
    }
    loadBookmarks();
  }, []);

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

  const handleToggleBookmark = async (e: React.MouseEvent, meal: Meal) => {
    e.stopPropagation();
    const isBookmarked = savedNames.has(meal.name);

    if (isBookmarked) {
      const success = await unsaveRecipe(meal.name);
      if (success) {
        setSavedNames((prev) => {
          const next = new Set(prev);
          next.delete(meal.name);
          return next;
        });
      }
    } else {
      const saved = await saveRecipe(meal);
      if (saved) {
        setSavedNames((prev) => new Set(prev).add(meal.name));
      }
    }
  };

  const handleShareRecipe = (meal: Meal) => {
    const text = `🍽️ ${meal.name} (${meal.type})
Macros: ${meal.calories} kcal \vert{}${meal.protein}g P | ${meal.carbs}g C \vert{}${meal.fat}g F
Prep Time: ${meal.prepTime || 'N/A'}

Ingredients:
${meal.ingredients.map((i) => `• ${i}`).join('\n')}

Instructions:
${meal.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n')}`;  if (navigator.clipboard) { navigator.clipboard.writeText(text); alert(`Copied "${meal.name}" recipe to clipboard!`);
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
            ${meal.calories} kcal \vert{}${meal.protein}g Protein | ${meal.carbs}g Carbs \vert{}${meal.fat}g Fat
          </div>
          <p><strong>Prep Time:</strong> ${meal.prepTime || 'N/A'}</p>
          <hr />
          <h3>Ingredients</h3>
          <ul>${meal.ingredients.map((i) => `<li>${i}</li>`).join('')}</ul>
          <h3>Instructions</h3>
          <ol>${meal.instructions.map((inst) =>