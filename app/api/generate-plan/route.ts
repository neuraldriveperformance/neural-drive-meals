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
      You are an expert sports nutritionist for Neural Drive Performance.
      Generate a customized, professional weekly meal plan based on these parameters:
      - Client Name: ${name || 'Valued Client'}
      - Target Daily Calories: ${targetCalories || 'Balanced'} kcal
      - Target Daily Protein: ${targetProteinGrams || 'Optimized'} grams
      - Household Size: ${householdSize || 1} person(s)
      - Budget Level: ${budgetLevel || 'moderate'}
      - Maximum Prep/Cook Time Per Meal: ${maxPrepTime || 'no-limit'}
      - Dietary Exclusions / Allergies: ${exclusions?.length ? exclusions.join(', ') : 'None'}
      - Weekly Schedule Matrix: ${JSON.stringify(weeklySchedule)}
      - Variety Preference Level (1 to 5): ${varietyLevel || 3}
      - Bulk Batch Prep Enabled: ${enableBulkPrep ? 'Yes' : 'No'}
      - Single Meal Swap Request: ${isSwapRequest ? 'Yes' : 'No'}
      - Recipe History: ${JSON.stringify(recipeHistory || [])}

      CRITICAL: For every meal item, provide detailed ingredients and clear step-by-step cooking instructions as string arrays.

      Return your output strictly as valid JSON matching this exact structure:
      {
        "estimatedGroceryCost": "$XX – $YY USD",
        "groceries": [
          { "category": "Proteins", "item": "Chicken Breast", "amount": "2 lbs" }
        ],
        "weeklyCalendar": [
          {
            "day": "MON",
            "meals": [
              {
                "type": "Lunch",
                "name": "Recipe Name",
                "calories": 600,
                "protein": 45,
                "carbs": 50,
                "fat": 15,
                "prepTime": "20 mins",
                "ingredients": ["1 cup cooked jasmine rice", "200g grilled chicken breast", "1 tbsp olive oil"],
                "instructions": [
                  "Heat olive oil in a skillet over medium-high heat.",
                  "Season chicken breast and cook for 6-8 minutes per side.",
                  "Serve over warm jasmine rice."
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