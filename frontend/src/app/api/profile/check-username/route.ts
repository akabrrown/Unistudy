import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  // Use service role key to bypass RLS so we can check if username exists
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Check if the requested username is available
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('Error checking username:', error)
      return NextResponse.json({ error: 'Failed to verify username' }, { status: 500 })
    }

    if (!data) {
      // Username is available
      return NextResponse.json({ available: true, suggestions: [] })
    }

    // Username is taken, generate suggestions
    // We'll generate a pool of candidate usernames using suffixes and/or numbers
    const suffixes = ['_gh', '_official', '_real', '_student', '_study', '_1', '_2024', '_x', '123']
    const candidates = suffixes.map(suffix => `${username}${suffix}`)

    // Query the database to see which candidates are already taken
    const { data: takenCandidates, error: takenError } = await supabase
      .from('profiles')
      .select('username')
      .in('username', candidates)

    if (takenError) {
      console.error('Error checking candidates:', takenError)
      return NextResponse.json({ available: false, suggestions: [] })
    }

    const takenSet = new Set(takenCandidates.map(c => c.username))
    
    // Filter available candidates and take the first 3
    const suggestions = candidates.filter(c => !takenSet.has(c)).slice(0, 3)

    return NextResponse.json({ available: false, suggestions })
  } catch (err) {
    console.error('Unexpected error checking username:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
