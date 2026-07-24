'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function AvatarEditor({ initialUrl, initialName }: { initialUrl?: string, initialName?: string }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setIsUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      const newUrl = data.publicUrl
      setAvatarUrl(newUrl)

      // Save to profile
      await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: newUrl, avatar_type: 'custom' })
      })

      router.refresh()
    } catch (error) {
      alert('Error uploading avatar!')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-6 mb-6">
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border shadow-sm" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold shadow-sm">
            {initialName?.charAt(0) || 'U'}
          </div>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="font-medium text-lg">{initialName}</div>
        <div>
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={uploadAvatar}
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Change Avatar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
