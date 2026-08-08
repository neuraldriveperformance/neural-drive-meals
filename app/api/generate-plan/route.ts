import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK securely using environment variables
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: { code: 403, message: 'API key is missing or not configured in environment variables.', status: 'PERMISSION_DENIED' } },
        { status: 403 }
      );
    }

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
      You are an expert sports nutritionist and elite meal planning architect for Neural Drive Performance.
      Generate a customized, professional weekly meal plan based on the following client profile parameters:
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
      - Is this a single meal swap request: ${isSwapRequest ? 'Yes' : 'No'}
      - Previous Recipe History to Avoid Repeating: ${JSON.stringify(recipeHistory || [])}

      Return your output strictly as a JSON object matching this structure:
      {
        "estimatedGroceryCost": "$XX – $YY USD",
        "groceries": [
          { "category": "Proteins", "item": "Chicken Breast", "amount": "2 lbs" },
          { "category": "Produce", "item": "Spinach", "amount": "1 bag" }
        ],
        "weeklyCalendar": [
          {
            "day": "MON",
            "meals": [
              {
                "type": "Lunch",
                "name": "Recipe Name Here",
                "calories": 600,
                "protein": 45,
                "prepTime": "20 mins",
                "ingredients": ["1 cup rice", "200g chicken"],
                "instructions": "Step-by-step instructions..."
              }
            ]
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('No response received from the Gemini model.');
    }

    const parsedData = JSON.parse(responseText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error in /api/generate-plan:', error);
    return NextResponse.json(
      { error: { code: 500, message: error.message || 'Internal Server Error', status: 'API_ERROR' } },
      { status: 500 }
    );
  }
}