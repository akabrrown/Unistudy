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

    // 1. Fetch all announcements
    const { data: announcements, error: announcementsErr } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (announcementsErr) throw announcementsErr

    // 2. Fetch audience metrics & institutions in parallel
    const [profilesCountRes, paidProfilesCountRes, institutionsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).in('subscription_tier', ['pro', 'ultra']),
      supabase.from('institutions').select('id, name, abbreviation, student_count').order('student_count', { ascending: false }).limit(20)
    ])

    const totalStudents = profilesCountRes.count || 0
    const paidStudents = paidProfilesCountRes.count || 0
    const freeStudents = Math.max(0, totalStudents - paidStudents)

    const list = announcements || []
    const bannerCount = list.filter((a: any) => a.type === 'banner' || !a.type).length
    const emailCount = list.filter((a: any) => a.type === 'email').length
    const criticalCount = list.filter((a: any) => a.type === 'critical').length
    const modalCount = list.filter((a: any) => a.type === 'modal').length

    return NextResponse.json({
      announcements: list,
      stats: {
        totalBroadcasts: list.length,
        activeBanners: bannerCount + criticalCount,
        totalStudents,
        paidStudents,
        freeStudents,
        emailCount,
        criticalCount,
        modalCount
      },
      institutions: institutionsRes.data || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, body, type, target, target_audience } = await req.json()

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const resolvedTarget = target || target_audience || 'all'
    const resolvedType = type || 'banner'

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        body: body.trim(),
        type: resolvedType,
        target: resolvedTarget
      })
      .select()
      .single()

    if (error) throw error

    // Log to admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'create_announcement',
        target_id: data.id,
        target_type: 'announcement',
        details: {
          title: data.title,
          type: data.type,
          target: data.target
        }
      })
    } catch (auditErr) {
      console.warn('Failed to write admin audit log for announcement:', auditErr)
    }

    // Email dispatch trigger
    if (resolvedType === 'email' && resend) {
      (async () => {
        try {
          let query = supabase.from('profiles').select('email, subscription_tier, institution_id').not('email', 'is', null)

          if (resolvedTarget === 'tier:pro') {
            query = query.in('subscription_tier', ['pro', 'ultra'])
          } else if (resolvedTarget === 'tier:free') {
            query = query.or('subscription_tier.is.null,subscription_tier.eq.free')
          }

          const { data: users } = await query
          if (users && users.length > 0) {
            const emails = users.map((u: any) => u.email).filter(Boolean)
            for (let i = 0; i < emails.length; i += 50) {
              const batch = emails.slice(i, i + 50)
              await resend.emails.send({
                from: 'UniStudy <hello@unistudy.ai>',
                to: batch,
                subject: title,
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
                  <h2 style="color: #4A154B; margin-bottom: 16px;">${title}</h2>
                  <p style="color: #333; font-size: 15px; white-space: pre-wrap;">${body}</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                  <p style="color: #888; font-size: 12px;">This is an official announcement from UniStudy AI. To manage notification preferences, visit your account settings.</p>
                </div>`,
              })
            }
          }
        } catch (e) {
          console.error('Failed to send broadcast email', e)
        }
      })()
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
