'use client';

import React, { useState, useEffect } from 'react';

interface MealPhotoProps {
  query?: string;
  mealName: string;
  mealType?: string;
}

export default function MealPhoto({ query, mealName, mealType = 'Dinner' }: MealPhotoProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const searchTerm = query || mealName;

    async function loadPhoto() {
      try {
        const res = await fetch(
          `/api/recipe-image?query=${encodeURIComponent(searchTerm)}&type=${encodeURIComponent(mealType)}`
        );
        const data = await res.json();
        if (active && data?.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      } catch {
        if (active) setImageUrl('/images/step-macros.jpg');
      }
    }

    loadPhoto();
    return () => {
      active = false;
    };
  }, [query, mealName, mealType]);

  return (
    <div className="relative w-full h-36 bg-gradient-to-br from-[#162032] via-[#0F1724] to-[#070A0F] overflow-hidden rounded-t-xl border-b border-[#1E2D4A]">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={mealName}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/step-macros.jpg';
            setLoaded(true);
          }}
          className={`w-full h-full object-cover object-center contrast-110 saturate-110 transition-all duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-90' : 'opacity-0'
          }`}
        />
      )}
      {/* Bottom scrim so card title and macro badges stay crisp */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1724] via-transparent to-[#070A0F]/30 pointer-events-none" />
    </div>
  );
}