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

function simplifyFoodQuery(raw: string): string {
  const stopWords = new Set([
    'with', 'and', 'over', 'in', 'a', 'the', 'style', 'bowl', 'plate',
    'zesty', 'creamy', 'crispy', 'herb', 'crusted', 'roasted', 'grilled',
    'baked', 'seared', 'pan', 'glazed', 'spicy', 'garlic', 'lemon', 'lime',
    'self-provided', 'breakfast', 'lunch', 'dinner', 'snack', 'snacks',
  ]);

  const words = raw
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 2).join(' ') || raw;
}

async function queryPixabay(apiKey: string, q: string) {
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(
    apiKey
  )}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return { hit: null, status: res.status };
  }

  const data = await res.json();
  return { hit: data?.hits?.[0] || null, status: res.status };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get('query') || '').trim().toLowerCase();
  const mealType = (searchParams.get('type') || 'dinner').trim().toLowerCase();

  const fallbackUrl = FALLBACK_IMAGES[mealType] || '/images/step-macros.jpg';

  if (!rawQuery || rawQuery.startsWith('self-provided')) {
    return NextResponse.json({ imageUrl: fallbackUrl, source: 'fallback-self-provided' });
  }

  try {
    // 1. Check Supabase cache first (expire after 20 hours because Pixabay /get/ URLs expire in 24h)
    const { data: cached } = await supabaseAdmin
      .from('recipe_images')
      .select('image_url, created_at')
      .eq('query', rawQuery)
      .maybeSingle();

    const isFresh =
      cached?.created_at &&
      Date.now() - new Date(cached.created_at).getTime() < 20 * 60 * 60 * 1000;

    if (cached?.image_url && isFresh) {
      return NextResponse.json({ imageUrl: cached.image_url, source: 'supabase-cache' });
    }

    // 2. Check Pixabay API Key
    const pixabayKey = process.env.PIXABAY_API_KEY?.trim();
    if (!pixabayKey) {
      return NextResponse.json({ imageUrl: fallbackUrl, source: 'missing-pixabay-key' });
    }

    // 3. Primary Pixabay search, with automatic 2-word dish fallback if 0 hits
    let { hit, status } = await queryPixabay(pixabayKey, `${rawQuery} food`);

    if (!hit && status === 200) {
      const simplified = simplifyFoodQuery(rawQuery);
      if (simplified && simplified !== rawQuery) {
        const retry = await queryPixabay(pixabayKey, `${simplified} dish`);
        hit = retry.hit;
        status = retry.status;
      }
    }

    const imageUrl = hit?.webformatURL || hit?.largeImageURL || fallbackUrl;

    // 4. Save valid Pixabay hit to Supabase cache with fresh timestamp
    if (hit?.webformatURL) {
      await supabaseAdmin.from('recipe_images').upsert({
        query: rawQuery,
        image_url: imageUrl,
        photographer: hit.user || null,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ imageUrl, source: 'pixabay' });
    }

    return NextResponse.json({
      imageUrl: fallbackUrl,
      source: status !== 200 ? `pixabay-http-${status}` : 'pixabay-no-hits',
    });
  } catch (err) {
    console.error('Recipe image fetch error:', err);
    return NextResponse.json({ imageUrl: fallbackUrl, source: 'error' });
  }
}