import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientName = 'Client',
      clientCalories,
      clientProtein,
      clientExclusions = [],
      household = { adults: 1, children: 0, familyDislikes: [] },
      totalPortionWeight = 1.0,
      budgetLevel = 'moderate',
      weeklySchedule = {},
      varietyLevel = 3,
      enableBulkPrep = false,
      maxPrepTime = 'no-limit',
      recipeHistory = [],
      isSwapRequest = false,
    } = body;

    // Build LLM Prompt
    const systemPrompt = `You are an elite sports nutritionist and family meal planner for Neural Drive Performance.
Always output strict JSON matching the required schema.

CRITICAL INSTRUCTIONS FOR RECIPES AND GROCERIES:
1. BASE RECIPES & MACROS: All individual meal object macros (calories, protein, carbs, fat) and base ingredient lists MUST be calculated for EXACTLY ONE (1) adult client serving.
2. GROCERY MATRIX SCALING: When generating the "groceries" list, calculate total raw ingredients across the week. For any meal slot marked as 'shared: true', multiply ingredient amounts by totalPortionWeight (${totalPortionWeight}x). For meal slots marked as 'shared: false', use 1.0x.
3. FAMILY FRIENDLY NOTES: For shared meals or meals containing spices/dislikes, provide a concise "familyFriendlyNote" detailing how to serve or deconstruct the meal for children or family members.`;

    const userPrompt = `
Generate a ${isSwapRequest ? 'single replacement meal' : 'full weekly meal plan'} with these exact parameters:

CLIENT NUTRITION PROFILE (1 Adult Serving Base):
- Client Name: ${clientName}
- Target Daily Calories: ${clientCalories ? `${clientCalories} kcal` : 'Not specified'}
- Target Daily Protein: ${clientProtein ? `${clientProtein}g` : 'Not specified'}
- Client Exclusions: ${clientExclusions.length > 0 ? clientExclusions.join(', ') : 'None'}

HOUSEHOLD & SCALING PROFILE:
- Household Adults: ${household.adults}
- Household Children: ${household.children}
- Total Portion Yield Multiplier for Shared Meals: ${totalPortionWeight}x
- Family Dislikes / Preferences: ${household.familyDislikes.length > 0 ? household.familyDislikes.join(', ') : 'None'}

PREFERENCES:
- Budget Tier: ${budgetLevel}
- Max Prep Time: ${maxPrepTime}
- Variety Level: ${varietyLevel}
- Enable Bulk/Batch Prep: ${enableBulkPrep ? 'Yes' : 'No'}
- Avoid Duplicates: ${recipeHistory.join(', ') || 'None'}

WEEKLY SCHEDULE MATRIX (Includes status & shared flag):
${JSON.stringify(weeklySchedule, null, 2)}

REQUIRED JSON OUTPUT FORMAT:
{
  "weeklyCalendar": [
    {
      "day": "MON",
      "meals": [
        {
          "type": "Dinner",
          "name": "Pan-Seared Salmon with Jasmine Rice & Asparagus",
          "calories": 650,
          "protein": 48,
          "carbs": 55,
          "fat": 22,
          "ingredients": ["6oz Salmon Fillet", "1 cup Cooked Jasmine Rice", "10 spears Asparagus"],
          "instructions": ["Step 1...", "Step 2..."],
          "familyFriendlyNote": "Keep garlic butter sauce on the side for kids and serve salmon plain."
        }
      ]
    }
  ],
  "groceries": [
    {
      "category": "Proteins",
      "item": "Salmon Fillet",
      "amount": "${(6 * totalPortionWeight).toFixed(1)} oz per shared dinner"
    }
  ],
  "estimatedGroceryCost": "$140 – $190 USD"
}
`;

    /* 
      Example OpenAI API call:
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

    // Placeholder mock return for immediate front-end testing
    const mockData = {
      weeklyCalendar: [
        {
          day: 'MON',
          meals: [
            {
              type: 'Dinner',
              name: 'Family-Style Honey Garlic Chicken & Rice',
              calories: clientCalories ? Math.round(clientCalories * 0.35) : 680,
              protein: clientProtein ? Math.round(clientProtein * 0.35) : 50,
              carbs: 65,
              fat: 18,
              ingredients: ['6oz Chicken Breast', '1 cup Jasmine Rice', '1 cup Steamed Broccoli'],
              instructions: [
                'Cook chicken in pan with garlic honey glaze.',
                'Serve over jasmine rice with steamed broccoli on the side.',
              ],
              familyFriendlyNote: 'Deconstruct for children: serve chicken plain without honey garlic glaze on top.',
            },
          ],
        },
      ],
      groceries: [
        {
          category: 'Proteins',
          item: 'Chicken Breast',
          amount: `${(0.375 * totalPortionWeight).toFixed(1)} lbs`,
        },
        { category: 'Grains & Carbs', item: 'Jasmine Rice', amount: '1 Bag' },
        { category: 'Produce', item: 'Broccoli', amount: '2 Crowns' },
      ],
      estimatedGroceryCost: `$${Math.round(40 * totalPortionWeight)} – $${Math.round(65 * totalPortionWeight)} USD`,
    };

    return NextResponse.json(mockData);
  } catch (error: any) {
    console.error('Error generating plan:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}