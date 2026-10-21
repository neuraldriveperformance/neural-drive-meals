'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import ProfileModal from '../Components/ProfileModal';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'recipes'>('plans');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  useEffect(() => {
    async function fetchSavedPlans() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('saved_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setSavedPlans(data);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedPlans();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-xl text-cyan-400 tracking-tight">
            NeuralDrive Meals
          </span>
          <nav className="flex space-x-4">
            <Link 
              href="/" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Meal Generator
            </Link>
            <Link 
              href="/dashboard" 
              className="text-cyan-400 font-medium text-sm border-b-2 border-cyan-400 pb-1"
            >
              Dashboard
            </Link>
          </nav>
        </div>

        <button
          onClick={async () => {
            const supabase = createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Saved Library</h1>
            <p className="text-slate-400 text-sm mt-1">
              Access your personal meal plans and recipe collection across all devices.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span>⚙️</span> Profile Settings
            </button>
            <Link
              href="/"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              + Create New Plan
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'plans'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Meal Plans
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recipes'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Recipes
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'plans' ? (
          loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Loading your saved library...
            </div>
          ) : savedPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-lg text-slate-100">
                        {plan.title || plan.plan_name || 'Weekly Meal Plan'}
                      </h2>
                      <span className="text-xs text-slate-500">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-4">
                      {plan.plan_data?.length || 7}-Day Custom Performance Protocol
                    </p>
                  </div>

                  <Link
                    href="/"
                    className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1"
                  >
                    View Plan Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center py-12 col-span-full">
                <p className="text-slate-400 text-sm">No saved meal plans yet.</p>
                <Link
                  href="/"
                  className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
                >
                  Generate a plan to save it here →
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center py-12 col-span-full">
              <p className="text-slate-400 text-sm">No saved recipes yet.</p>
              <Link
                href="/"
                className="inline-block mt-3 text-cyan-400 hover:underline text-sm font-medium"
              >
                Find and bookmark recipes →
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Household & Nutrition Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}