import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { 
      contentType, 
      contentId, 
      title, 
      description, 
      shareScope, 
      permission, 
      groupId,
      friendIds // array of user ids if scope is friends
    } = await req.json()

    if (!contentType || !contentId || !title || !shareScope) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine institution_id if scope is institution
    let institutionId = null
    if (shareScope === 'institution') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()
      
      institutionId = profile?.institution_id
    }

    // Insert the shared material
    const { data: sharedMaterial, error: shareError } = await supabase
      .from('shared_materials')
      .insert({
        owner_id: user.id,
        content_type: contentType,
        content_id: contentId,
        title,
        description,
        share_scope: shareScope,
        permission: permission || 'view',
        institution_id: institutionId
      })
      .select()
      .single()

    if (shareError) {
      console.error('Failed to create shared material:', shareError)
      return NextResponse.json({ error: shareError.message }, { status: 500 })
    }

    // Handle access rules for friends or groups
    if (shareScope === 'friends' && friendIds && friendIds.length > 0) {
      const accessRows = friendIds.map((friendId: string) => ({
        share_id: sharedMaterial.id,
        recipient_id: friendId
      }))
      await supabase.from('material_access').insert(accessRows)
    } else if (shareScope === 'group' && groupId) {
      // Fetch all group members
      const { data: members } = await supabase
        .from('study_group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (members && members.length > 0) {
        const accessRows = members.map(m => ({
          share_id: sharedMaterial.id,
          recipient_id: m.user_id,
          group_id: groupId
        }))
        
        await supabase.from('material_access').insert(accessRows)
      }
    }

    return NextResponse.json({ success: true, material: sharedMaterial })
  } catch (error: any) {
    console.error('Share material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
