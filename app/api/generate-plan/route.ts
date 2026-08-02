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
    const varietyLevel = body.varietyLevel || 3;
    const enableBulkPrep = body.enableBulkPrep ?? true;
    const weeklySchedule = body.weeklySchedule || {};

    const systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate a structured JSON meal plan strictly adhering to the requirements below.

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
- Variety Level: ${varietyLevel}/5
- Bulk Prep Enabled: ${enableBulkPrep}

Schedule Matrix requested:
${JSON.stringify(weeklySchedule)}`;

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
            temperature: 0.7,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const parsedContent = JSON.parse(aiData.choices[0].message.content);
          return NextResponse.json(parsedContent);
        }
      } catch (e) {
        console.warn('OpenAI API call failed, running local fallback:', e);
      }
    }

    // DYNAMIC LOCAL FALLBACK GENERATOR WITH COMPLETE MACROS
    const daysToRender = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const sampleMealsForType = (type: string) => {
      if (type === 'Breakfast') {
        return {
          type: 'Breakfast',
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
        };
      } else if (type === 'Lunch') {
        return {
          type: 'Lunch',
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
        };
      } else if (type === 'Dinner') {
        return {
          type: 'Dinner',
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
        };
      } else {
        return {
          type: 'Snacks',
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
        };
      }
    };

    const weeklyCalendar = daysToRender.map((day) => {
      const requestedSlots: string[] = weeklySchedule[day] || [];
      const sortedSlots = requestedSlots.sort((a, b) => (MEAL_ORDER[a] || 99) - (MEAL_ORDER[b] || 99));

      return {
        day,
        meals: sortedSlots.map((slot: string) => sampleMealsForType(slot)),
      };
    });

    const scaledMultiplier = householdSize;
    const groceries = [
      { category: 'Proteins', item: 'Extra Lean Ground Beef 93/7', amount: `${(0.8 * scaledMultiplier).toFixed(1)} kg` },
      { category: 'Proteins', item: 'Atlantic Salmon Fillets', amount: `${(0.9 * scaledMultiplier).toFixed(1)} kg` },
      { category: 'Proteins', item: 'Whey Protein Isolate', amount: `${1 * scaledMultiplier} tub (900g)` },
      { category: 'Produce', item: 'Zucchini', amount: `${3 * scaledMultiplier} medium` },
      { category: 'Produce', item: 'Sweet Potatoes', amount: `${4 * scaledMultiplier} medium` },
      { category: 'Produce', item: 'Fresh Broccoli', amount: `${600 * scaledMultiplier}g` },
      { category: 'Produce', item: 'Fresh Blueberries', amount: `${400 * scaledMultiplier}g` },
      { category: 'Grains & Pantry', item: 'Jasmine Rice', amount: `${1 * scaledMultiplier} kg` },
      { category: 'Grains & Pantry', item: 'Rolled Oats', amount: `${750 * scaledMultiplier}g` },
      { category: 'Grains & Pantry', item: 'Non-Fat Greek Yogurt', amount: `${1.2 * scaledMultiplier} kg` },
      { category: 'Grains & Pantry', item: 'Almond Butter & Almonds', amount: `${400 * scaledMultiplier}g` },
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