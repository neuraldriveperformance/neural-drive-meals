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
    } = body;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Sample mock recipe catalog for fallback plan generation
    const lunchPool = [
      {
        name: 'Lean Beef & Rice Meal Prep Bowl',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 650,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 48,
        carbs: 55,
        fat: 16,
        ingredients: ['6oz 93/7 Ground Beef', '1 cup Brown Rice', '1 cup Roasted Peppers'],
        instructions: ['Brown beef in skillet.', 'Combine with cooked brown rice and veggies.'],
        familyFriendlyNote: 'Serve veggies on the side if preferred by children or teens.',
      },
      {
        name: 'Grilled Chicken & Quinoa Harvest Salad',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 620,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 52,
        carbs: 45,
        fat: 18,
        ingredients: ['6oz Chicken Breast', '1 cup Quinoa', 'Mixed Greens', '2 tbsp Vinaigrette'],
        instructions: ['Grill chicken breasts.', 'Slice and serve over bed of dressed greens and quinoa.'],
        familyFriendlyNote: 'Keep dressing on the side for younger family members.',
      },
      {
        name: 'Turkey Burrito Bowl with Black Beans',
        calories: clientCalories ? Math.round(clientCalories * 0.35) : 640,
        protein: clientProtein ? Math.round(clientProtein * 0.35) : 45,
        carbs: 60,
        fat: 15,
        ingredients: ['6oz Lean Ground Turkey', '1/2 cup Black Beans', '1 cup White Rice', 'Salsa'],
        instructions: ['Cook turkey with mild cumin and garlic.', 'Layer over rice and beans.'],
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
        ingredients: ['7oz Chicken Breast', '1.25 cups Jasmine Rice', '1 cup Steamed Broccoli'],
        instructions: ['Pan sear chicken with honey-garlic glaze.', 'Serve alongside jasmine rice and broccoli.'],
        familyFriendlyNote: 'Deconstruct for children: serve chicken plain without extra glaze.',
      },
      {
        name: 'Sheet Pan Wild Salmon & Roasted Sweet Potatoes',
        calories: clientCalories ? Math.round(clientCalories * 0.4) : 700,
        protein: clientProtein ? Math.round(clientProtein * 0.4) : 50,
        carbs: 50,
        fat: 24,
        ingredients: ['6oz Salmon Fillet', '1.5 cups Roasted Sweet Potato Cubes', '10 Asparagus Spears'],
        instructions: ['Bake salmon and cubed sweet potatoes at 400°F for 18 mins.'],
        familyFriendlyNote: 'Flake salmon into bite-size pieces for younger family members.',
      },
      {
        name: 'Lean Beef Stir-Fry with Snap Peas & Noodles',
        calories: clientCalories ? Math.round(clientCalories * 0.4) : 740,
        protein: clientProtein ? Math.round(clientProtein * 0.4) : 52,
        carbs: 70,
        fat: 18,
        ingredients: ['6oz Sirloin Steak Strips', '2 cups Udon Noodles', '1 cup Snap Peas'],
        instructions: ['High-heat stir fry sirloin and veggies in soy-sesame sauce.'],
        familyFriendlyNote: 'Serve noodles and steak strips un-sauced for kids.',
      },
    ];

    // Build complete 7-day calendar dynamically based on weeklySchedule
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
              ingredients: ['Greek Yogurt', 'Berries', 'Almonds'],
              instructions: ['Combine ingredients and serve.'],
              familyFriendlyNote: 'Easily adjustable portion sizes across kids and teens.',
            };
          }

          meals.push(selectedMeal);
        }
      }

      return { day, meals };
    });

    // Mock consolidated grocery matrix scaled by totalPortionWeight
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
        item: 'Wild Salmon Fillets',
        amount: `${(1.0 * totalPortionWeight).toFixed(1)} lbs`,
      },
      { category: 'Grains & Carbs', item: 'Jasmine Rice', amount: '2 Bags' },
      { category: 'Grains & Carbs', item: 'Sweet Potatoes', amount: '4 Large' },
      { category: 'Produce', item: 'Fresh Broccoli', amount: '3 Crowns' },
      { category: 'Produce', item: 'Asparagus', amount: '2 Bunches' },
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