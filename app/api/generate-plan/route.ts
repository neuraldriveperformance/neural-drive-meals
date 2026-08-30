import { NextResponse } from 'next/server';

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
      maxPrepTime = 'no-limit',
      recipeHistory = [],
      isSwapRequest = false,
      swapTarget,
    } = body;

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

    const exclusionsLower = rawExclusions.map((e) => e.toLowerCase().trim());

    // Extract designated global dietary restrictions
    const isVegan = exclusionsLower.some((e) => e.includes('vegan'));
    const isVegetarian = isVegan || exclusionsLower.some(
      (e) => e.includes('vegetarian') || e.includes('no meat')
    );
    const isGlutenFree = exclusionsLower.some((e) => e.includes('gluten'));
    const isDairyFree = isVegan || exclusionsLower.some((e) => e.includes('dairy'));
    const isKeto = exclusionsLower.some((e) => e.includes('keto') || e.includes('low carb') || e.includes('low-carb'));
    const isHalal = exclusionsLower.some((e) => e.includes('halal'));
    const isKosher = exclusionsLower.some((e) => e.includes('kosher'));

    const meatTerms = [
      'beef', 'chicken', 'turkey', 'pork', 'salmon', 'fish', 'steak', 'meat',
      'poultry', 'shrimp', 'tuna', 'cod', 'seafood', 'bacon'
    ];

    // Exclude dietary flags from direct string matching to avoid false positives
    const dietaryFlags = [
      'gluten-free', 'gluten free', 'dairy-free', 'dairy free',
      'vegetarian', 'vegan', 'no meat', 'keto', 'low carb', 'low-carb',
      'halal', 'kosher'
    ];

    const activeBannedTerms = Array.from(
      new Set([
        ...exclusionsLower.filter((term) => !dietaryFlags.some((flag) => term.includes(flag))),
        ...(isVegetarian ? meatTerms : []),
      ])
    );

    const createScaledMeal = (
      baseMeal: any,
      targetCals: number,
      targetProt: number,
      type: string,
      portionMultiplier: number = 1.0,
      bulkPrepActive: boolean = false
    ) => {
      const cals = targetCals || baseMeal.calories;
      const prot = targetProt || baseMeal.protein;
      
      const calorieRatio = cals / (baseMeal.calories || 600);
      const combinedMultiplier = calorieRatio * portionMultiplier;

      const scaledIngredients = baseMeal.ingredients.map((ing: string) =>
        scaleIngredientString(ing, combinedMultiplier)
      );

      return {
        ...baseMeal,
        type,
        calories: Math.round(cals),
        protein: Math.round(prot),
        carbs: Math.round((baseMeal.carbs || 0) * calorieRatio),
        fat: Math.round((baseMeal.fat || 0) * calorieRatio),
        ingredients: scaledIngredients,
        rawIngredients: baseMeal.ingredients,
        ...(bulkPrepActive && {
          bulkPrepNote: "Note: Ingredient quantities listed above represent the full batch required for your weekly bulk prep.",
        }),
      };
    };

    // 2. RECIPE POOLS WITH DIETARY FLAGS
    const rawLunchPool = [
      {
        name: 'Lean Beef & Rice Meal Prep Bowl',
        calories: 650,
        protein: 48,
        carbs: 55,
        fat: 16,
        ingredients: [
          '6oz 93/7 Lean Ground Beef',
          '1 cup Cooked Brown Rice',
          '1 cup Red & Yellow Bell Peppers (diced)',
          '1 tsp Olive Oil',
          '1/2 tsp Garlic Powder',
          '1/2 tsp Onion Powder',
          '1/4 tsp Salt & Black Pepper',
        ],
        instructions: [
          'Heat olive oil in a skillet over medium-high heat.',
          'Add ground beef, garlic powder, onion powder, salt, and pepper; brown for 6-8 minutes.',
          'Add diced bell peppers and saute for 3-4 minutes until tender-crisp.',
          'Divide brown rice into prep containers and top with beef mixture.',
        ],
        familyFriendlyNote: 'Serve veggies on the side if preferred by children.',
        isPlantBased: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'Grilled Chicken & Quinoa Harvest Salad',
        calories: 620,
        protein: 52,
        carbs: 45,
        fat: 18,
        ingredients: [
          '6oz Boneless Skinless Chicken Breast',
          '1 cup Cooked Quinoa',
          '2 cups Mixed Salad Greens',
          '1 tbsp Extra Virgin Olive Oil',
          '1 tbsp Balsamic Vinegar',
          '1/4 tsp Salt & Pepper',
        ],
        instructions: [
          'Season chicken breast and grill on medium-high heat for 6-7 mins per side.',
          'Whisk olive oil and balsamic vinegar for dressing.',
          'Slice chicken and layer over greens and quinoa.',
        ],
        familyFriendlyNote: 'Keep dressing on the side for kids.',
        isPlantBased: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'Keto Steak & Avocado Bowl',
        calories: 680,
        protein: 50,
        carbs: 8,
        fat: 48,
        ingredients: [
          '7oz Grilled Top Sirloin Steak',
          '1 Whole Avocado (sliced)',
          '2 cups Spinach & Wild Greens',
          '2 tbsp Olive Oil Dressing',
          '1/4 cup Shredded Cheddar',
        ],
        instructions: [
          'Grill sirloin to preferred doneness and slice.',
          'Serve over greens with sliced avocado and shredded cheddar.',
          'Drizzle with olive oil dressing.',
        ],
        familyFriendlyNote: 'Keep cheese separate if needed.',
        isPlantBased: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: false,
        isKeto: true,
        isHalal: true,
        isKosher: false,
      },
      {
        name: 'Crispy Tofu & Quinoa Buddha Bowl',
        calories: 600,
        protein: 42,
        carbs: 60,
        fat: 18,
        ingredients: [
          '7oz Extra-Firm Tofu (cubed & baked)',
          '1 cup Cooked Quinoa',
          '1/2 cup Edamame Beans',
          '1 cup Shredded Purple Cabbage',
          '1 tbsp Peanut Butter Dressing',
        ],
        instructions: [
          'Press and cube tofu, season with soy sauce and cornstarch, and bake at 400°F for 20 mins until crisp.',
          'Assemble bowl with quinoa, edamame, cabbage, and baked tofu.',
          'Drizzle peanut butter dressing on top.',
        ],
        familyFriendlyNote: 'Serve dressing on the side for kids.',
        isPlantBased: true,
        isVegan: true,
        isGlutenFree: true,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'Chickpea & Lentil Power Salad with Lemon Tahini',
        calories: 580,
        protein: 38,
        carbs: 65,
        fat: 16,
        ingredients: [
          '1 cup Low-Sodium Chickpeas (rinsed)',
          '1/2 cup Cooked Brown Lentils',
          '2 cups Mixed Salad Greens',
          '1/4 cup Diced Cucumbers',
          '1.5 tbsp Lemon Tahini Dressing',
        ],
        instructions: [
          'Combine chickpeas, lentils, greens, and diced cucumbers in a large bowl.',
          'Whisk tahini, lemon juice, garlic, and water for dressing.',
          'Toss salad with dressing right before serving.',
        ],
        familyFriendlyNote: 'Offer pita bread on the side for younger family members.',
        isPlantBased: true,
        isVegan: true,
        isGlutenFree: true,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
    ];

    const rawDinnerPool = [
      {
        name: 'Sheet Pan Wild Salmon & Roasted Asparagus',
        calories: 680,
        protein: 52,
        carbs: 10,
        fat: 46,
        ingredients: [
          '7oz Wild Salmon Fillet',
          '12 Fresh Asparagus Spears',
          '1.5 tbsp Olive Oil',
          '1 tbsp Lemon Juice',
          '1/2 tsp Garlic Salt & Black Pepper',
        ],
        instructions: [
          'Place salmon and asparagus on a baking sheet.',
          'Drizzle with olive oil, lemon juice, garlic salt, and pepper.',
          'Bake at 400°F for 12-15 mins until salmon flakes with a fork.',
        ],
        familyFriendlyNote: 'Flake salmon for younger kids.',
        isPlantBased: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: true,
        isKeto: true,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'Pan-Seared Honey Garlic Chicken & Rice',
        calories: 720,
        protein: 55,
        carbs: 65,
        fat: 18,
        ingredients: [
          '7oz Boneless Skinless Chicken Breast',
          '1.25 cups Cooked Jasmine Rice',
          '1 cup Steamed Broccoli Florets',
          '1.5 tbsp Raw Honey',
          '1 tbsp Low-Sodium Soy Sauce',
        ],
        instructions: [
          'Sear seasoned chicken breast in a skillet until golden.',
          'Pour honey and soy sauce over chicken and simmer until glaze thickens.',
          'Serve with jasmine rice and steamed broccoli.',
        ],
        familyFriendlyNote: 'Deconstruct for children without extra glaze.',
        isPlantBased: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'High-Protein Black Bean & Tempeh Fajitas',
        calories: 710,
        protein: 46,
        carbs: 70,
        fat: 20,
        ingredients: [
          '6oz Sliced Tempeh',
          '1 cup Black Beans',
          '2 Whole Grain Tortillas',
          '1 cup Bell Peppers & Onions (sliced)',
          '2 tbsp Guacamole',
        ],
        instructions: [
          'Sear tempeh slices and fajita veggies in a hot skillet with taco seasoning for 6-8 mins.',
          'Warm tortillas and layer with black beans, tempeh, and veggies.',
          'Top with guacamole.',
        ],
        familyFriendlyNote: 'Assemble as DIY taco night for kids.',
        isPlantBased: true,
        isVegan: true,
        isGlutenFree: false,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
      {
        name: 'Pan-Seared Honey Garlic Tofu & Jasmine Rice',
        calories: 690,
        protein: 40,
        carbs: 75,
        fat: 16,
        ingredients: [
          '8oz Firm Tofu (cubed)',
          '1.25 cups Cooked Jasmine Rice',
          '1 cup Steamed Broccoli',
          '1.5 tbsp Honey Soy Glaze',
          '1 tsp Sesame Oil',
        ],
        instructions: [
          'Sear cubed tofu in sesame oil until golden on all sides.',
          'Pour honey soy glaze over tofu and simmer until thick.',
          'Serve glazed tofu over jasmine rice with steamed broccoli.',
        ],
        familyFriendlyNote: 'Serve sauce on the side for kids.',
        isPlantBased: true,
        isVegan: true,
        isGlutenFree: false,
        isDairyFree: true,
        isKeto: false,
        isHalal: true,
        isKosher: true,
      },
    ];

    // 3. DIETARY RULE CHECKING
    const isMealAllowed = (meal: any) => {
      if (isVegan && meal.isVegan === false) return false;
      if (isGlutenFree && meal.isGlutenFree === false) return false;
      if (isDairyFree && meal.isDairyFree === false) return false;
      if (isKeto && meal.isKeto === false) return false;
      if (isHalal && meal.isHalal === false) return false;
      if (isKosher && meal.isKosher === false) return false;

      if (activeBannedTerms.length === 0) return true;
      const fullMealText = `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase();
      return !activeBannedTerms.some((term) => fullMealText.includes(term.trim()));
    };

    let lunchPool = rawLunchPool.filter(isMealAllowed);
    let dinnerPool = rawDinnerPool.filter(isMealAllowed);

    if (!isVegetarian) {
      const animalLunches = lunchPool.filter((m) => !m.isPlantBased);
      if (animalLunches.length > 0) lunchPool = animalLunches;

      const animalDinners = dinnerPool.filter((m) => !m.isPlantBased);
      if (animalDinners.length > 0) dinnerPool = animalDinners;
    }

    if (lunchPool.length === 0) lunchPool = rawLunchPool;
    if (dinnerPool.length === 0) dinnerPool = rawDinnerPool;

    // --- SWAP REQUEST HANDLER ---
    if (isSwapRequest && swapTarget) {
      const pool = swapTarget.type === 'Lunch' ? lunchPool : swapTarget.type === 'Dinner' ? dinnerPool : lunchPool;
      const randomIndex = Math.floor(Math.random() * pool.length);
      const swappedMeal = createScaledMeal(
        pool[randomIndex],
        swapTarget.targetCalories || 700,
        swapTarget.targetProtein || 50,
        swapTarget.type,
        totalPortionWeight,
        enableBulkPrep
      );

      return NextResponse.json({ swappedMeal });
    }

    const isScheduleCompletelyEmpty = Object.keys(weeklySchedule).length === 0;

    // PRE-PASS: COUNT OCCURRENCES OF EACH MEAL ACROSS THE WEEK
    const mealOccurrences: Record<string, number> = {};

    days.forEach((day, dayIndex) => {
      const daySchedule = weeklySchedule[day] || {};
      const generateSlots: string[] = [];

      Object.entries(daySchedule).forEach(([slotType, slotData]: [string, any]) => {
        if (!slotData) return;
        const statusLower = (typeof slotData === 'string' ? slotData : slotData?.status || '').toLowerCase();
        if (statusLower === 'generate') generateSlots.push(slotType);
      });

      if (isScheduleCompletelyEmpty) generateSlots.push('Lunch', 'Dinner');

      generateSlots.forEach((type) => {
        let baseMeal;
        if (type === 'Lunch') {
          const index = Number(varietyLevel) === 1 ? 0 : enableBulkPrep ? Math.floor(dayIndex / 2) % lunchPool.length : dayIndex % lunchPool.length;
          baseMeal = lunchPool[index];
        } else if (type === 'Dinner') {
          const index = Number(varietyLevel) === 1 ? 0 : enableBulkPrep ? Math.floor(dayIndex / 2) % dinnerPool.length : dayIndex % dinnerPool.length;
          baseMeal = dinnerPool[index];
        }
        if (baseMeal) {
          mealOccurrences[baseMeal.name] = (mealOccurrences[baseMeal.name] || 0) + 1;
        }
      });
    });

    const ingredientAggregator: Record<string, number> = {};

    // --- FULL PLAN GENERATION HANDLER ---
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
        const isSelfProvided = statusLower.includes('self') || statusLower.includes('custom');

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
        const prot = Number(mealData.protein) || Math.round((cal * 0.30) / 4);
        const carbs = Number(mealData.carbs) || Math.round((cal * 0.40) / 4);
        const fat = Number(mealData.fat) || Math.round((cal * 0.30) / 9);

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
        const ratio = totalGenerateWeight > 0 ? slotWeight / totalGenerateWeight : 1 / generateSlots.length;

        const targetCals = Math.round(remainingCalories * ratio);
        const targetProt = Math.round(remainingProtein * ratio);

        let baseMeal;
        if (type === 'Lunch') {
          const index = Number(varietyLevel) === 1 ? 0 : enableBulkPrep ? Math.floor(dayIndex / 2) % lunchPool.length : dayIndex % lunchPool.length;
          baseMeal = lunchPool[index];
        } else if (type === 'Dinner') {
          const index = Number(varietyLevel) === 1 ? 0 : enableBulkPrep ? Math.floor(dayIndex / 2) % dinnerPool.length : dayIndex % dinnerPool.length;
          baseMeal = dinnerPool[index];
        } else {
          baseMeal = {
            name: isVegan ? 'Berry & Chia Oat Bowl' : 'Egg White & Avocado Wrap',
            calories: 400,
            protein: 30,
            carbs: 40,
            fat: 12,
            ingredients: isVegan
              ? ['1/2 cup Rolled Oats', '1 tbsp Chia Seeds', '1/2 cup Mixed Fresh Berries', '1 cup Unsweetened Almond Milk']
              : ['1/2 cup Egg Whites', '1 Whole Wheat Tortilla', '1/4 Whole Avocado', '1 tbsp Fresh Salsa', '1/4 tsp Salt & Pepper'],
            instructions: ['Combine ingredients in a bowl or wrap into tortilla and serve.'],
            familyFriendlyNote: 'Adjustable portion sizes.',
            isVegan: isVegan,
            isGlutenFree: false,
            isDairyFree: true,
            isKeto: false,
            isHalal: true,
            isKosher: true,
          };
        }

        const occurrences = mealOccurrences[baseMeal.name] || 1;
        const cardMultiplier = enableBulkPrep ? occurrences * totalPortionWeight : totalPortionWeight;

        const scaledMeal = createScaledMeal(baseMeal, targetCals, targetProt, type, cardMultiplier, enableBulkPrep);

        if (enableBulkPrep) {
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

    // 5. GROCERY CONSOLIDATION & CATEGORIZATION
    const categorizeIngredient = (ingredient: string) => {
      const lower = ingredient.toLowerCase();
      if (meatTerms.some((t) => lower.includes(t)) || lower.includes('tofu') || lower.includes('tempeh') || lower.includes('egg') || lower.includes('yogurt')) {
        return 'Proteins';
      }
      if (lower.includes('rice') || lower.includes('quinoa') || lower.includes('tortilla') || lower.includes('noodle') || lower.includes('bread') || lower.includes('potato')) {
        return 'Grains & Carbs';
      }
      if (lower.includes('pepper') || lower.includes('cabbage') || lower.includes('greens') || lower.includes('cucumber') || lower.includes('broccoli') || lower.includes('asparagus') || lower.includes('peas') || lower.includes('berries') || lower.includes('avocado')) {
        return 'Produce';
      }
      return 'Condiments & Seasonings';
    };

    const groupedGroceries: Record<string, Map<string, number>> = {
      'Proteins': new Map(),
      'Grains & Carbs': new Map(),
      'Produce': new Map(),
      'Condiments & Seasonings': new Map(),
    };

    Object.entries(ingredientAggregator).forEach(([item, count]) => {
      const category = categorizeIngredient(item);
      groupedGroceries[category].set(item, count);
    });

    const consolidatedGroceries = Object.entries(groupedGroceries).flatMap(([category, itemsMap]) =>
      Array.from(itemsMap.entries()).map(([item, count]) => ({
        category,
        item: enableBulkPrep ? item : scaleIngredientString(item, count),
      }))
    );

    const mockData = {
      weeklyCalendar: mockWeeklyCalendar,
      groceries: consolidatedGroceries,
      estimatedGroceryCost: `$${Math.round(80 * totalPortionWeight)} – $${Math.round(130 * totalPortionWeight)} USD`,
    };

    return NextResponse.json(mockData);
  } catch (error: unknown) {
    console.error('Error generating plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}