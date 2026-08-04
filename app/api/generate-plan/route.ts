import { NextResponse } from 'next/server';

const MEAL_ORDER: { [key: string]: number } = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snacks: 4,
  Snack: 4,
};

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

    // 1. DYNAMIC HIGH-ENTROPY RANDOM SEED
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

    // 2. EXPLICIT VARIETY LEVEL RULES FOR THE PROMPT
    let varietyInstruction = '';
    if (varietyLevel === 5) {
      varietyInstruction = `VARIETY LEVEL 5/5 (MAXIMUM DIVERSITY): ABSOLUTELY ZERO REPEATED MEALS. Every single day MUST feature completely distinct recipes, different main protein sources, and varied culinary styles (${selectedCuisines}). Do not repeat lunch or dinner across the week under any circumstances.`;
    } else if (varietyLevel === 4) {
      varietyInstruction = `VARIETY LEVEL 4/5 (HIGH VARIETY): High recipe rotation (${selectedCuisines}). Maximum 1 repeat meal allowed across the entire week. Nearly every day must feature a fresh meal setup.`;
    } else if (varietyLevel === 3) {
      varietyInstruction = `VARIETY LEVEL 3/5 (BALANCED VARIETY): Moderate meal rotation across the week. Re-use 2-3 favorite batch meals throughout the week, but alternate them so consecutive days do not feel identical.`;
    } else if (varietyLevel === 2) {
      varietyInstruction = `VARIETY LEVEL 2/5 (LOW VARIETY): Heavy meal repetition. Cook 2 core batch-prep recipes and alternate them repeatedly across the week.`;
    } else {
      varietyInstruction = `VARIETY LEVEL 1/5 (MINIMUM VARIETY / MONOTONOUS): EAT THE EXACT SAME MEALS EVERY DAY. Generate 1 standard Lunch recipe and 1 standard Dinner recipe, and repeat those identical meals across every single scheduled day in the calendar.`;
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

CLIENT PROFILE:
- Name: ${clientName}
- Daily Target: ${calories} kcal, ${protein}g Protein
- Household Multiplier: ${householdSize} person(s)
- Dietary Exclusions/Allergies: ${exclusions}
- Budget Tier: ${budgetLevel}
- Max Prep Time per Meal: ${maxPrepTime}
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

    // EXPANDED LOCAL DYNAMIC FALLBACK GENERATOR WITH HISTORY & VARIETY MATH
    const daysToRender = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    const mealPools: { [key: string]: any[] } = {
      Breakfast: [
        { name: 'Egg White & Spinach Omelet w/ Oats', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.25), carbs: 45, fat: 10, prepTime: '15 mins', ingredients: ['6 egg whites', '1 cup spinach', '1/2 cup rolled oats'], instructions: ['Cook omelet', 'Serve with oats'] },
        { name: 'Greek Yogurt & Berry Protein Bowl', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.28), carbs: 40, fat: 6, prepTime: '5 mins', ingredients: ['1.5 cups Greek yogurt', '1 scoop whey', 'blueberries'], instructions: ['Mix yogurt & whey', 'Top with berries'] },
        { name: 'Smoked Salmon & Avocado Toast', calories: Math.round(calories * 0.26), protein: Math.round(protein * 0.24), carbs: 35, fat: 16, prepTime: '10 mins', ingredients: ['2 slices sourdough', '4 oz salmon', '1/2 avocado'], instructions: ['Toast bread', 'Top with avocado and salmon'] },
        { name: 'Protein Pancakes w/ Syrup', calories: Math.round(calories * 0.28), protein: Math.round(protein * 0.25), carbs: 55, fat: 8, prepTime: '15 mins', ingredients: ['1 cup pancake mix', '1 egg'], instructions: ['Cook on griddle'] },
        { name: 'Turkey Sausage & Egg Scramble', calories: Math.round(calories * 0.25), protein: Math.round(protein * 0.26), carbs: 20, fat: 14, prepTime: '12 mins', ingredients: ['3 eggs', '2 sausage patties'], instructions: ['Scramble together'] },
        { name: 'Chia & Whey Overnight Oats', calories: Math.round(calories * 0.24), protein: Math.round(protein * 0.24), carbs: 50, fat: 10, prepTime: '5 mins', ingredients: ['1/2 cup oats', '1 scoop whey'], instructions: ['Chill overnight'] },
        { name: 'Steak & Egg Breakfast Wrap', calories: Math.round(calories * 0.30), protein: Math.round(protein * 0.30), carbs: 35, fat: 18, prepTime: '15 mins', ingredients: ['1 tortilla', '3 oz steak', '2 eggs'], instructions: ['Sear steak', 'Scramble eggs & wrap'] },
      ],
      Lunch: [
        { name: 'Lean Beef & Jasmine Rice Bowl', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 70, fat: 18, prepTime: '20 mins', ingredients: ['1.5 cups jasmine rice', '170g 93/7 ground beef', 'zucchini'], instructions: ['Brown beef', 'Serve over rice'] },
        { name: 'Mediterranean Chicken & Quinoa Plate', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.38), carbs: 60, fat: 15, prepTime: '25 mins', ingredients: ['6 oz chicken breast', '1 cup quinoa', 'cucumber', 'tzatziki'], instructions: ['Grill chicken', 'Serve over quinoa'] },
        { name: 'Turkey & Sweet Potato Skillet', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 65, fat: 12, prepTime: '20 mins', ingredients: ['170g ground turkey', '1 sweet potato', 'bell peppers'], instructions: ['Sauté turkey and cubed potato', 'Season and serve'] },
        { name: 'Chipotle Steak & Black Bean Bowl', calories: Math.round(calories * 0.36), protein: Math.round(protein * 0.36), carbs: 55, fat: 16, prepTime: '20 mins', ingredients: ['6 oz flank steak', '1/2 cup black beans', '1 cup rice'], instructions: ['Sear steak', 'Assemble bowl'] },
        { name: 'Sesame Ahi Tuna & Jasmine Rice', calories: Math.round(calories * 0.34), protein: Math.round(protein * 0.35), carbs: 58, fat: 10, prepTime: '15 mins', ingredients: ['6 oz Ahi tuna', '1 cup jasmine rice'], instructions: ['Sear tuna 1 min per side'] },
        { name: 'Grilled Bison Burger & Baked Fries', calories: Math.round(calories * 0.37), protein: Math.round(protein * 0.37), carbs: 50, fat: 18, prepTime: '25 mins', ingredients: ['6 oz bison patty', 'potato wedges'], instructions: ['Grill burger', 'Bake fries'] },
        { name: 'Thai Peanut Chicken Wrap', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.36), carbs: 45, fat: 16, prepTime: '15 mins', ingredients: ['6 oz shredded chicken', 'tortilla', 'peanut sauce'], instructions: ['Wrap and serve'] },
      ],
      Dinner: [
        { name: 'Grilled Salmon & Roasted Asparagus', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.3), carbs: 55, fat: 20, prepTime: '25 mins', ingredients: ['200g salmon fillet', 'asparagus', '1 tbsp olive oil'], instructions: ['Pan sear salmon', 'Roast asparagus'] },
        { name: 'Flank Steak Fajita Bowl', calories: Math.round(calories * 0.33), protein: Math.round(protein * 0.35), carbs: 50, fat: 18, prepTime: '20 mins', ingredients: ['6 oz flank steak', 'bell peppers', '1 cup brown rice'], instructions: ['Sear steak', 'Sauté peppers and onions'] },
        { name: 'Baked Cod & Wild Rice', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.32), carbs: 55, fat: 10, prepTime: '20 mins', ingredients: ['220g cod fillet', '1 cup wild rice', 'steamed broccoli'], instructions: ['Bake cod at 400°F', 'Serve with wild rice'] },
        { name: 'Ribeye Steak & Sweet Potato Mash', calories: Math.round(calories * 0.36), protein: Math.round(protein * 0.38), carbs: 45, fat: 22, prepTime: '25 mins', ingredients: ['7 oz ribeye', '1 sweet potato'], instructions: ['Cast-iron sear ribeye'] },
        { name: 'Pesto Chicken Pasta w/ Tomatoes', calories: Math.round(calories * 0.34), protein: Math.round(protein * 0.35), carbs: 60, fat: 14, prepTime: '20 mins', ingredients: ['6 oz chicken breast', '2 oz chickpea pasta', 'pesto'], instructions: ['Boil pasta', 'Toss with pesto'] },
        { name: 'Honey Mustard Glazed Pork Tenderloin', calories: Math.round(calories * 0.33), protein: Math.round(protein * 0.34), carbs: 48, fat: 12, prepTime: '30 mins', ingredients: ['6 oz pork tenderloin', '1 cup quinoa'], instructions: ['Roast tenderloin with glaze'] },
        { name: 'Teriyaki Tofu & Stir-Fry Noodles', calories: Math.round(calories * 0.31), protein: Math.round(protein * 0.28), carbs: 65, fat: 11, prepTime: '20 mins', ingredients: ['8 oz firm tofu', 'soba noodles'], instructions: ['Pan-fry tofu', 'Toss noodles'] },
      ],
      Snacks: [
        { name: 'Whey Protein Shake & Rice Cakes', calories: Math.round(calories * 0.12), protein: Math.round(protein * 0.15), carbs: 25, fat: 3, prepTime: '5 mins', ingredients: ['1 scoop whey', '2 rice cakes'], instructions: ['Mix shake'] },
        { name: 'Cottage Cheese & Pineapple', calories: Math.round(calories * 0.12), protein: Math.round(protein * 0.14), carbs: 20, fat: 2, prepTime: '3 mins', ingredients: ['1 cup cottage cheese', 'pineapple'], instructions: ['Combine and serve'] },
        { name: 'Beef Jerky & Mixed Nuts', calories: Math.round(calories * 0.13), protein: Math.round(protein * 0.15), carbs: 10, fat: 12, prepTime: '2 mins', ingredients: ['2 oz jerky', '1 oz almonds'], instructions: ['Portion into container'] },
      ]
    };

    const sessionUsedRecipeNames = new Set<string>();
    const slotCounters: { [slotType: string]: number } = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };

    const weeklyCalendar = daysToRender.map((day) => {
      const requestedSlots: string[] = weeklySchedule[day] || [];
      return {
        day,
        meals: requestedSlots.map((slot) => {
          const slotType = slot === 'Snack' ? 'Snacks' : slot;
          const fullPool = mealPools[slotType] || mealPools['Lunch'];

          // Filter out recent historical recipes
          let eligiblePool = fullPool.filter((item) => !recipeHistory.includes(item.name));
          if (eligiblePool.length === 0) eligiblePool = fullPool;

          let mealChoice: any;

          switch (varietyLevel) {
            case 5: {
              mealChoice = eligiblePool.find((item) => !sessionUsedRecipeNames.has(item.name));
              if (!mealChoice) mealChoice = fullPool.find((item) => !sessionUsedRecipeNames.has(item.name)) || fullPool[0];
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
              mealChoice = eligiblePool[step] || fullPool[0];
              slotCounters[slotType]++;
              break;
            }
            case 2: {
              const step = slotCounters[slotType] % Math.min(2, eligiblePool.length);
              mealChoice = eligiblePool[step] || fullPool[0];
              slotCounters[slotType]++;
              break;
            }
            case 1:
            default: {
              mealChoice = eligiblePool[0] || fullPool[0];
              break;
            }
          }

          return { type: slot, ...mealChoice };
        }),
      };
    });

    const scaledMultiplier = householdSize;
    const baseMin = Math.round(75 * householdSize);
    const baseMax = Math.round(115 * householdSize);

    return NextResponse.json({
      weeklyCalendar,
      groceries: [
        { category: 'Proteins', item: 'Assorted Meats & Seafood', amount: `${(2.5 * scaledMultiplier).toFixed(1)} kg` },
        { category: 'Produce', item: 'Fresh Vegetables & Greens', amount: `${(3.0 * scaledMultiplier).toFixed(1)} kg` },
        { category: 'Grains & Carbs', item: 'Rice, Quinoa & Sweet Potatoes', amount: `${(2.0 * scaledMultiplier).toFixed(1)} kg` },
      ],
      estimatedGroceryCost: `$${baseMin} – $${baseMax} USD`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}