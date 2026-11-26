import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { classifyBotUserAgent } from '../../../../shared/lib/cpuOptimization'

const STATIC_PUBLIC_ROUTES = [
  '/how-it-works',
  '/privacy',
  '/terms',
  '/cookies',
  '/academic-integrity',
  '/pricing',
  '/features',
  '/contact',
  '/offline',
  '/manifest.webmanifest',
  '/sw.js',
]

const AUTH_PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/auth/callback']

const PUBLIC_API_PATHS = [
  '/api/webhooks',
  '/api/cron',
  '/api/contact',
  '/api/profile/check-username',
  '/api/ai/explain-slide',
  '/api/institutions',
  '/api/friends/requests',
]

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api')

  if (isApiRoute) {
    const classification = classifyBotUserAgent(request.headers.get('user-agent'), pathname)
    if (classification === 'malicious') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const isStaticPublic = STATIC_PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))

  // Zero-DB bypass for public static pages & public API endpoints
  if (isStaticPublic || (isApiRoute && isPublicApi)) {
    return NextResponse.next({ request })
  }

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some((c) => c.name.startsWith('sb-'))
  const isPublic = pathname === '/' || AUTH_PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  // Fast-exit unauthenticated visitors before invoking remote supabase.auth.getUser()
  if (!hasAuthCookie) {
    if (!isPublic && !pathname.startsWith('/_next') && !isApiRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect_to', pathname)
      return NextResponse.redirect(url)
    }

    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublic && !pathname.startsWith('/_next') && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect_to', pathname)
    return NextResponse.redirect(url)
  }

  if (isApiRoute && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect signed-in users from login page or landing page to dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
