export function formatGroceryListText(groceries: { item: string; amount?: string; category?: string }[]) {
  let text = "🛒 GROCERY LIST\n\n";

  // Group by category if available, otherwise output a flat list
  groceries.forEach((g) => {
    const qty = g.amount ? ` (${g.amount})` : '';
    text += `☐ ${g.item}${qty}\n`;
  });

  return text;
}