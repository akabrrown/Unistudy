import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const maxResults = searchParams.get('maxResults') || '8'

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key is not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', `${q} university lecture study`)
    url.searchParams.set('type', 'video')
    url.searchParams.set('maxResults', maxResults)
    url.searchParams.set('relevanceLanguage', 'en')
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error) {
      console.error('YouTube API Error:', data.error)
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const videos = data.items?.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
    })) || []

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error('Failed to search YouTube:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
