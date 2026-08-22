import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      familyMembers = [],
      householdSize = 1,
      targetCalories,
      targetProteinGrams,
      exclusions = [],
      budgetLevel = 'moderate',
      weeklySchedule = {},
      varietyLevel = 3,
      enableBulkPrep = false,
      maxPrepTime = 'no-limit',
      recipeHistory = [],
      isSwapRequest = false,
    } = body;

    // 1. Build Family Context Prompt
    const familyDetailsPrompt = familyMembers.length > 0
      ? familyMembers
          .map(
            (m: any, idx: number) =>
              `- Member ${idx + 1} (${m.name || 'Unnamed'}): ${m.calories || 'N/A'} kcal, ${m.protein || 'N/A'}g protein. Specific Exclusions: ${m.exclusions?.join(', ') || 'None'}`
          )
          .join('\n')
      : 'Single user profile';

    // 2. Build Core System & User Prompts for LLM Generation
    const systemPrompt = `You are an elite sports nutritionist and family meal planner for Neural Drive Performance.
Your task is to generate a custom, highly tailored weekly meal plan and consolidated grocery list.
Always output strict JSON with no markdown formatting surrounding the JSON response unless required.`;

    const userPrompt = `
Generate a ${isSwapRequest ? 'single replacement meal' : 'full weekly meal plan'} with the following specifications:

### FAMILY & HOUSEHOLD CONFIGURATION
- Account Name: ${name}
- Total Household Size: ${householdSize} person(s)
- Total Household Daily Target Calories: ${targetCalories ? `${targetCalories} kcal` : 'Not specified'}
- Total Household Daily Target Protein: ${targetProteinGrams ? `${targetProteinGrams}g` : 'Not specified'}
- Individual Member Breakdown:
${familyDetailsPrompt}

### DIETARY & PREFERENCE CONSTRAINTS
- Strict Household Exclusions / Allergies: ${exclusions.length > 0 ? exclusions.join(', ') : 'None'}
- Household Budget Level: ${budgetLevel}
- Max Prep Time Per Meal: ${maxPrepTime}
- Variety Level (1-5): ${varietyLevel}
- Enable Bulk/Batch Prep: ${enableBulkPrep ? 'Yes' : 'No'}
- Previously Used Recipes (Avoid Duplicates): ${recipeHistory.join(', ') || 'None'}

### WEEKLY SCHEDULE MATRIX
${JSON.stringify(weeklySchedule, null, 2)}

### OUTPUT REQUIREMENTS (JSON)
Return a valid JSON object matching this structure:
{
  "weeklyCalendar": [
    {
      "day": "MON",
      "meals": [
        {
          "type": "Lunch",
          "name": "Recipe Name",
          "calories": 650,
          "protein": 45,
          "carbs": 50,
          "fat": 20,
          "ingredients": ["1 lb Ground Turkey", "2 cups Brown Rice"],
          "instructions": ["Step 1...", "Step 2..."]
        }
      ]
    }
  ],
  "groceries": [
    {
      "category": "Proteins",
      "item": "Ground Turkey",
      "amount": "3 lbs"
    }
  ],
  "estimatedGroceryCost": "$150 – $200 USD"
}
`;

    /* 
      3. Call your AI Provider (OpenAI, Anthropic, Gemini, etc.)
      Example with OpenAI:
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      const responseData = JSON.parse(completion.choices[0].message.content || '{}');
    */

    // Placeholder mock return for testing front-end integration
    const mockData = {
      weeklyCalendar: [
        {
          day: 'MON',
          meals: [
            {
              type: 'Lunch',
              name: 'Family-Size Shredded Chicken Rice Bowls',
              calories: targetCalories ? Math.round(targetCalories * 0.35) : 650,
              protein: targetProteinGrams ? Math.round(targetProteinGrams * 0.35) : 45,
              carbs: 60,
              fat: 18,
              ingredients: [
                `${householdSize * 0.5} lbs Chicken Breast`,
                `${householdSize * 0.75} cups Jasmine Rice`,
                'Steamed Broccoli',
                'Low-Sodium Soy Sauce',
              ],
              instructions: [
                'Pressure cook or boil chicken until shreddable.',
                'Cook jasmine rice according to package directions.',
                'Assemble into bowls scaled for family portion sizes.',
              ],
            },
          ],
        },
      ],
      groceries: [
        { category: 'Proteins', item: 'Chicken Breast', amount: `${householdSize * 3} lbs` },
        { category: 'Grains & Carbs', item: 'Jasmine Rice', amount: '2 bags' },
        { category: 'Produce', item: 'Broccoli Heads', amount: '4 heads' },
      ],
      estimatedGroceryCost: `$${householdSize * 40} – $${householdSize * 65} USD`,
    };

    return NextResponse.json(mockData);
  } catch (error: any) {
    console.error('Error in generate-plan route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}