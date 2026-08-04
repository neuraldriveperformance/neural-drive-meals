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

    const systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate a dynamic, structured JSON meal plan strictly adhering to the requirements below.

DYNAMIC UNIQUE SEED: [${timestampSeed}-${randomSeed}]
CRITICAL INSTRUCTION: Generate a FRESH, CREATIVE meal plan different from any previous generation.

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
            temperature: 0.95, // High creativity & variety
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

    // LOCAL DYNAMIC FALLBACK GENERATOR
    const daysToRender = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const sampleMeals: { [key: string]: any[] } = {
      Lunch: [
        { name: 'Lean Beef & Jasmine Rice Bowl', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 70, fat: 18, prepTime: '20 mins', ingredients: ['1.5 cups jasmine rice', '170g 93/7 ground beef', 'zucchini'], instructions: ['Brown beef', 'Serve over rice'] },
        { name: 'Mediterranean Chicken & Quinoa Plate', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.38), carbs: 60, fat: 15, prepTime: '25 mins', ingredients: ['6 oz chicken breast', '1 cup quinoa', 'cucumber', 'tzatziki'], instructions: ['Grill chicken', 'Serve over quinoa'] },
        { name: 'Turkey & Sweet Potato Skillet', calories: Math.round(calories * 0.35), protein: Math.round(protein * 0.35), carbs: 65, fat: 12, prepTime: '20 mins', ingredients: ['170g ground turkey', '1 sweet potato', 'bell peppers'], instructions: ['Sauté turkey and cubed potato', 'Season and serve'] },
      ],
      Dinner: [
        { name: 'Grilled Salmon & Roasted Asparagus', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.3), carbs: 55, fat: 20, prepTime: '25 mins', ingredients: ['200g salmon fillet', 'asparagus', '1 tbsp olive oil'], instructions: ['Pan sear salmon', 'Roast asparagus'] },
        { name: 'Flank Steak Fajita Bowl', calories: Math.round(calories * 0.33), protein: Math.round(protein * 0.35), carbs: 50, fat: 18, prepTime: '20 mins', ingredients: ['6 oz flank steak', 'bell peppers', '1 cup brown rice'], instructions: ['Sear steak', 'Sauté peppers and onions'] },
        { name: 'Baked Cod & Wild Rice', calories: Math.round(calories * 0.32), protein: Math.round(protein * 0.32), carbs: 55, fat: 10, prepTime: '20 mins', ingredients: ['220g cod fillet', '1 cup wild rice', 'steamed broccoli'], instructions: ['Bake cod at 400°F', 'Serve with wild rice'] },
      ]
    };

    const weeklyCalendar = daysToRender.map((day, idx) => {
      const requestedSlots: string[] = weeklySchedule[day] || [];
      return {
        day,
        meals: requestedSlots.map((slot) => {
          const list = sampleMeals[slot] || sampleMeals['Lunch'];
          const mealChoice = (varietyLevel === 1) ? list[0] : list[(idx + randomSeed) % list.length];
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
        { category: 'Proteins', item: 'Assorted Meats (Beef, Chicken, Fish)', amount: `${(2.0 * scaledMultiplier).toFixed(1)} kg` },
        { category: 'Produce', item: 'Mixed Fresh Vegetables', amount: `${(2.5 * scaledMultiplier).toFixed(1)} kg` },
        { category: 'Grains', item: 'Rice & Grains', amount: `${(1.5 * scaledMultiplier).toFixed(1)} kg` }
      ],
      estimatedGroceryCost: `$${baseMin} – $${baseMax} USD`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}