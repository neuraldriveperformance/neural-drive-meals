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
    const seed = body.seed || `${Date.now()}-${Math.random()}`;
    const isSwapRequest = Boolean(body.isSwapRequest);
    
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

    const historyPrompt = recipeHistory.length > 0 
      ? `STRICT EXCLUSIONS (DO NOT REPEAT ANY OF THESE RECIPES): ${JSON.stringify(recipeHistory)}.`
      : '';

    let systemPrompt = '';

    if (isSwapRequest) {
      systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate EXACTLY ONE SINGLE unique replacement meal matching the client macros and exclusions.
UNIQUE SEED FOR THIS SWAP: [${seed}]

${historyPrompt}

CRITICAL MACROS RULE:
The meal object MUST contain ALL FOUR explicit numerical macro fields:
- "calories": integer (kcal)
- "protein": integer (grams)
- "carbs": integer (grams)
- "fat": integer (grams)

PREP & COOK TIME RULE:
- Maximum prep/cook time allowed is ${maxPrepMinutes === 999 ? 'unlimited' : `${maxPrepMinutes} minutes`}.

Return strictly in this JSON format:
{
  "weeklyCalendar": [
    {
      "day": "MON",
      "meals": [
        {
          "type": "${Object.values(weeklySchedule)?.[0]?.[0] || 'Meal'}",
          "name": "Unique Recipe Name",
          "calories": 600,
          "protein": 45,
          "carbs": 50,
          "fat": 20,
          "prepTime": "20 mins",
          "ingredients": ["Ingredient 1", "Ingredient 2"],
          "instructions": ["Step 1", "Step 2"]
        }
      ]
    }
  ]
}`;
    } else {
      // Full weekly plan prompt
      systemPrompt = `You are an elite sports nutritionist for Neural Drive Performance.
Generate a dynamic, structured JSON meal plan strictly adhering to the requirements below.

DYNAMIC UNIQUE SEED: [${seed}]
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

CLIENT PROFILE:
- Name: ${clientName}
- Daily Target: ${calories} kcal, ${protein}g Protein
- Household Multiplier: ${householdSize} person(s)
- Dietary Exclusions/Allergies: ${exclusions}
- Budget Tier: ${budgetLevel}
- Variety Scale (${varietyLevel}/5 Rules)
- Bulk Prep Toggle State: ${enableBulkPrep ? 'Enabled' : 'Disabled'}

Schedule Matrix requested:
${JSON.stringify(weeklySchedule)}`;
    }

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
            temperature: 0.9,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const parsedContent = JSON.parse(aiData.choices[0].message.content);
          return NextResponse.json(parsedContent);
        }
      } catch (e) {
        console.warn('OpenAI API call failed:', e);
      }
    }

    return NextResponse.json(
      { error: 'OpenAI API key missing or request failed.' },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}