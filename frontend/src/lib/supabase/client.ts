import { createBrowserClient } from '@supabase/ssr'

const initBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

let browserClient: ReturnType<typeof initBrowserClient> | null = null

export function createClient() {
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }

  const client = initBrowserClient()

  if (typeof window !== 'undefined') {
    browserClient = client
  }

  return client
}
