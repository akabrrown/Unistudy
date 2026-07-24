import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, body, type, target_audience } = await req.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        type: type || 'banner',
        target: 'all'
      })
      .select()
      .single()

    if (error) throw error

    if (type === 'email' && resend) {
      // Async background task so it doesn't block the API response
      (async () => {
        try {
          const { data: users } = await supabase.from('profiles').select('email').not('email', 'is', null)
          if (users) {
            const emails = users.map((u: any) => u.email).filter(Boolean)
            
            // Send in batches of 50 as per Resend limits (just a simple loop)
            for (let i = 0; i < emails.length; i += 50) {
              const batch = emails.slice(i, i + 50)
              await resend.emails.send({
                from: 'UniStudy <hello@unistudy.ai>',
                to: batch,
                subject: title,
                html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
              })
            }
          }
        } catch (e) {
          console.error("Failed to send broadcast email", e)
        }
      })()
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
