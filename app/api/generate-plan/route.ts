import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientName = 'Client',
      clientCalories,
      clientProtein,
      clientExclusions = [],
      household = { adults: 1, teens: 0, children: 0, familyDislikes: [] },
      totalPortionWeight = 1.0,
      budgetLevel = 'moderate',
      weeklySchedule = {},
      varietyLevel = 3,
      enableBulkPrep = false,
      maxPrepTime = 'no-limit',
      recipeHistory = [],
      isSwapRequest = false,
      swapTarget,
    } = body;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const lunchPool = [
      {
        name: 'Lean Beef & Rice Meal Prep Bowl',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 650,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 48,
        carbs: 55,
        fat: 16,
        ingredients: [
          '6oz 93/7 Lean Ground Beef',
          '1 cup Cooked Brown Rice',
          '1 cup Red & Yellow Bell Peppers (diced)',
          '1 tsp Olive Oil',
          '1/2 tsp Garlic Powder',
          '1/2 tsp Onion Powder',
          'Salt and Black Pepper to taste',
        ],
        instructions: [
          'Heat olive oil in a skillet over medium-high heat.',
          'Add ground beef, garlic powder, onion powder, salt, and pepper; brown for 6-8 minutes until fully cooked.',
          'Add diced bell peppers and saute for 3-4 minutes until tender-crisp.',
          'Divide brown rice into prep containers and top with the seasoned beef and pepper mixture.',
        ],
        familyFriendlyNote: 'Serve veggies on the side if preferred by children or teens.',
      },
      {
        name: 'Grilled Chicken & Quinoa Harvest Salad with Balsamic Vinaigrette',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 620,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 52,
        carbs: 45,
        fat: 18,
        ingredients: [
          '6oz Boneless Skinless Chicken Breast',
          '1 cup Cooked Quinoa',
          '2 cups Mixed Salad Greens',
          '1 tbsp Extra Virgin Olive Oil (Dressing)',
          '1 tbsp Balsamic Vinegar (Dressing)',
          '1 tsp Dijon Mustard (Dressing)',
          '1 tsp Honey (Dressing)',
          'Salt and Black Pepper to taste',
        ],
        instructions: [
          'Season chicken breast with salt and pepper, then grill on medium-high heat for 6-7 minutes per side until internal temp reaches 165°F.',
          'Whisk together olive oil, balsamic vinegar, Dijon mustard, and honey in a small bowl to make the dressing.',
          'Slice chicken and layer over a bed of mixed greens and cooked quinoa.',
          'Drizzle vinaigrette over the salad right before serving.',
        ],
        familyFriendlyNote: 'Keep dressing on the side for younger family members.',
      },
      {
        name: 'Turkey Burrito Bowl with Black Beans & Salsa',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 640,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 45,
        carbs: 60,
        fat: 15,
        ingredients: [
          '6oz Lean Ground Turkey',
          '1/2 cup Low-Sodium Black Beans (rinsed & drained)',
          '1 cup Cooked White Jasmine Rice',
          '3 tbsp Fresh Tomato Salsa',
          '1/2 tsp Ground Cumin',
          '1/2 tsp Chili Powder',
          '1 tbsp Chopped Fresh Cilantro',
        ],
        instructions: [
          'Brown ground turkey in a skillet over medium heat, seasoning with ground cumin, chili powder, salt, and pepper.',
          'Warm black beans in a small saucepan or microwave.',
          'Layer cooked jasmine rice, black beans, and spiced turkey into bowls.',
          'Top with fresh tomato salsa and cilantro.',
        ],
        familyFriendlyNote: 'Keep spicy salsa separate for kids and teens.',
      },
    ];

    const dinnerPool = [
      {
        name: 'Pan-Seared Honey Garlic Chicken & Rice',
        calories: clientCalories ? Math.round(clientCalories * 0.4) : 720,
        protein: clientProtein ? Math.round(clientProtein * 0.4) : 55,
        carbs: 65,
        fat: 18,
        ingredients: [
          '7oz Boneless Skinless Chicken Breast',
          '1.25 cups Cooked Jasmine Rice',
          '1 cup Steamed Broccoli Florets',
          '1.5 tbsp Raw Honey (Glaze)',
          '2 Cloves Garlic (minced) (Glaze)',
          '1 tbsp Low-Sodium Soy Sauce (Glaze)',
          '1 tsp Olive Oil',
          '1 tsp Cornstarch mixed with 1 tbsp water (Glaze thickener)',
        ],
        instructions: [
          'In a small bowl, whisk together honey, minced garlic, low-sodium soy sauce, and the cornstarch slurry.',
          'Heat olive oil in a skillet over medium-high heat. Season chicken breast with salt and pepper and sear for 5-6 minutes per side until golden.',
          'Reduce heat to low, pour the honey garlic mixture over the chicken, and simmer for 2-3 minutes until glaze thickens and coats the chicken.',
          'Serve glazed chicken alongside cooked jasmine rice and steamed broccoli.',
        ],
        familyFriendlyNote: 'Deconstruct for children: serve chicken plain without extra glaze.',
      },
      {
        name: 'Sheet Pan Wild Salmon & Roasted Sweet Potatoes',
        calories: clientCalories ? Math.round(clientCalories * 0.4) : 700,
        protein: clientProtein ? Math.round(clientProtein * 0.4) : 50,
        carbs: 50,
        fat: 24,
        ingredients: [
          '6oz Wild Salmon Fillet',
          '1.5 cups Sweet Potato Cubes',
          '10 Fresh Asparagus Spears',
          '1 tbsp Olive Oil',
          '1/2 Lemon (sliced into wheels)',
          '1/2 tsp Dried Dill',
          'Salt and Black Pepper to taste',
        ],
        instructions: [
          'Preheat oven to 400°F (200°C) and line a sheet pan with parchment paper.',
          'Toss sweet potato cubes with half the olive oil, salt, and pepper. Spread on pan and bake for 10 minutes.',
          'Remove pan, add salmon fillet and asparagus. Drizzle remaining olive oil, sprinkle salmon with dill, salt, and pepper, and top with lemon slices.',
          'Return to oven and bake for an additional 12-15 minutes until salmon flakes easily.',
        ],
        familyFriendlyNote: 'Flake salmon into bite-size pieces for younger family members.',
      },
      {
        name: 'Lean Beef Stir-Fry with Snap Peas & Noodles',
        calories: clientCalories ? Math.round(clientCalories * 0.4) : 740,
        protein: clientProtein ? Math.round(clientProtein * 0.4) : 52,
        carbs: 70,
        fat: 18,
        ingredients: [
          '6oz Top Sirloin Steak (sliced into thin strips)',
          '2 cups Cooked Udon Noodles',
          '1 cup Sugar Snap Peas',
          '1.5 tbsp Low-Sodium Soy Sauce (Sauce)',
          '1 tsp Toasted Sesame Oil (Sauce)',
          '1 tsp Grated Fresh Ginger (Sauce)',
          '1 Clove Garlic (minced) (Sauce)',
        ],
        instructions: [
          'Whisk soy sauce, sesame oil, grated ginger, and minced garlic together in a small bowl.',
          'Heat a wok or skillet on high heat. Add beef strips and sear quickly for 2-3 minutes until browned.',
          'Add snap peas and cooked udon noodles, then pour over the sauce mixture.',
          'Toss continuously for 2 minutes until sauce evenly coats noodles and veggies.',
        ],
        familyFriendlyNote: 'Serve noodles and steak strips un-sauced for kids.',
      },
    ];

    // --- SWAP REQUEST HANDLER ---
    if (isSwapRequest && swapTarget) {
      const pool = swapTarget.type === 'Lunch' ? lunchPool : swapTarget.type === 'Dinner' ? dinnerPool : lunchPool;
      
      // Select a random meal from the pool
      const randomIndex = Math.floor(Math.random() * pool.length);
      const swappedMeal = {
        ...pool[randomIndex],
        type: swapTarget.type,
      };

      return NextResponse.json({ swappedMeal });
    }

    // --- FULL PLAN GENERATION HANDLER ---
    const mockWeeklyCalendar = days.map((day, dayIndex) => {
      const daySchedule = weeklySchedule[day] || {};
      const meals = [];

      for (const [type, slotData] of Object.entries(daySchedule) as [string, any][]) {
        if (slotData.status === 'generate') {
          let selectedMeal;
          
          if (type === 'Lunch') {
            const index = enableBulkPrep ? Math.floor(dayIndex / 2) % lunchPool.length : dayIndex % lunchPool.length;
            selectedMeal = { ...lunchPool[index], type };
          } else if (type === 'Dinner') {
            const index = enableBulkPrep ? Math.floor(dayIndex / 2) % dinnerPool.length : dayIndex % dinnerPool.length;
            selectedMeal = { ...dinnerPool[index], type };
          } else {
            selectedMeal = {
              type,
              name: `Custom ${type} Protocol`,
              calories: clientCalories ? Math.round(clientCalories * 0.25) : 400,
              protein: clientProtein ? Math.round(clientProtein * 0.25) : 30,
              carbs: 40,
              fat: 12,
              ingredients: [
                '3/4 cup Low-Fat Plain Greek Yogurt',
                '1/2 cup Mixed Fresh Berries',
                '1 tbsp Raw Whole Almonds (chopped)',
                '1 tsp Raw Honey',
              ],
              instructions: [
                'Spoon Greek yogurt into a bowl.',
                'Top with mixed berries and chopped almonds.',
                'Drizzle honey over the top and serve immediately.',
              ],
              familyFriendlyNote: 'Easily adjustable portion sizes across kids and teens.',
            };
          }

          meals.push(selectedMeal);
        }
      }

      return { day, meals };
    });

    const mockGroceries = [
      {
        category: 'Proteins',
        item: 'Chicken Breast',
        amount: `${(1.5 * totalPortionWeight).toFixed(1)} lbs`,
      },
      {
        category: 'Proteins',
        item: 'Lean Ground Beef (93/7)',
        amount: `${(1.2 * totalPortionWeight).toFixed(1)} lbs`,
      },
      {
        category: 'Proteins',
        item: 'Top Sirloin Steak',
        amount: `${(1.0 * totalPortionWeight).toFixed(1)} lbs`,
      },
      {
        category: 'Proteins',
        item: 'Wild Salmon Fillets',
        amount: `${(1.0 * totalPortionWeight).toFixed(1)} lbs`,
      },
      { category: 'Grains & Carbs', item: 'Jasmine Rice', amount: '2 Bags' },
      { category: 'Grains & Carbs', item: 'Brown Rice', amount: '1 Bag' },
      { category: 'Grains & Carbs', item: 'Udon Noodles', amount: '1 Pack' },
      { category: 'Grains & Carbs', item: 'Sweet Potatoes', amount: '4 Large' },
      { category: 'Pantry & Sauces', item: 'Raw Honey', amount: '1 Bottle' },
      { category: 'Pantry & Sauces', item: 'Low-Sodium Soy Sauce', amount: '1 Bottle' },
      { category: 'Pantry & Sauces', item: 'Balsamic Vinegar & Dijon', amount: '1 Each' },
      { category: 'Produce', item: 'Fresh Garlic & Ginger', amount: '1 Head / 1 Root' },
      { category: 'Produce', item: 'Fresh Broccoli', amount: '3 Crowns' },
      { category: 'Produce', item: 'Sugar Snap Peas', amount: '1 Bag' },
    ];

    const mockData = {
      weeklyCalendar: mockWeeklyCalendar,
      groceries: mockGroceries,
      estimatedGroceryCost: `$${Math.round(90 * totalPortionWeight)} – $${Math.round(140 * totalPortionWeight)} USD`,
    };

    return NextResponse.json(mockData);
  } catch (error: any) {
    console.error('Error generating plan:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}