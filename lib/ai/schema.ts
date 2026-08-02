import { z } from 'zod';

export const ingredientSchema = z.object({
  item: z.string().describe('Name of the ingredient, e.g., Chicken Breast, Oats, Almond Milk'),
  amount: z
    .string()
    .describe(
      'Standard measurement of mass or volume (e.g., "8 oz", "200 g", "1.5 cups", "2 tbsp"). Never use vague terms like "container", "package", "can", or "some".'
    ),
});

export const mealSchema = z.object({
  name: z.string().describe('Name of the meal, e.g., High Protein Oatmeal'),
  calories: z.number().describe('Total calories for this meal'),
  proteinGrams: z.number().describe('Protein in grams for this meal'),
  carbsGrams: z.number().optional().describe('Carbohydrates in grams'),
  fatGrams: z.number().optional().describe('Fat in grams'),
  description: z.string().describe('Detailed step-by-step cooking and prep instructions'),
  ingredients: z.array(ingredientSchema).describe('List of ingredients with exact standard measurements'),
});

export const mealPlanResponseSchema = z.object({
  meals: z.array(mealSchema),
  groceries: z.array(ingredientSchema).describe(
    'Consolidated shopping list with exact total quantities in standard mass or volume measurements (e.g., "24 oz", "500 g", "2 cups").'
  ),
});