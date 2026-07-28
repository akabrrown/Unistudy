import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const apiUrl = 'https://list-of-universities-in-ghana.onrender.com/universities'
      
    const response = await fetch(apiUrl, {
      next: { revalidate: 86400 } // Cache results for 24 hours
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    // The list-of-universities-in-ghana API returns { status: true, universities: [...] }
    const universitiesArray = data.universities || data
    return NextResponse.json(universitiesArray)
  } catch (error) {
    console.error('Ghana universities proxy error:', error)
    
    return NextResponse.json([])
  }
}
