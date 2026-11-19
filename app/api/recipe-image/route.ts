import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FALLBACK_IMAGES: Record<string, string> = {
  breakfast: '/images/step-macros.jpg',
  lunch: '/images/step-bulkprep.jpg',
  dinner: '/images/step-household.jpg',
  snacks: '/images/step-macros.jpg',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get('query') || '').trim().toLowerCase();
  const mealType = (searchParams.get('type') || 'dinner').trim().toLowerCase();

  const fallbackUrl = FALLBACK_IMAGES[mealType] || '/images/step-macros.jpg';

  if (!rawQuery) {
    return NextResponse.json({ imageUrl: fallbackUrl });
  }

  try {
    // 1. Check Supabase cache first
    const { data: cached } = await supabaseAdmin
      .from('recipe_images')
      .select('image_url')
      .eq('query', rawQuery)
      .maybeSingle();

    if (cached?.image_url) {
      return NextResponse.json({ imageUrl: cached.image_url, cached: true });
    }

    // 2. Fetch from Pixabay API
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (!pixabayKey) {
      return NextResponse.json({ imageUrl: fallbackUrl });
    }

    const searchRes = await fetch(
      `https://pixabay.com/api/?key=${encodeURIComponent(pixabayKey)}&q=${encodeURIComponent(rawQuery)}&category=food&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`,
      { next: { revalidate: 86400 } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ imageUrl: fallbackUrl });
    }

    const searchData = await searchRes.json();
    const hit = searchData?.hits?.[0];
    const imageUrl = hit?.webformatURL || hit?.largeImageURL || fallbackUrl;

    // 3. Save to Supabase cache for instant future lookups
    if (hit?.webformatURL) {
      await supabaseAdmin.from('recipe_images').upsert({
        query: rawQuery,
        image_url: imageUrl,
        photographer: hit.user || null,
      });
    }

    return NextResponse.json({ imageUrl, cached: false });
  } catch (err) {
    console.error('Recipe image fetch error:', err);
    return NextResponse.json({ imageUrl: fallbackUrl });
  }
}