import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface YouTubeApiSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const VALID_DURATIONS = new Set(['any', 'short', 'medium', 'long']);
const VALID_ORDERS = new Set(['relevance', 'viewCount', 'rating', 'date']);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q')?.trim() || '';
  const rawMax = Number.parseInt(searchParams.get('maxResults') || '12', 10);
  const maxResults = String(Number.isFinite(rawMax) ? Math.min(Math.max(rawMax, 1), 24) : 12);
  const duration = searchParams.get('duration') || 'any';
  const order = searchParams.get('order') || 'relevance';
  const mode = searchParams.get('mode') || 'lecture';

  if (!rawQuery) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key is not configured' }, { status: 500 });
  }

  const suffixByMode: Record<string, string> = {
    lecture: 'university lecture course',
    tutorial: 'concise tutorial explained',
    exam: 'past exam worked examples review',
    raw: '',
  };
  const suffix = suffixByMode[mode] ?? suffixByMode.lecture;
  const fullQuery = suffix ? `${rawQuery} ${suffix}` : rawQuery;

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', fullQuery);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', maxResults);
    url.searchParams.set('relevanceLanguage', 'en');
    url.searchParams.set('safeSearch', 'moderate');
    if (VALID_DURATIONS.has(duration) && duration !== 'any') {
      url.searchParams.set('videoDuration', duration);
    }
    if (VALID_ORDERS.has(order)) {
      url.searchParams.set('order', order);
    }
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      error?: { message?: string };
      items?: YouTubeApiSearchItem[];
    };

    if (data.error) {
      console.error('YouTube API Error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'YouTube search failed' },
        { status: 500 }
      );
    }

    const videos =
      data.items
        ?.filter((item) => Boolean(item.id?.videoId))
        .map((item) => ({
          videoId: item.id?.videoId || '',
          title: decodeHtmlEntities(item.snippet?.title || 'Untitled Lecture'),
          channel: decodeHtmlEntities(item.snippet?.channelTitle || 'Academic Channel'),
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            '',
          description: decodeHtmlEntities(item.snippet?.description || ''),
          publishedAt: item.snippet?.publishedAt || null,
        })) || [];

    return NextResponse.json({ videos });
  } catch (error: unknown) {
    console.error('Failed to search YouTube:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
