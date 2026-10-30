'use client';

import React, { useState, useEffect } from 'react';
import {
  GroceryItem,
  GroceryChecklistData,
  parseIngredientsToGroceryList,
  saveGroceryChecklist,
  getGroceryChecklist,
} from '@/lib/grocery';

interface Props {
  planId: string;
  planTitle?: string;
  rawIngredients?: any[];
  initialItems?: GroceryItem[];
  onDelete?: () => void;
}

export default function GroceryChecklist({
  planId,
  planTitle = 'Weekly Grocery List',
  rawIngredients,
  initialItems,
  onDelete,
}: Props) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems || []);
  const [loading, setLoading] = useState<boolean>(!initialItems);
  const [saving, setSaving] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Pantry & Other');
  const [newItemAmount, setNewItemAmount] = useState('');

  const categories = [
    'Meat & Seafood',
    'Produce',
    'Dairy & Eggs',
    'Grains & Bakery',
    'Pantry & Other',
  ];

  const isRealDbPlan = Boolean(
    planId &&
    !planId.startsWith('plan-') &&
    planId !== 'active-plan' &&
    planId.length > 20
  );

  useEffect(() => {
    async function initChecklist() {
      setLoading(true);

      if (isRealDbPlan) {
        const saved: GroceryChecklistData | null = await getGroceryChecklist(planId);
        if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
          setItems(saved.items);
          setLoading(false);
          return;
        }
      }

      if (rawIngredients && rawIngredients.length > 0) {
        const parsed = parseIngredientsToGroceryList(rawIngredients);
        setItems(parsed);
      }
      setLoading(false);
    }

    if (!initialItems) {
      initChecklist();
    } else {
      setItems(initialItems);
      setLoading(false);
    }
  }, [planId, rawIngredients, initialItems, isRealDbPlan]);

  const toggleItem = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);

    if (isRealDbPlan) {
      setSaving(true);
      await saveGroceryChecklist(planId, updated, planTitle);
      setSaving(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      amount: newItemAmount.trim(),
      checked: false,
    };

    const updated = [...items, newItem];
    setItems(updated);
    setNewItemName('');
    setNewItemAmount('');

    if (isRealDbPlan) {
      setSaving(true);
      await saveGroceryChecklist(planId, updated, planTitle);
      setSaving(false);
    }
  };

  const handleClearChecked = async () => {
    const updated = items.filter((i) => !i.checked);
    setItems(updated);

    if (isRealDbPlan) {
      setSaving(true);
      await saveGroceryChecklist(planId, updated, planTitle);
      setSaving(false);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 text-center text-xs text-gray-400">
        Loading interactive grocery list...
      </div>
    );
  }

  return (
    <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E2D4A] pb-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <span>🛒</span> {planTitle}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Deduplicated and categorized by store aisle for efficient shopping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              className="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 rounded-lg transition"
            >
              Clear Checked ({checkedCount})
            </button>
          )}
          {saving && (
            <span className="text-[11px] text-[#00F2FE] animate-pulse font-mono">
              Saving...
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">
            Shopping Progress: <strong className="text-white">{checkedCount}</strong> / {totalCount} items completed
          </span>
          <span className="text-[#00F2FE] font-mono font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-[#162032] h-2.5 rounded-full overflow-hidden border border-[#1E2D4A]">
          <div
            className="bg-[#00F2FE] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleAddItem} className="bg-[#162032] border border-[#1E2D4A] p-3 rounded-xl flex flex-col sm:flex-row gap-2 items-center">
        <input
          type="text"
          placeholder="Add extra item (e.g. Paper towels)"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FE] w-full"
        />
        <input
          type="text"
          placeholder="Amount (optional)"
          value={newItemAmount}
          onChange={(e) => setNewItemAmount(e.target.value)}
          className="w-full sm:w-32 bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
        />
        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          className="w-full sm:w-40 bg-[#0F1724] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full sm:w-auto bg-[#00F2FE] hover:bg-cyan-400 text-black font-black px-4 py-1.5 rounded-lg text-xs transition"
        >
          + Add
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const categoryItems = items.filter((i) => i.category === cat);
          if (categoryItems.length === 0) return null;

          return (
            <div key={cat} className="bg-[#162032] border border-[#1E2D4A] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-[#1E2D4A] pb-2">
                <h4 className="text-xs font-black uppercase text-[#00F2FE] tracking-wider">
                  {cat}
                </h4>
                <span className="text-[10px] text-gray-400 font-mono">
                  {categoryItems.filter((i) => i.checked).length}/{categoryItems.length}
                </span>
              </div>
              <ul className="space-y-2">
                {categoryItems.map((item) => (
                  <li
                    key={item.id}
                    onClick={(e) => toggleItem(item.id, e)}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer select-none transition border ${
                      item.checked
                        ? 'bg-[#0F1724]/40 border-transparent opacity-60'
                        : 'bg-[#0F1724] border-[#1E2D4A] hover:border-[#00F2FE]/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded border-[#1E2D4A] bg-[#0F1724] text-[#00F2FE] focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1 text-xs leading-tight">
                      <span className={item.checked ? 'line-through text-gray-500' : 'text-gray-200 font-medium'}>
                        {item.name}
                      </span>
                      {item.amount && (
                        <span className="block text-[10px] text-[#00F2FE]/80 font-mono mt-0.5">
                          {item.amount}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {onDelete && (
        <div className="flex justify-end pt-4 border-t border-[#1E2D4A]">
          <button
            onClick={onDelete}
            className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
          >
            Remove Checklist
          </button>
        </div>
      )}
    </div>
  );
}