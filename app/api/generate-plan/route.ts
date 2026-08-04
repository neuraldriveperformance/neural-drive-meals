import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientName = body.name || 'Client';
    const calories = Number(body.targetCalories) || 2450;
    const protein = Number(body.targetProteinGrams) || 160;
    const householdSize = Number(body.householdSize) || 1;
    const exclusions = body.exclusions?.length ? body.exclusions.join(', ') : 'None';
    const budgetLevel = body.budgetLevel || 'moderate';
    const maxPrepTime = body.maxPrepTime || 'no-limit';
    const varietyLevel = Number(body.varietyLevel) || 3;
    const enableBulkPrep = body.enableBulkPrep ?? false;
    const weeklySchedule = body.weeklySchedule || {};
    
    // Read recent recipe history (up to 60 recipes) sent from client
    const rawHistory: string[] = body.recipeHistory || [];
    const recipeHistory = rawHistory.slice(-60);

    // Parse max prep time into numerical minutes for filtering
    const prepTimeMap: { [key: string]: number } = {
      '15-mins': 15,
      '30-mins': 30,
      '45-mins': 45,
      '60-mins': 60,
      '90-mins': 90,
      '120-mins': 120,
      'no-limit': 999,
    };
    const maxPrepMinutes = prepTimeMap[maxPrepTime] || 999;

    // Dynamic Seed & Cuisine Mix
    const timestampSeed = Date.now().toString(36);
    const randomSeed = Math.floor(Math.random() * 1000000);

    const cuisinesList = [
      'Mediterranean & Aegean',
      'Latin American & Southwestern',
      'East Asian & Southeast Asian',
      'Middle Eastern & Levantine',
      'Modern American Bistro',
      'Italian & Coastal European',
      'Indian & South Asian Curry/Spices',
    ];

    const selectedCuisines = [...cuisinesList]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .join(', ');

    // Variety Level Rules
    let varietyInstruction = '';
    if (varietyLevel === 5) {
      varietyInstruction = `VARIETY LEVEL 5/5 (MAXIMUM DIVERSITY): ABSOLUTELY ZERO REPEATED MEALS. Every single day MUST feature completely distinct recipes, different main protein sources, and varied culinary styles (${selectedCuisines}). Do not repeat lunch or dinner across the week.`;
    } else if (varietyLevel === 4) {
      varietyInstruction = `VARIETY LEVEL 4/5 (HIGH VARIETY): High recipe rotation (${selectedCuisines}). Maximum 1 repeat meal allowed across the week.`;
    } else if (varietyLevel === 3) {
      varietyInstruction = `VARIETY LEVEL 3/5 (BALANCED VARIETY): Moderate meal rotation across the week. Re-use 2-3 favorite batch meals throughout the week.`;
    } else if (varietyLevel === 2) {
      varietyInstruction = `VARIETY LEVEL 2/5 (LOW VARIETY): Heavy meal repetition. Cook 2 core batch-prep recipes and alternate them.`;
    } else {
      varietyInstruction = `VARIETY LEVEL 1/5 (MONOTONOUS): Repeat identical Lunch and Dinner recipes across all scheduled days.`;
    }

    // Budget Rules for Prompting
    let budgetInstruction = '';
    if (budgetLevel === 'budget') {
      budgetInstruction = `BUDGET TIER: BUDGET-CONSCIOUS (ECONOMY). Focus on cost-effective, bulk-friendly ingredients (e.g., ground turkey, eggs, canned tuna, chicken thighs, frozen vegetables, oats, brown/white rice, potatoes, canned beans). Avoid expensive seafood, prime cut steaks, and specialty organic produce.`;
    } else if (budgetLevel === 'premium') {
      budgetInstruction = `BUDGET TIER: PREMIUM / ORGANIC FOCUS. Use high-tier, gourmet ingredients (e.g., grass-fed ribeye, bison, wild-caught Ahi tuna, cod, fresh berries, organic asparagus, avocado, microgreens, ancient grain blends).`;
    } else {
      budgetInstruction = `BUDGET TIER: MODERATE / BALANCED. Standard high-quality fitness staples (lean chicken breast, flank steak, salmon, fresh seasonal produce, quinoa, sweet potatoes).`;
    }

    const historyPrompt = recipeHistory.length > 0 
      ? `RECIPE HISTORY TO AVOID: Do not use any of the following ${recipeHistory.length} recipe names as they were recently generated in past sessions: ${JSON.stringify(recipeHistory)}.`
      : '';

    const systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate a dynamic, structured JSON meal plan strictly adhering to the requirements below.

DYNAMIC UNIQUE SEED: [${timestampSeed}-${randomSeed}]
CRITICAL INSTRUCTION: Generate a FRESH, CREATIVE meal plan different from any previous generation.

${historyPrompt}

CRITICAL MACROS RULE:
Each meal object MUST contain ALL FOUR explicit numerical macro fields:
- "calories": integer (kcal)
- "protein": integer (grams)
- "carbs": integer (grams)
- "fat": integer (grams)

PREP & COOK TIME RULE:
- Maximum prep/cook time allowed per meal is ${maxPrepMinutes === 999 ? 'unlimited' : `${maxPrepMinutes} minutes`}.
- Every meal's "prepTime" field MUST NOT exceed this duration limit.

BUDGET TIER INSTRUCTION:
${budgetInstruction}

GROCERY LIST RULE:
Provide an explicit, itemized grocery list in the "groceries" array. Each item must have:
- "category": string ("Proteins", "Produce", "Grains & Carbs", or "Pantry / Condiments")
- "item": string (specific ingredient name)
- "amount": string (exact scaled quantity for the entire week based on household size of ${householdSize})

CLIENT PROFILE:
- Name: ${clientName}
- Daily Target: ${calories} kcal, ${protein}g Protein
- Household Multiplier: ${householdSize} person(s)
- Dietary Exclusions/Allergies: ${exclusions}
- Variety Scale (${varietyLevel}/5 Rules): ${varietyInstruction}
- Bulk Prep Toggle State: ${enableBulkPrep ? 'Enabled' : 'Disabled'}

Schedule Matrix requested:
${JSON.stringify(weeklySchedule)}`;

    // CALL OPENAI API FIRST
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.95,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const parsedContent = JSON.parse(aiData.choices[0].message.content);
          return NextResponse.json(parsedContent);
        }
      } catch (e) {
        console.warn('OpenAI API call failed, running dynamic local fallback:', e);
      }
    }

    // LOCAL DYNAMIC FALLBACK GENERATOR (TIERED BY BUDGET & PREP TIME)
    const daysToRender = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    // Master Meal Pool annotated with tier (budget, moderate, premium) & prep minutes
    const masterMealPools: { [key: string]: any[] } = {
      Breakfast: [
        { name: 'Egg White & Spinach Omelet w/ Oats', tier: 'budget', prepMinutes: 15, prepTime: '15 mins', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.25), carbs: 45, fat: 10, ingredients: [{ item: 'Egg Whites', qty: 6, unit: 'oz' }, { item: 'Spinach', qty: 1, unit: 'cup' }, { item: 'Rolled Oats', qty: 0.5, unit: 'cup' }], instructions: ['Cook omelet', 'Serve with oats'] },
        { name: 'Peanut Butter & Oatmeal Protein Bowl', tier: 'budget', prepMinutes: 10, prepTime: '10 mins', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.25), carbs: 50, fat: 12, ingredients: [{ item: 'Rolled Oats', qty: 1, unit: 'cup' }, { item: 'Peanut Butter', qty: 2, unit: 'tbsp' }, { item: 'Whey Protein', qty: 1, unit: 'scoop' }], instructions: ['Cook oats', 'Stir in whey and peanut butter'] },
        { name: 'Greek Yogurt & Berry Protein Bowl', tier: 'moderate', prepMinutes: 5, prepTime: '5 mins', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.28), carbs: 40, fat: 6, ingredients: [{ item: 'Greek Yogurt', qty: 12, unit: 'oz' }, { item: 'Whey Protein', qty: 1, unit: 'scoop' }, { item: 'Blueberries', qty: 0.5, unit: 'cup' }], instructions: ['Mix yogurt & whey', 'Top with berries'] },
        { name: 'Turkey Sausage & Egg Scramble', tier: 'moderate', prepMinutes: 12, prepTime: '12 mins', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.26), carbs: 20, fat: 14, ingredients: [{ item: 'Large Eggs', qty: 3, unit: 'whole' }, { item: 'Turkey Sausage', qty: 2, unit: 'patties' }], instructions: ['Scramble together'] },
        { name: 'Smoked Salmon & Avocado Toast', tier: 'premium', prepMinutes: 10, prepTime: '10 mins', calories: Math.round(calories * 0.26), protein: Math.round(protein * 0.24), carbs: 35, fat: 16, ingredients: [{ item: 'Sourdough Bread', qty: 2, unit: 'slices' }, { item: 'Smoked Salmon', qty: 4, unit: 'oz' }, { item: 'Avocado', qty: 0.5, unit: 'whole' }], instructions: ['Toast bread', 'Top with avocado and salmon'] },
      ],
      Lunch: [
        { name: 'Ground Turkey & Brown Rice Skillet', tier: 'budget', prepMinutes: 15, prepTime: '15 mins', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 65, fat: 12, ingredients: [{ item: 'Ground Turkey 85/15', qty: 6, unit: 'oz' }, { item: 'Brown Rice', qty: 1, unit: 'cup' }, { item: 'Frozen Mixed Veggies', qty: 1, unit: 'cup' }], instructions: ['Brown turkey', 'Mix with rice and veggies'] },
        { name: 'Canned Tuna & Chickpea Salad Bowl', tier: 'budget', prepMinutes: 10, prepTime: '10 mins', calories: Math.round(calories * 0.33), protein: Math.round(protein * 0.36), carbs: 50, fat: 8, ingredients: [{ item: 'Canned Tuna in Water', qty: 2, unit: 'cans' }, { item: 'Chickpeas', qty: 0.5, unit: 'can' }, { item: 'Olive Oil', qty: 1, unit: 'tbsp' }], instructions: ['Mix tuna and chickpeas with olive oil dressing'] },
        { name: 'Lean Beef & Jasmine Rice Bowl', tier: 'moderate', prepMinutes: 20, prepTime: '20 mins', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 70, fat: 18, ingredients: [{ item: '93/7 Ground Beef', qty: 6, unit: 'oz' }, { item: 'Jasmine Rice', qty: 1, unit: 'cup' }, { item: 'Zucchini', qty: 1, unit: 'whole' }], instructions: ['Brown beef', 'Serve over rice'] },
        { name: 'Mediterranean Chicken & Quinoa Plate', tier: 'moderate', prepMinutes: 25, prepTime: '25 mins', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.38), carbs: 60, fat: 15, ingredients: [{ item: 'Chicken Breast', qty: 6, unit: 'oz' }, { item: 'Quinoa', qty: 1, unit: 'cup' }, { item: 'Cucumber', qty: 1, unit: 'whole' }, { item: 'Tzatziki Sauce', qty: 2, unit: 'tbsp' }], instructions: ['Grill chicken', 'Serve over quinoa'] },
        { name: 'Chipotle Flank Steak & Black Bean Bowl', tier: 'premium', prepMinutes: 20, prepTime: '20 mins', calories: Math.round(calories * 0.36), protein: Math.round(protein * 0.36), carbs: 55, fat: 16, ingredients: [{ item: 'Grass-Fed Flank Steak', qty: 6, unit: 'oz' }, { item: 'Black Beans', qty: 0.5, unit: 'can' }, { item: 'Organic Jasmine Rice', qty: 1, unit: 'cup' }], instructions: ['Sear steak', 'Assemble bowl'] },
        { name: 'Sesame Ahi Tuna & Organic Jasmine Rice', tier: 'premium', prepMinutes: 15, prepTime: '15 mins', calories: Math.round(calories * 0.34), protein: Math.round(protein * 0.35), carbs: 58, fat: 10, ingredients: [{ item: 'Wild-Caught Ahi Tuna Steak', qty: 6, unit: 'oz' }, { item: 'Organic Jasmine Rice', qty: 1, unit: 'cup' }], instructions: ['Sear tuna 1 min per side'] },
      ],
      Dinner: [
        { name: 'Baked Chicken Thighs & Sweet Potato', tier: 'budget', prepMinutes: 30, prepTime: '30 mins', calories: Math.round(calories * 0.33), protein: Math.round(protein * 0.32), carbs: 50, fat: 16, ingredients: [{ item: 'Chicken Thighs (Bone-in)', qty: 7, unit: 'oz' }, { item: 'Sweet Potato', qty: 1, unit: 'medium' }, { item: 'Green Beans', qty: 1, unit: 'cup' }], instructions: ['Bake chicken and sweet potato at 400°F'] },
        { name: 'Sautéed Beef Liver / Ground Turkey Pasta', tier: 'budget', prepMinutes: 20, prepTime: '20 mins', calories: Math.round(calories * 0.34), protein: Math.round(protein * 0.34), carbs: 60, fat: 12, ingredients: [{ item: 'Ground Turkey', qty: 6, unit: 'oz' }, { item: 'Whole Wheat Pasta', qty: 2, unit: 'oz' }, { item: 'Marinara Sauce', qty: 0.5, unit: 'cup' }], instructions: ['Boil pasta', 'Brown turkey and toss with sauce'] },
        { name: 'Grilled Salmon & Roasted Asparagus', tier: 'moderate', prepMinutes: 25, prepTime: '25 mins', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.3), carbs: 55, fat: 20, ingredients: [{ item: 'Atlantic Salmon Fillet', qty: 7, unit: 'oz' }, { item: 'Asparagus', qty: 1, unit: 'bunch' }, { item: 'Olive Oil', qty: 1, unit: 'tbsp' }], instructions: ['Pan sear salmon', 'Roast asparagus'] },
        { name: 'Baked Cod & Wild Rice', tier: 'moderate', prepMinutes: 20, prepTime: '20 mins', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.32), carbs: 55, fat: 10, ingredients: [{ item: 'Cod Fillet', qty: 8, unit: 'oz' }, { item: 'Wild Rice', qty: 1, unit: 'cup' }, { item: 'Broccoli', qty: 1, unit: 'head' }], instructions: ['Bake cod at 400°F', 'Serve with wild rice'] },
        { name: 'Grass-Fed Ribeye & Organic Sweet Potato Mash', tier: 'premium', prepMinutes: 25, prepTime: '25 mins', calories: Math.round(calories * 0.36), protein: Math.round(protein * 0.38), carbs: 45, fat: 22, ingredients: [{ item: 'Grass-Fed Ribeye Steak', qty: 7, unit: 'oz' }, { item: 'Organic Sweet Potato', qty: 1, unit: 'medium' }, { item: 'Fresh Organic Asparagus', qty: 1, unit: 'bunch' }], instructions: ['Cast-iron sear ribeye'] },
      ],
      Snacks: [
        { name: 'Whey Protein Shake & Rice Cakes', tier: 'budget', prepMinutes: 5, prepTime: '5 mins', calories: Math.round(calories * 0.12), protein: Math.round(protein * 0.15), carbs: 25, fat: 3, ingredients: [{ item: 'Whey Protein', qty: 1, unit: 'scoop' }, { item: 'Rice Cakes', qty: 2, unit: 'cakes' }], instructions: ['Mix shake'] },
        { name: 'Cottage Cheese & Pineapple', tier: 'moderate', prepMinutes: 3, prepTime: '3 mins', calories: Math.round(calories * 0.12), protein: Math.round(protein * 0.14), carbs: 20, fat: 2, ingredients: [{ item: 'Cottage Cheese', qty: 1, unit: 'cup' }, { item: 'Pineapple Chunks', qty: 0.5, unit: 'cup' }], instructions: ['Combine and serve'] },
      ]
    };

    // Filter pools based on Prep Minutes AND Budget Tier
    const filterPool = (pool: any[]) => {
      return pool.filter((meal) => {
        const timeOk = meal.prepMinutes <= maxPrepMinutes;
        
        let budgetOk = true;
        if (budgetLevel === 'budget') {
          budgetOk = meal.tier === 'budget';
        } else if (budgetLevel === 'moderate') {
          budgetOk = meal.tier === 'budget' || meal.tier === 'moderate';
        } else if (budgetLevel === 'premium') {
          budgetOk = true; // Premium tier accepts all standard & high-tier options
        }

        return timeOk && budgetOk;
      });
    };

    const sessionUsedRecipeNames = new Set<string>();
    const slotCounters: { [slotType: string]: number } = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };
    const rawGroceryMap: { [ingredientName: string]: { qty: number; unit: string } } = {};

    const weeklyCalendar = daysToRender.map((day) => {
      const requestedSlots: string[] = weeklySchedule[day] || [];
      return {
        day,
        meals: requestedSlots.map((slot) => {
          const slotType = slot === 'Snack' ? 'Snacks' : slot;
          const masterPool = masterMealPools[slotType] || masterMealPools['Lunch'];
          
          let filteredPool = filterPool(masterPool);
          // Fallback to master pool if prep filters are overly restrictive
          if (filteredPool.length === 0) filteredPool = masterPool;

          let eligiblePool = filteredPool.filter((item) => !recipeHistory.includes(item.name));
          if (eligiblePool.length === 0) eligiblePool = filteredPool;

          let mealChoice: any;

          switch (varietyLevel) {
            case 5: {
              mealChoice = eligiblePool.find((item) => !sessionUsedRecipeNames.has(item.name));
              if (!mealChoice) mealChoice = filteredPool.find((item) => !sessionUsedRecipeNames.has(item.name)) || filteredPool[0];
              sessionUsedRecipeNames.add(mealChoice.name);
              break;
            }
            case 4: {
              mealChoice = eligiblePool.find((item) => !sessionUsedRecipeNames.has(item.name)) || eligiblePool[0];
              sessionUsedRecipeNames.add(mealChoice.name);
              break;
            }
            case 3: {
              const step = slotCounters[slotType] % Math.min(3, eligiblePool.length);
              mealChoice = eligiblePool[step] || filteredPool[0];
              slotCounters[slotType]++;
              break;
            }
            case 2: {
              const step = slotCounters[slotType] % Math.min(2, eligiblePool.length);
              mealChoice = eligiblePool[step] || filteredPool[0];
              slotCounters[slotType]++;
              break;
            }
            case 1:
            default: {
              mealChoice = eligiblePool[0] || filteredPool[0];
              break;
            }
          }

          // Aggregate grocery ingredients dynamically
          if (Array.isArray(mealChoice.ingredients)) {
            mealChoice.ingredients.forEach((ing: any) => {
              if (typeof ing === 'object' && ing.item) {
                const key = ing.item;
                const totalQty = (ing.qty || 1) * householdSize;
                if (!rawGroceryMap[key]) {
                  rawGroceryMap[key] = { qty: totalQty, unit: ing.unit || '' };
                } else {
                  rawGroceryMap[key].qty += totalQty;
                }
              }
            });
          }

          // Format ingredients array into clean strings
          const formattedIngredients = Array.isArray(mealChoice.ingredients)
            ? mealChoice.ingredients.map((ing: any) => 
                typeof ing === 'string' ? ing : `${ing.qty * householdSize} ${ing.unit} ${ing.item}`.trim()
              )
            : [];

          return { ...mealChoice, type: slot, ingredients: formattedIngredients };
        }),
      };
    });

    // Categorize compiled grocery items
    const categorizedGroceries: { category: string; item: string; amount: string }[] = [];

    const categorizeItem = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.includes('beef') || lower.includes('steak') || lower.includes('chicken') || lower.includes('turkey') || lower.includes('salmon') || lower.includes('cod') || lower.includes('tuna') || lower.includes('sausage') || lower.includes('egg') || lower.includes('yogurt') || lower.includes('whey') || lower.includes('cottage cheese')) {
        return 'Proteins';
      }
      if (lower.includes('spinach') || lower.includes('zucchini') || lower.includes('asparagus') || lower.includes('pepper') || lower.includes('cucumber') || lower.includes('broccoli') || lower.includes('tomato') || lower.includes('avocado') || lower.includes('blueberry') || lower.includes('pineapple') || lower.includes('beans')) {
        return 'Produce';
      }
      if (lower.includes('rice') || lower.includes('oats') || lower.includes('quinoa') || lower.includes('potato') || lower.includes('pasta') || lower.includes('bread') || lower.includes('cake')) {
        return 'Grains & Carbs';
      }
      return 'Pantry / Condiments';
    };

    Object.entries(rawGroceryMap).forEach(([itemName, data]) => {
      categorizedGroceries.push({
        category: categorizeItem(itemName),
        item: itemName,
        amount: `${data.qty % 1 === 0 ? data.qty : data.qty.toFixed(1)} ${data.unit}`.trim(),
      });
    });

    // Adjust cost estimates dynamically by budget tier
    let costMultiplier = 1.0;
    if (budgetLevel === 'budget') costMultiplier = 0.75;
    if (budgetLevel === 'premium') costMultiplier = 1.45;

    const baseMin = Math.round(75 * householdSize * costMultiplier);
    const baseMax = Math.round(115 * householdSize * costMultiplier);

    return NextResponse.json({
      weeklyCalendar,
      groceries: categorizedGroceries,
      estimatedGroceryCost: `$${baseMin} – $${baseMax} USD`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}