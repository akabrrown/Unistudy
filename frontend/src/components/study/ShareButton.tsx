'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { ShareModal } from './ShareModal'

interface ShareButtonProps {
  contentType: string
  contentId: string
  title: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ShareButton({ 
  contentType, 
  contentId, 
  title, 
  variant = 'ghost', 
  size = 'icon',
  className
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={(e) => {
          e.stopPropagation()
          setIsModalOpen(true)
        }}
        className={className}
        title="Share"
      >
        <Share2 className={size === 'icon' ? "h-4 w-4" : "h-4 w-4 mr-2"} />
        {size !== 'icon' && 'Share'}
      </Button>

      <ShareModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        contentType={contentType}
        contentId={contentId}
        title={title}
      />
    </>
  )
}
