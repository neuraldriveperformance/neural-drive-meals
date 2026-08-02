'use client';

import React, { useState } from 'react';

interface GroceryItem {
  item: string;
  amount?: string;
  category?: string;
}

interface Props {
  groceries: GroceryItem[];
}

// Self-contained formatter function
function formatGroceryListText(groceries: GroceryItem[]) {
  let text = "🛒 GROCERY LIST\n\n";
  groceries.forEach((g) => {
    const qty = g.amount ? ` (${g.amount})` : '';
    text += `☐ ${g.item}${qty}\n`;
  });
  return text;
}

export default function ShareGroceryButton({ groceries }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareText = formatGroceryListText(groceries);

    // Mobile / Native Share Sheet
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Grocery List',
          text: shareText,
        });
        return;
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    }

    // Desktop Fallback: Clipboard Copy
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      type="button"
      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm shadow-md"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z"
        />
      </svg>
      {copied ? 'Copied to Clipboard!' : 'Share / Save List'}
    </button>
  );
}