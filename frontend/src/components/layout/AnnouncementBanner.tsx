'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'

interface AnnouncementBannerProps {
  announcement: {
    id: string
    title: string
    body: string
  } | null
}

export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (announcement) {
      const dismissed = localStorage.getItem(`dismissed_announcement_${announcement.id}`)
      if (!dismissed) {
        setIsVisible(true)
      }
    }
  }, [announcement])

  if (!isVisible || !announcement) return null

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(`dismissed_announcement_${announcement.id}`, 'true')
  }

  return (
    <div className="bg-[var(--color-plum-500)] text-white px-4 py-3 flex items-start sm:items-center justify-between gap-4 rounded-xl mb-6 shadow-sm">
      <div className="flex items-start sm:items-center gap-3">
        <div className="bg-white/20 p-2 rounded-full shrink-0">
          <Megaphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <strong className="text-sm font-semibold">{announcement.title}</strong>
          <span className="hidden sm:inline opacity-50">&bull;</span>
          <span className="text-sm opacity-90">{announcement.body}</span>
        </div>
      </div>
      <button 
        onClick={handleDismiss}
        className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
