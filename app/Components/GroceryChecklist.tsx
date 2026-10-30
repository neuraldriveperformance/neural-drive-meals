'use client';

import React, { useState, useEffect } from 'react';
import {
  GroceryItem,
  AISLE_CATEGORIES,
  parseIngredientsToGroceryList,
  saveGroceryChecklist,
  getGroceryChecklist,
} from '@/lib/grocery';

interface GroceryChecklistProps {
  planId?: string;
  planTitle?: string;
  rawIngredients?: string[];
  initialItems?: GroceryItem[];
  onDelete?: () => void;
}

export default function GroceryChecklist({
  planId = 'default-plan',
  planTitle = 'Weekly Grocery Checklist',
  rawIngredients = [],
  initialItems,
  onDelete,
}: GroceryChecklistProps) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems || []);
  const [customItemInput, setCustomItemInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function initChecklist() {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
        return;
      }

      if (planId) {
        const savedItems = await getGroceryChecklist(planId);
        if (savedItems && savedItems.length > 0) {
          setItems(savedItems);
          return;
        }
      }

      if (rawIngredients.length > 0) {
        const parsed = parseIngredientsToGroceryList(rawIngredients);
        setItems(parsed);
        if (planId) {
          await saveGroceryChecklist(planId, parsed, planTitle);
        }
      }
    }

    initChecklist();
  }, [planId, rawIngredients, initialItems]);

  const handleToggleItem = async (itemId: string) => {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);

    if (planId) {
      setIsSaving(true);
      await saveGroceryChecklist(planId, updated, planTitle);
      setIsSaving(false);
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemInput.trim()) return;

    const newItem: GroceryItem = {
      id: `custom-${Date.now()}`,
      name: customItemInput.trim(),
      category: 'Other / Custom',
      checked: false,
      isCustom: true,
    };

    const updated = [...items, newItem];
    setItems(updated);
    setCustomItemInput('');

    if (planId) {
      setIsSaving(true);
      await saveGroceryChecklist(planId, updated, planTitle);
      setIsSaving(false);
    }
  };

  const handleResetChecklist = async () => {
    const reset = items.map((item) => ({ ...item, checked: false }));
    setItems(reset);

    if (planId) {
      setIsSaving(true);
      await saveGroceryChecklist(planId, reset, planTitle);
      setIsSaving(false);
    }
  };

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-[#0F1724] border border-[#1E2D4A] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* HEADER & PROGRESS BAR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              🛒 Store-Ready Grocery Matrix
              {isSaving && <span className="text-xs text-amber-400 font-normal">Saving...</span>}
            </h2>
            <p className="text-xs text-slate-400">
              Interactive store checklist—progress saves automatically on your phone.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChecklist}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              Reset All
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 rounded-lg transition"
              >
                🗑️ Delete List
              </button>
            )}
          </div>
        </div>

        {/* Completion Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Cart Progress</span>
            <span className="text-[#00F2FE] font-bold">
              {checkedCount} / {totalCount} Items ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full border border-[#1E2D4A] overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CATEGORIZED STORE AISLES */}
      <div className="space-y-5">
        {AISLE_CATEGORIES.map((category) => {
          const categoryItems = items.filter((i) => i.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#00F2FE] border-b border-[#1E2D4A] pb-1">
                {category} ({categoryItems.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryItems.map((item) => (
                  <label
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      item.checked
                        ? 'bg-slate-900/60 border-slate-800 text-slate-500 line-through'
                        : 'bg-[#162032] border-[#1E2D4A] hover:border-[#00F2FE]/50 text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                    />
                    <span className="text-xs font-medium leading-snug flex-1">
                      {item.name}
                      {item.isCustom && (
                        <span className="ml-1.5 text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 py-0.2 rounded">
                          Custom
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ADD CUSTOM ITEM FORM */}
      <form onSubmit={handleAddCustomItem} className="pt-2 border-t border-[#1E2D4A] flex gap-2">
        <input
          type="text"
          value={customItemInput}
          onChange={(e) => setCustomItemInput(e.target.value)}
          placeholder="Add extra item (e.g., Paper Towels, Protein Bars)..."
          className="flex-1 bg-slate-950 border border-[#1E2D4A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
        />
        <button
          type="submit"
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
        >
          + Add
        </button>
      </form>
    </div>
  );
}