import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/auth/callback']
  const isPublic = PUBLIC_ROUTES.some(r => request.nextUrl.pathname.startsWith(r) || request.nextUrl.pathname === '/')
  
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const publicApiPaths = [
    '/api/webhooks', 
    '/api/cron', 
    '/api/contact', 
    '/api/profile/check-username', 
    '/api/ai/explain-slide',
    '/api/institutions',
    '/api/friends/requests'
  ]
  const isPublicApi = publicApiPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublic && !request.nextUrl.pathname.startsWith('/_next') && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect_to', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isApiRoute && !isPublicApi && !user) {
    // Return 401 Unauthorized for protected API routes
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect signed-in users from login page to dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
