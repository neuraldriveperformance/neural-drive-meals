'use client';

import React from 'react';

interface HeroShowcaseProps {
  onStartBuilding?: () => void;
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Dial In Precision Macros',
    subtitle: 'Strict 1-Serving Calibration',
    description:
      'Set exact daily calorie and protein targets tailored to your training output and dietary exclusions—calculated down to the gram and ounce.',
    image: '/images/step-macros.jpg',
    fallbackGradient: 'from-cyan-950 via-[#0F1724] to-[#070A0F]',
    metricBadge: '±1g Macro Accuracy',
  },
  {
    step: '02',
    title: 'Scale for Your Household',
    subtitle: 'Age-Weighted Portion Engine',
    description:
      'Cooking for more than one? Automatically scale shared dinners across adults (1.0x), teens (0.8x), and children (0.5x) without skewing your personal macros.',
    image: '/images/step-household.jpg',
    fallbackGradient: 'from-emerald-950 via-[#0F1724] to-[#070A0F]',
    metricBadge: 'Dynamic Multipliers',
  },
  {
    step: '03',
    title: 'Execute Smart Bulk Prep',
    subtitle: 'Dry-Weight Grocery Intelligence',
    description:
      'Batch-cook once or twice a week with automatic cooked-to-dry grain conversions and a deduplicated, aisle-sorted shopping checklist.',
    image: '/images/step-bulkprep.jpg',
    fallbackGradient: 'from-sky-950 via-[#0F1724] to-[#070A0F]',
    metricBadge: 'Dual Imperial / Metric',
  },
];

export default function HeroShowcase({ onStartBuilding }: HeroShowcaseProps) {
  const handleScrollToEngine = () => {
    if (onStartBuilding) {
      onStartBuilding();
      return;
    }
    const el = document.getElementById('generator-controls');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-8">
      {/* KINETIC VIDEO HERO BANNER */}
      <div className="relative w-full min-h-[460px] md:min-h-[540px] rounded-3xl overflow-hidden border border-[#1E2D4A] flex items-end shadow-2xl">
        {/* Background Ambient Loop Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105"
        >
          <source src="/videos/ndp-hero-loop.mp4" type="video/mp4" />
        </video>

        {/* Dark Cyber-Athletic Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A0F] via-[#070A0F]/75 to-[#070A0F]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A0F]/90 via-[#070A0F]/40 to-transparent" />

        {/* Hero Foreground Content */}
        <div className="relative z-10 w-full p-6 md:p-12 lg:p-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#0F1724]/90 backdrop-blur-md border border-[#00F2FE]/40 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-pulse" />
              <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-widest text-[#00F2FE]">
                Performance Nutrition &amp; Household Logistics
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
              FUEL FOR PEAK{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-cyan-300">
                HUMAN OUTPUT.
              </span>
            </h2>

            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-xl">
              Eliminate guesswork in the kitchen. Generate chef-caliber weekly meal protocols calibrated to your exact macros, scaled for your household, and converted into an exact dry-weight grocery list.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleScrollToEngine}
                className="bg-[#00F2FE] hover:bg-cyan-300 text-black font-black text-xs md:text-sm px-6 py-3.5 rounded-xl uppercase tracking-wider transition shadow-lg shadow-[#00F2FE]/20 cursor-pointer"
              >
                ⚡ Build Your Protocol
              </button>

              <a
                href="#how-it-works"
                className="bg-[#0F1724]/80 hover:bg-[#162032] backdrop-blur-md text-white border border-[#1E2D4A] font-bold text-xs md:text-sm px-5 py-3.5 rounded-xl transition"
              >
                Explore the System ↓
              </a>
            </div>
          </div>

          {/* Live Performance Telemetry Pill Box */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 bg-[#0F1724]/85 backdrop-blur-md border border-[#1E2D4A] p-4 rounded-2xl shrink-0">
            <div className="text-center px-2">
              <div className="text-lg md:text-2xl font-black text-[#00F2FE]">100%</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                Dual-Unit Sync
              </div>
            </div>
            <div className="text-center px-2 border-x border-[#1E2D4A]">
              <div className="text-lg md:text-2xl font-black text-white">7-Day</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                Batch Matrix
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-lg md:text-2xl font-black text-emerald-400">Zero</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                Food Waste
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL "HOW IT WORKS" 3-COLUMN SHOWCASE */}
      <div id="how-it-works" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00F2FE]">
              System Architecture
            </span>
            <h3 className="text-lg md:text-xl font-black text-white">
              How Neural Drive Precision Works
            </h3>
          </div>
          <p className="text-xs text-gray-400">
            Three automated layers from macro targets to Sunday prep.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <div
              key={item.step}
              className="group bg-[#0F1724] border border-[#1E2D4A] hover:border-[#00F2FE]/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 shadow-lg"
            >
              {/* Photo Header with Graceful Gradient Fallback */}
              <div className={`relative h-44 w-full bg-gradient-to-br ${item.fallbackGradient} overflow-hidden`}>
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1724] via-[#0F1724]/30 to-transparent" />

                {/* Step Number & Metric Pill */}
                <div className="absolute top-3 left-3 bg-[#070A0F]/85 backdrop-blur-md border border-[#1E2D4A] text-[#00F2FE] font-mono text-xs font-black px-2.5 py-1 rounded-lg">
                  STEP {item.step}
                </div>
                <div className="absolute bottom-3 right-3 bg-[#00F2FE]/15 backdrop-blur-md border border-[#00F2FE]/40 text-[#00F2FE] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  {item.metricBadge}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    {item.subtitle}
                  </div>
                  <h4 className="text-base font-black text-white group-hover:text-[#00F2FE] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}