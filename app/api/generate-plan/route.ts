import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientName = 'Client',
      clientCalories = 2000,
      clientProtein = 150,
      clientExclusions = [],
      household = { adults: 1, teens: 0, children: 0, familyDislikes: [] },
      totalPortionWeight = 1.0,
      budgetLevel = 'moderate',
      weeklySchedule = {},
      varietyLevel = 3,
      enableBulkPrep = false,
      batchSessions = 2,
      maxPrepTime = 'no-limit',
      recipeHistory = [],
      isSwapRequest = false,
      swapTarget,
    } = body;

    // RULE ENFORCEMENT ON BACKEND:
    // If Max Variety (5), force bulk prep OFF.
    // If Variety < 3, force batch sessions to 1.
    const effectiveBulkPrep = varietyLevel === 5 ? false : enableBulkPrep;
    const effectiveBatchSessions = varietyLevel < 3 ? 1 : batchSessions;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const BASE_SLOT_WEIGHTS: Record<string, number> = {
      Breakfast: 0.25,
      Lunch: 0.35,
      Dinner: 0.40,
      Snack: 0.15,
    };

    // --- HELPER: MATH PARSER & INGREDIENT SCALER ---
    const scaleIngredientString = (ingredient: string, multiplier: number) => {
      if (multiplier === 1) return ingredient;

      return ingredient.replace(/^(\d+(?:\.\d+)?(?:\/\d+)?)/, (match) => {
        let num = 0;
        if (match.includes('/')) {
          const [n, d] = match.split('/');
          num = parseFloat(n) / parseFloat(d);
        } else {
          num = parseFloat(match);
        }
        const scaled = num * multiplier;
        return Number.isInteger(scaled)
          ? scaled.toString()
          : parseFloat(scaled.toFixed(2)).toString();
      });
    };

    // 1. EXCLUSION & DIETARY RESTRICTION LOGIC
    const rawExclusions = [
      ...(clientExclusions || []),
      ...(household?.familyDislikes || []),
    ].filter(Boolean);

    const exclusionsLower = rawExclusions.map((e: string) => e.toLowerCase().trim());

    const isVegan = exclusionsLower.some((e) => e.includes('vegan'));
    const isVegetarian =
      isVegan ||
      exclusionsLower.some(
        (e) => e.includes('vegetarian') || e.includes('no meat')
      );
    const isGlutenFree = exclusionsLower.some((e) => e.includes('gluten'));
    const isDairyFree = isVegan || exclusionsLower.some((e) => e.includes('dairy'));
    const isKeto = exclusionsLower.some(
      (e) => e.includes('keto') || e.includes('low carb') || e.includes('low-carb')
    );
    const isHalal = exclusionsLower.some((e) => e.includes('halal'));
    const isKosher = exclusionsLower.some((e) => e.includes('kosher'));

    const meatTerms = [
      'beef', 'chicken', 'turkey', 'pork', 'salmon', 'fish', 'steak', 'meat',
      'poultry', 'shrimp', 'tuna', 'cod', 'seafood', 'bacon'
    ];

    const createScaledMeal = (
      baseMeal: any,
      targetCals: number,
      targetProt: number,
      type: string,
      portionMultiplier: number = 1.0,
      bulkPrepActive: boolean = false,
      occurrencesCount: number = 1
    ) => {
      const cals = targetCals || baseMeal.calories;
      const prot = targetProt || baseMeal.protein;

      const calorieRatio = cals / (baseMeal.calories || 600);
      const combinedMultiplier = calorieRatio * portionMultiplier;

      const scaledIngredients = (baseMeal.ingredients || []).map((ing: string) =>
        scaleIngredientString(ing, combinedMultiplier)
      );

      const proteinCals = prot * 4;
      const remainingCals = Math.max(cals - proteinCals, 0);

      const targetCarbs = isKeto
        ? Math.round((baseMeal.carbs || 10) * calorieRatio)
        : Math.round((remainingCals * 0.55) / 4);

      const targetFat = isKeto
        ? Math.round((cals - proteinCals - targetCarbs * 4) / 9)
        : Math.round((remainingCals * 0.45) / 9);

      let batchYieldText = '1 Single Portion';
      if (bulkPrepActive) {
        batchYieldText =
          effectiveBatchSessions === 1
            ? `1 Power Prep Session • Yields ${occurrencesCount} Servings`
            : `2 Session Split • Yields ${occurrencesCount} Servings`;
      }

      return {
        ...baseMeal,
        type,
        calories: Math.round(cals),
        protein: Math.round(prot),
        carbs: Math.max(targetCarbs, 0),
        fat: Math.max(targetFat, 0),
        ingredients: scaledIngredients,
        rawIngredients: baseMeal.ingredients,
        isBatchCooked: bulkPrepActive,
        batchYield: batchYieldText,
        bulkPrepNote: bulkPrepActive
          ? `Note: Quantities reflect the ${
              effectiveBatchSessions === 1
                ? 'weekly power prep session'
                : '2 mid-week prep sessions'
            }.`
          : null,
      };
    };

    // 2. OPENAI DYNAMIC RECIPE POOL GENERATION
    const systemPrompt = `You are a world-class executive chef and sports nutritionist.
Generate dynamic, highly varied recipe options.

CREATIVE DIVERSITY INSTRUCTIONS:
- Draw from an expansive global library of recipes and cuisines (e.g., Mediterranean, Asian, Latin, Middle Eastern, American, European).
- Avoid defaulting to standard generic meal-prep staples (like plain chicken and rice) unless explicitly requested.
- Produce creative, distinct dish names and complete ingredients for every output.`;

    const userPrompt = `Generate a pool of 6 Lunch recipes and 6 Dinner recipes for a client.
Client Calories: ${clientCalories} kcal | Protein Target: ${clientProtein}g
Dietary Restrictions / Exclusions to strictly follow: ${
      exclusionsLower.length > 0 ? exclusionsLower.join(', ') : 'None'
    }

Return JSON with this exact shape:
{
  "lunchPool": [
    {
      "name": "Creative Dish Name",
      "calories": 600,
      "protein": 45,
      "carbs": 50,
      "fat": 15,
      "ingredients": ["1 cup ingredient", "1 tbsp seasoning"],
      "instructions": ["Step 1..."],
      "familyFriendlyNote": "Optional note"
    }
  ],
  "dinnerPool": [
    {
      "name": "Creative Dish Name",
      "calories": 700,
      "protein": 50,
      "carbs": 60,
      "fat": 18,
      "ingredients": ["1 cup ingredient", "1 tbsp seasoning"],
      "instructions": ["Step 1..."],
      "familyFriendlyNote": "Optional note"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const parsedPools = JSON.parse(
      completion.choices[0].message.content || '{"lunchPool":[], "dinnerPool":[]}'
    );

    const lunchPool = parsedPools.lunchPool || [];
    const dinnerPool = parsedPools.dinnerPool || [];

    // SWAP HANDLER
    if (isSwapRequest && swapTarget) {
      const pool = swapTarget.type === 'Lunch' ? lunchPool : dinnerPool;
      const randomIndex = Math.floor(Math.random() * (pool.length || 1));
      const baseMeal = pool[randomIndex] || {
        name: 'Custom Macro Bowl',
        calories: swapTarget.targetCalories || 650,
        protein: swapTarget.targetProtein || 45,
        ingredients: ['1 serving balanced ingredients'],
      };

      const swappedMeal = createScaledMeal(
        baseMeal,
        swapTarget.targetCalories || 700,
        swapTarget.targetProtein || 50,
        swapTarget.type,
        totalPortionWeight,
        effectiveBulkPrep,
        1
      );

      return NextResponse.json({ swappedMeal });
    }

    const isScheduleCompletelyEmpty = Object.keys(weeklySchedule).length === 0;

    // PRE-PASS: COUNT OCCURRENCES OF EACH MEAL
    const mealOccurrences: Record<string, number> = {};

    days.forEach((day, dayIndex) => {
      const daySchedule = weeklySchedule[day] || {};
      const generateSlots: string[] = [];

      Object.entries(daySchedule).forEach(([slotType, slotData]: [string, any]) => {
        if (!slotData) return;
        const statusLower = (
          typeof slotData === 'string' ? slotData : slotData?.status || ''
        ).toLowerCase();
        if (statusLower === 'generate') generateSlots.push(slotType);
      });

      if (isScheduleCompletelyEmpty) generateSlots.push('Lunch', 'Dinner');

      generateSlots.forEach((type) => {
        let baseMeal;
        const rotateStep = effectiveBulkPrep ? (effectiveBatchSessions === 1 ? 7 : 3) : 1;
        if (type === 'Lunch' && lunchPool.length > 0) {
          const index =
            Number(varietyLevel) === 1
              ? 0
              : Math.floor(dayIndex / rotateStep) % lunchPool.length;
          baseMeal = lunchPool[index];
        } else if (type === 'Dinner' && dinnerPool.length > 0) {
          const index =
            Number(varietyLevel) === 1
              ? 0
              : Math.floor(dayIndex / rotateStep) % dinnerPool.length;
          baseMeal = dinnerPool[index];
        }
        if (baseMeal) {
          mealOccurrences[baseMeal.name] = (mealOccurrences[baseMeal.name] || 0) + 1;
        }
      });
    });

    const ingredientAggregator: Record<string, number> = {};

    // FULL PLAN GENERATION HANDLER
    const mockWeeklyCalendar = days.map((day, dayIndex) => {
      const daySchedule = weeklySchedule[day] || {};

      const generateSlots: string[] = [];
      const selfPreparedSlots: { type: string; mealData: any }[] = [];

      Object.entries(daySchedule).forEach(([slotType, slotData]: [string, any]) => {
        if (!slotData) return;

        const statusLower = (
          typeof slotData === 'string' ? slotData : slotData?.status || ''
        ).toLowerCase();

        const isGenerate = statusLower === 'generate';
        const isSelfProvided =
          statusLower.includes('self') || statusLower.includes('custom');

        if (isGenerate) {
          generateSlots.push(slotType);
        } else if (isSelfProvided) {
          selfPreparedSlots.push({
            type: slotType,
            mealData: typeof slotData === 'object' ? slotData.meal || slotData : {},
          });
        }
      });

      if (isScheduleCompletelyEmpty) {
        generateSlots.push('Lunch', 'Dinner');
      }

      if (generateSlots.length === 0 && selfPreparedSlots.length === 0) {
        return { day, meals: [] };
      }

      let remainingCalories = clientCalories;
      let remainingProtein = clientProtein;

      const preparedMealsFormatted = selfPreparedSlots.map(({ type, mealData }) => {
        const fallbackCal = Math.round(clientCalories * (BASE_SLOT_WEIGHTS[type] || 0.25));

        const cal = Number(mealData.calories || mealData.cals) || fallbackCal;
        const prot = Number(mealData.protein) || Math.round((cal * 0.3) / 4);
        const carbs = Number(mealData.carbs) || Math.round((cal * 0.4) / 4);
        const fat = Number(mealData.fat) || Math.round((cal * 0.3) / 9);

        remainingCalories -= cal;
        remainingProtein -= prot;

        return {
          type,
          name: mealData.name || mealData.title || `Self-Provided ${type}`,
          calories: cal,
          protein: prot,
          carbs: carbs,
          fat: fat,
          ingredients: mealData.ingredients || ['Self-provided meal'],
          instructions: mealData.instructions || ['Prepared independently.'],
          isSelfPrepared: true,
          bulkPrepNote: null,
        };
      });

      remainingCalories = Math.max(remainingCalories, 0);
      remainingProtein = Math.max(remainingProtein, 0);

      const totalGenerateWeight = generateSlots.reduce(
        (sum, slot) => sum + (BASE_SLOT_WEIGHTS[slot] || 0.25),
        0
      );

      const generatedMeals = generateSlots.map((type) => {
        const slotWeight = BASE_SLOT_WEIGHTS[type] || 0.25;
        const ratio =
          totalGenerateWeight > 0 ? slotWeight / totalGenerateWeight : 1 / generateSlots.length;

        const targetCals = Math.round(remainingCalories * ratio);
        const targetProt = Math.round(remainingProtein * ratio);

        let baseMeal;
        const rotateStep = effectiveBulkPrep ? (effectiveBatchSessions === 1 ? 7 : 3) : 1;
        if (type === 'Lunch' && lunchPool.length > 0) {
          const index =
            Number(varietyLevel) === 1
              ? 0
              : Math.floor(dayIndex / rotateStep) % lunchPool.length;
          baseMeal = lunchPool[index];
        } else if (type === 'Dinner' && dinnerPool.length > 0) {
          const index =
            Number(varietyLevel) === 1
              ? 0
              : Math.floor(dayIndex / rotateStep) % dinnerPool.length;
          baseMeal = dinnerPool[index];
        } else {
          baseMeal = {
            name: isVegan ? 'Berry & Chia Oat Bowl' : 'Egg White & Avocado Wrap',
            calories: 400,
            protein: 30,
            carbs: 45,
            fat: 12,
            ingredients: isVegan
              ? [
                  '1/2 cup Gluten-Free Rolled Oats',
                  '1 tbsp Chia Seeds',
                  '1/2 cup Mixed Fresh Berries',
                  '1 cup Unsweetened Almond Milk',
                ]
              : [
                  '1/2 cup Egg Whites',
                  '1 Gluten-Free Tortilla',
                  '1/4 Whole Avocado',
                  '1 tbsp Fresh Salsa',
                  '1/4 tsp Salt & Pepper',
                ],
            instructions: ['Combine ingredients in a bowl or wrap into tortilla and serve.'],
            familyFriendlyNote: 'Adjustable portion sizes.',
          };
        }

        const occurrences = mealOccurrences[baseMeal.name] || 1;
        const cardMultiplier = effectiveBulkPrep
          ? occurrences * totalPortionWeight
          : totalPortionWeight;

        const scaledMeal = createScaledMeal(
          baseMeal,
          targetCals,
          targetProt,
          type,
          cardMultiplier,
          effectiveBulkPrep,
          occurrences
        );

        if (effectiveBulkPrep) {
          if (!mealOccurrences[`added_${baseMeal.name}`]) {
            scaledMeal.ingredients.forEach((ing: string) => {
              ingredientAggregator[ing] = 1;
            });
            mealOccurrences[`added_${baseMeal.name}`] = 1;
          }
        } else {
          scaledMeal.ingredients.forEach((ing: string) => {
            ingredientAggregator[ing] = (ingredientAggregator[ing] || 0) + 1;
          });
        }

        return scaledMeal;
      });

      const allMeals = [...preparedMealsFormatted, ...generatedMeals];
      return { day, meals: allMeals };
    });

    // 5. GROCERY CONSOLIDATION
    const categorizeIngredient = (ingredient: string) => {
      const lower = ingredient.toLowerCase();
      if (
        meatTerms.some((t) => lower.includes(t)) ||
        lower.includes('tofu') ||
        lower.includes('tempeh') ||
        lower.includes('egg') ||
        lower.includes('yogurt')
      ) {
        return 'Proteins';
      }
      if (
        lower.includes('rice') ||
        lower.includes('quinoa') ||
        lower.includes('tortilla') ||
        lower.includes('noodle') ||
        lower.includes('bread') ||
        lower.includes('potato') ||
        lower.includes('oats')
      ) {
        return 'Grains & Carbs';
      }
      if (
        lower.includes('pepper') ||
        lower.includes('cabbage') ||
        lower.includes('greens') ||
        lower.includes('cucumber') ||
        lower.includes('broccoli') ||
        lower.includes('asparagus') ||
        lower.includes('peas') ||
        lower.includes('berries') ||
        lower.includes('avocado')
      ) {
        return 'Produce';
      }
      return 'Condiments & Seasonings';
    };

    const groupedGroceries: Record<string, Map<string, number>> = {
      Proteins: new Map(),
      'Grains & Carbs': new Map(),
      Produce: new Map(),
      'Condiments & Seasonings': new Map(),
    };

    Object.entries(ingredientAggregator).forEach(([item, count]) => {
      const category = categorizeIngredient(item);
      groupedGroceries[category].set(item, count);
    });

    const consolidatedGroceries = Object.entries(groupedGroceries).flatMap(
      ([category, itemsMap]) =>
        Array.from(itemsMap.entries()).map(([item, count]) => ({
          category,
          item: effectiveBulkPrep ? item : scaleIngredientString(item, count),
        }))
    );

    const mockData = {
      weeklyCalendar: mockWeeklyCalendar,
      groceries: consolidatedGroceries,
      estimatedGroceryCost: `$${Math.round(80 * totalPortionWeight)} – $${Math.round(
        130 * totalPortionWeight
      )} USD`,
    };

    return NextResponse.json(mockData);
  } catch (error: unknown) {
    console.error('Error generating plan with OpenAI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}