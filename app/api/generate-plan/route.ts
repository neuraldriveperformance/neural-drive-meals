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
    const enableBulkPrep = body.enableBulkPrep ?? true;
    const weeklySchedule = body.weeklySchedule || {};

    // 1. RANDOM SEED & CUISINE ROTATION FOR HIGH VARIETY
    const timestampSeed = Date.now().toString(36);
    const randomSeed = Math.floor(Math.random() * 100000);

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

    let varietyInstruction = '';
    if (varietyLevel >= 4) {
      varietyInstruction = `HIGH VARIETY MODE (Level ${varietyLevel}/5): Maximum recipe diversity. Draw inspiration from these cuisines: ${selectedCuisines}. DO NOT repeat any main protein/carb pairing across different days. Every single day should offer a fresh culinary flavor profile.`;
    } else if (varietyLevel === 3) {
      varietyInstruction = `BALANCED VARIETY MODE (Level 3/5): Moderate rotation across the week. Pull inspiration from: ${selectedCuisines}. Avoid repeating identical meals on consecutive days unless bulk batch prep requires it.`;
    } else {
      varietyInstruction = `LOW VARIETY / CONSISTENCY MODE (Level ${varietyLevel}/5): Prioritize familiar, simple staple meals with consistent ingredient reuse to keep prep minimal.`;
    }

    const prepInstruction = enableBulkPrep
      ? `BULK BATCH PREP IS ENABLED: Cook larger batches of 2-3 primary meals and repeat them logically across the scheduled days.`
      : `BULK PREP IS DISABLED: Prepare fresh, unique meals for each scheduled slot unless variety preference demands otherwise.`;

    const systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate a structured JSON meal plan strictly adhering to the requirements below.

DYNAMIC VARIETY ENGINE SEED: [${timestampSeed}-${randomSeed}]

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
- Variety Directives: ${varietyInstruction}
- Bulk Prep Directives: ${prepInstruction}

Schedule Matrix requested:
${JSON.stringify(weeklySchedule)}`;

    // TRY OPENAI API FIRST
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
            temperature: 0.8, // Raised for creative variety
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

    // DYNAMIC LOCAL FALLBACK GENERATOR WITH VARIETY
    const daysToRender = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const mealOptions: { [type: string]: any[] } = {
      Breakfast: [
        {
          name: 'Anabolic Oats & Blueberries',
          calories: Math.round(calories * 0.28),
          protein: Math.round(protein * 0.3),
          carbs: 65,
          fat: 12,
          prepTime: '10 mins',
          ingredients: [
            '1 cup rolled oats (80g)',
            '1 scoop whey protein isolate (30g)',
            '1/2 cup fresh blueberries (75g)',
            '1 tbsp almond butter (16g)',
            '1 cup unsweetened almond milk (240ml)',
          ],
          instructions: [
            'Combine oats and almond milk in a bowl and microwave for 2 minutes.',
            'Stir in whey protein isolate until smooth.',
            'Top with almond butter and fresh blueberries.',
          ],
        },
        {
          name: 'Southwest Egg White & Avocado Wrap',
          calories: Math.round(calories * 0.28),
          protein: Math.round(protein * 0.32),
          carbs: 45,
          fat: 14,
          prepTime: '12 mins',
          ingredients: [
            '1 cup egg whites (240g)',
            '1 whole high-fiber wrap',
            '1/4 avocado (30g)',
            '2 tbsp salsa',
            '1/4 cup shredded low-fat cheddar',
          ],
          instructions: [
            'Scramble egg whites in a non-stick pan.',
            'Warm wrap, then layer eggs, sliced avocado, cheese, and salsa.',
            'Roll into a burrito and sear seam-side down for 1 minute.',
          ],
        },
      ],
      Lunch: [
        {
          name: 'Lean Beef & Jasmine Rice Bowl',
          calories: Math.round(calories * 0.35),
          protein: Math.round(protein * 0.35),
          carbs: 70,
          fat: 18,
          prepTime: '20 mins',
          ingredients: [
            '1.5 cups cooked jasmine rice (240g)',
            '1 cup extra lean ground beef 93/7 (170g)',
            '1 medium zucchini (200g)',
            '1 tbsp olive oil (14g)',
            '2 tbsp low-sodium soy sauce (30ml)',
          ],
          instructions: [
            'Brown ground beef in a skillet with olive oil over medium-high heat.',
            'Dice zucchini and add to skillet until tender.',
            'Serve over steamed jasmine rice with soy sauce.',
          ],
        },
        {
          name: 'Mediterranean Chicken & Quinoa Plate',
          calories: Math.round(calories * 0.35),
          protein: Math.round(protein * 0.38),
          carbs: 60,
          fat: 15,
          prepTime: '25 mins',
          ingredients: [
            '6 oz grilled chicken breast',
            '1 cup cooked quinoa',
            '1/2 cup diced cucumber and cherry tomatoes',
            '2 tbsp tzatziki sauce',
            '1 tbsp crumbled feta cheese',
          ],
          instructions: [
            'Season and grill chicken breast until internal temperature hits 165°F.',
            'Plate cooked quinoa with cucumber and tomatoes.',
            'Slice chicken, place over quinoa, and top with tzatziki and feta.',
          ],
        },
      ],
      Dinner: [
        {
          name: 'Grilled Salmon & Roasted Sweet Potato',
          calories: Math.round(calories * 0.32),
          protein: Math.round(protein * 0.3),
          carbs: 55,
          fat: 20,
          prepTime: '25 mins',
          ingredients: [
            '1 fillet Atlantic salmon (200g)',
            '1 medium sweet potato (220g)',
            '2 cups fresh broccoli florets (150g)',
            '1 tbsp extra virgin olive oil (14g)',
            '1/2 medium lemon (30g)',
          ],
          instructions: [
            'Cube sweet potato and toss with olive oil; bake at 400°F (200°C) for 25 mins.',
            'Season salmon fillet and pan-sear for 4-5 minutes per side.',
            'Steam broccoli florets and serve together with lemon.',
          ],
        },
        {
          name: 'Flank Steak Fajita Skillet',
          calories: Math.round(calories * 0.33),
          protein: Math.round(protein * 0.35),
          carbs: 50,
          fat: 18,
          prepTime: '20 mins',
          ingredients: [
            '6 oz grilled flank steak',
            '1 red bell pepper & 1/2 yellow onion, sliced',
            '1 cup cooked brown rice',
            '1 tbsp avocado oil',
            'Fajita seasoning blend',
          ],
          instructions: [
            'Sauté sliced peppers and onions in avocado oil until caramelized.',
            'Sear seasoned flank steak over high heat; slice against the grain.',
            'Serve sliced steak and peppers over warm brown rice.',
          ],
        },
      ],
      Snacks: [
        {
          name: 'Greek Yogurt & Almond Fuel',
          calories: Math.round(calories * 0.12),
          protein: Math.round(protein * 0.15),
          carbs: 15,
          fat: 8,
          prepTime: '5 mins',
          ingredients: [
            '3/4 cup non-fat Greek yogurt (170g)',
            '1/4 cup raw almonds (35g)',
            '1 tbsp raw honey (21g)',
          ],
          instructions: [
            'Spoon Greek yogurt into a bowl.',
            'Top with raw almonds and drizzle with honey.',
          ],
        },
      ],
    };

    const getRandomMeal = (type: string, dayIndex: number) => {
      const options = mealOptions[type] || mealOptions['Snacks'];
      // Rotate meal options based on day index for variety in local mode
      const selectedMeal = options[dayIndex % options.length];
      return { type, ...selectedMeal };
    };

    const weeklyCalendar = daysToRender.map((day, idx) => {
      const requestedSlots: string[] = weeklySchedule[day] || [];
      const sortedSlots = requestedSlots.sort((a, b) => (MEAL_ORDER[a] || 99) - (MEAL_ORDER[b] || 99));

      return {
        day,
        meals: sortedSlots.map((slot: string) => getRandomMeal(slot, idx)),
      };
    });

    const scaledMultiplier = householdSize;
    const groceries = [
      { category: 'Proteins', item: 'Extra Lean Ground Beef 93/7 & Chicken Breast', amount: `${(1.2 * scaledMultiplier).toFixed(1)} kg` },
      { category: 'Proteins', item: 'Atlantic Salmon Fillets & Flank Steak', amount: `${(1.1 * scaledMultiplier).toFixed(1)} kg` },
      { category: 'Proteins', item: 'Whey Protein Isolate & Egg Whites', amount: `${1 * scaledMultiplier} tub / 1 carton` },
      { category: 'Produce', item: 'Bell Peppers, Zucchini & Cucumbers', amount: `${4 * scaledMultiplier} units` },
      { category: 'Produce', item: 'Sweet Potatoes & Broccoli', amount: `${5 * scaledMultiplier} units` },
      { category: 'Produce', item: 'Fresh Blueberries & Avocados', amount: `${400 * scaledMultiplier}g / 2 units` },
      { category: 'Grains & Pantry', item: 'Jasmine Rice & Quinoa', amount: `${1 * scaledMultiplier} kg` },
      { category: 'Grains & Pantry', item: 'Rolled Oats & Whole Wraps', amount: `${750 * scaledMultiplier}g` },
      { category: 'Grains & Pantry', item: 'Non-Fat Greek Yogurt & Feta', amount: `${1.2 * scaledMultiplier} kg` },
    ];

    const baseMin = Math.round(75 * householdSize);
    const baseMax = Math.round(115 * householdSize);

    return NextResponse.json({
      weeklyCalendar,
      groceries,
      estimatedGroceryCost: `$${baseMin} – $${baseMax} USD`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}