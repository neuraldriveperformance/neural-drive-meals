'use client';

import React, { useState } from 'react';

export interface GroceryItem {
  item: string;
  amount: string;
}

export interface GroceryCategory {
  category: string;
  items: GroceryItem[];
}

interface GroceryListProps {
  categories: GroceryCategory[];
  estimatedCost?: string;
}

export default function GroceryList({ categories, estimatedCost }: GroceryListProps) {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1E2D4A] pb-4 gap-4">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            Consolidated Grocery Matrix
          </h3>
          <p className="text-xs text-gray-400">
            Combined ingredients optimized across your weekly schedule
          </p>
        </div>

        {estimatedCost && (
          <div className="bg-[#162032] border border-[#00F2FE]/40 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              Est. Total Grocery Cost
            </span>
            <span className="text-lg font-black text-[#00F2FE]">{estimatedCost}</span>
          </div>
        )}
      </div>

      {/* COST DISCLAIMER BANNER */}
      <div className="bg-[#162032]/80 border border-[#1E2D4A] rounded-xl p-3 text-[11px] text-gray-400 leading-snug">
        <strong className="text-gray-300">ESTIMATED COST DISCLAIMER:</strong> Grocery prices are approximate estimates only based on standard national averages. Actual retail totals may fluctuate significantly based on geographic region, local store pricing, brand selection, seasonal availability, and taxes.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, catIdx) => (
          <div
            key={cat.category}
            className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-4 space-y-3"
          >
            <h4 className="text-xs font-black uppercase text-[#00F2FE] border-b border-[#1E2D4A] pb-2 tracking-wide">
              {cat.category}
            </h4>
            <ul className="space-y-2">
              {cat.items.map((item, itemIdx) => {
                const key = `${catIdx}-${itemIdx}`;
                const isChecked = !!checkedItems[key];
                return (
                  <li
                    key={itemIdx}
                    onClick={() => toggleItem(catIdx, itemIdx)}
                    className="flex items-start gap-2.5 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by parent li click
                      className="mt-0.5 w-4 h-4 accent-[#00F2FE] rounded cursor-pointer"
                    />
                    <span
                      className={`text-xs transition ${
                        isChecked ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-white'
                      }`}
                    >
                      <strong className="font-bold text-white">{item.item}</strong>
                      {item.amount && ` — ${item.amount}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}