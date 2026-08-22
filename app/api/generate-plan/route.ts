import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is missing in Vercel environment variables.' },
        { status: 403 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const body = await req.json();
    const {
      name,
      targetCalories,
      targetProteinGrams,
      exclusions,
      householdSize,
      budgetLevel,
      weeklySchedule,
      varietyLevel,
      enableBulkPrep,
      maxPrepTime,
      recipeHistory,
      isSwapRequest,
    } = body;

    const prompt = `
      You are an expert sports nutritionist and head chef for Neural Drive Performance.
      Generate a customized, professional, macro-accurate weekly meal plan and consolidated grocery list.

      CLIENT & PERFORMANCE PARAMETERS:
      - Client Name: ${name || 'Valued Client'}
      - Daily Target Calories: ${targetCalories || 'Balanced'} kcal
      - Daily Target Protein: ${targetProteinGrams || 'Optimized'} grams
      - Household Size / Servings Multiplier: ${householdSize || 1} person(s)
      - Budget Level: ${budgetLevel || 'moderate'}
      - Maximum Prep & Cook Time per Meal: ${maxPrepTime || 'no-limit'}
      - Dietary Exclusions / Allergies: ${exclusions?.length ? exclusions.join(', ') : 'None'}
      - Weekly Schedule Matrix: ${JSON.stringify(weeklySchedule || {})}
      - Variety Score (1=High Repetition/Prep Friendly, 5=Maximum Variety): ${varietyLevel || 3}
      - Bulk Batch Prep Enabled: ${enableBulkPrep ? 'Yes' : 'No'}
      - Single Meal Swap Request: ${isSwapRequest ? 'Yes' : 'No'}
      - Recipe History (DO NOT REPEAT RECENT MEALS): ${JSON.stringify(recipeHistory || [])}

      TRIPLE-TOGGLE CALENDAR MATRIX RULES (CRITICAL):
      The input 'weeklySchedule' maps days (MON-SUN) to meal slots (Breakfast, Lunch, Dinner, Snacks) with one of three states:
      1. "generate": Create a full, fresh sports-nutrition recipe. The combined calories and protein across all scheduled slots for that day MUST hit the daily target.
      2. "self": Return a placeholder meal item with:
         - "name": "Self-Provided Meal / Dining Out"
         - "prepTime": "0 mins"
         - "ingredients": ["Client choice / Dining out / Personal meal prep"]
         - "instructions": ["Maintain target macros for this slot."]
         - Assign realistic estimated calories, protein, carbs, and fat fitting that meal slot towards the daily macros.
      3. "off": Omit this slot entirely from the generated calendar. Do not create a meal for this slot.

      ADDITIONAL NUTRITIONAL & CHEF DIRECTIVES:
      - Household Scaling: Scale grocery quantities to feed ${householdSize || 1} person(s), but keep meal macro calculations formatted per single serving.
      - Prep Time Limit: Strict adherence to '${maxPrepTime || 'no-limit'}'. If a time limit is set (e.g. '15-mins', '30-mins'), all generated recipes MUST be executable within that duration.
      - Recipe Uniqueness: Avoid recipes listed in the provided 'recipeHistory'.
      - Grocery Consolidation: Combine matching ingredients across days into a clean, categorized shopping list (e.g., Proteins, Produce, Pantry Staples) with accurate total units for ${householdSize || 1} person(s).

      Return your output strictly as valid JSON matching this exact structure:
      {
        "estimatedGroceryCost": "$XX – $YY USD",
        "groceries": [
          { "category": "Proteins", "item": "Chicken Breast", "amount": "3.5 lbs" }
        ],
        "weeklyCalendar": [
          {
            "day": "MON",
            "meals": [
              {
                "type": "Lunch",
                "name": "Grilled Lemon Herb Chicken & Jasmine Rice",
                "calories": 650,
                "protein": 50,
                "carbs": 65,
                "fat": 18,
                "prepTime": "20 mins",
                "ingredients": [
                  "200g boneless skinless chicken breast",
                  "1 cup cooked jasmine rice",
                  "1 tbsp olive oil",
                  "1 tbsp fresh lemon juice",
                  "1 tsp garlic powder"
                ],
                "instructions": [
                  "Whisk olive oil, lemon juice, and garlic powder together to make a marinade.",
                  "Coat chicken breast in marinade and let rest for 5 minutes.",
                  "Heat a skillet over medium-high heat and cook chicken for 6-8 minutes per side until internal temp reaches 165°F.",
                  "Serve hot over warm jasmine rice."
                ]
              }
            ]
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error generating meal plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate meal plan' },
      { status: 500 }
    );
  }
}