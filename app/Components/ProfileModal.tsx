'use client';

import { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [dailyCalories, setDailyCalories] = useState(2000);
  const [proteinGrams, setProteinGrams] = useState(150);
  const [carbsGrams, setCarbsGrams] = useState(200);
  const [fatsGrams, setFatsGrams] = useState(65);
  
  const [householdSize, setHouseholdSize] = useState(1);
  const [teensCount, setTeensCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [dietaryPreferences, setDietaryPreferences] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoading(true);
      const profile = await getUserProfile();
      if (profile) {
        setDailyCalories(profile.daily_calories || 2000);
        setProteinGrams(profile.protein_grams || 150);
        setCarbsGrams(profile.carbs_grams || 200);
        setFatsGrams(profile.fats_grams || 65);
        setDietaryPreferences((profile.dietary_preferences || []).join(', '));

        const info = profile.household_info || {};
        setHouseholdSize(info.household_size || 1);
        setTeensCount(info.teens || 0);
        setChildrenCount(info.children || 0);
      }
      setLoading(false);
    }

    loadData();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const prefsArray = dietaryPreferences
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const success = await updateUserProfile({
      daily_calories: Number(dailyCalories),
      protein_grams: Number(proteinGrams),
      carbs_grams: Number(carbsGrams),
      fats_grams: Number(fatsGrams),
      dietary_preferences: prefsArray,
      household_info: {
        household_size: Number(householdSize),
        teens: Number(teensCount),
        children: Number(childrenCount),
      },
    });

    setSaving(false);
    if (success) {
      setMessage('Profile settings saved successfully!');
      setTimeout(() => {
        setMessage('');
        onClose();
      }, 1200);
    } else {
      setMessage('Failed to save settings. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <h2 className="text-xl font-bold text-white">Household & Nutrition Profile</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading profile defaults...
          </div>
        ) : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Macros Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                Daily Nutrition Targets
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Daily Calories
                  </label>
                  <input
                    type="number"
                    value={dailyCalories}
                    onChange={(e) => setDailyCalories(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={proteinGrams}
                    onChange={(e) => setProteinGrams(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={carbsGrams}
                    onChange={(e) => setCarbsGrams(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    value={fatsGrams}
                    onChange={(e) => setFatsGrams(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Household Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                Household Composition
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Teens
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={teensCount}
                    onChange={(e) => setTeensCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Dietary Preferences / Exclusions (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Gluten-Free, Dairy-Free, No Peanuts"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {message && (
              <p
                className={`text-xs ${
                  message.includes('success') ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                {message}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}