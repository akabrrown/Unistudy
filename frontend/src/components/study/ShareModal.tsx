'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Share2, Users, Building, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'

export type ShareScope = 'private' | 'friends' | 'group' | 'institution' | 'public'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: string
  contentId: string
  title: string
}

export function ShareModal({ isOpen, onClose, contentType, contentId, title }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState('who')
  const [scope, setScope] = useState<ShareScope>('friends')
  const [permission, setPermission] = useState('view')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleShare = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/materials/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          title,
          description: message,
          shareScope: scope,
          permission,
          friendIds: [], // In a real app, populate from friends selector
          groupId: null // In a real app, populate from group selector
        })
      })

      if (!response.ok) {
        throw new Error('Failed to share material')
      }

      toast.success(`Successfully shared ${title}.`)
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Material
          </DialogTitle>
          <DialogDescription>
            Choose who can access "{title}".
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-4">
          <div className="flex bg-muted p-1 rounded-lg w-full grid grid-cols-3 mb-4">
            <button 
              onClick={() => setActiveTab('who')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'who' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Who
            </button>
            <button 
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'permissions' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Permissions
            </button>
            <button 
              onClick={() => setActiveTab('message')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'message' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Message
            </button>
          </div>
          
          {activeTab === 'who' && (
            <div className="space-y-4 py-4">
            <RadioGroup value={scope} onValueChange={(val) => setScope(val as ShareScope)}>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex flex-1 items-center gap-2 cursor-pointer">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Private</span>
                    <span className="text-xs text-muted-foreground">Only you can access this.</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="friends" id="friends" />
                <Label htmlFor="friends" className="flex flex-1 items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Friends</span>
                    <span className="text-xs text-muted-foreground">Share with your friends.</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="institution" id="institution" />
                <Label htmlFor="institution" className="flex flex-1 items-center gap-2 cursor-pointer">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>My Institution</span>
                    <span className="text-xs text-muted-foreground">Anyone at your school.</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex flex-1 items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>Public</span>
                    <span className="text-xs text-muted-foreground">Anyone with the link can view.</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          )}
          
          {activeTab === 'permissions' && (
            <div className="space-y-4 py-4">
            <RadioGroup value={permission} onValueChange={setPermission}>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="view" id="view" />
                <Label htmlFor="view" className="flex-1 cursor-pointer">
                  <div className="font-medium">View Only</div>
                  <div className="text-xs text-muted-foreground">Recipients can view but cannot download.</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="download" id="download" />
                <Label htmlFor="download" className="flex-1 cursor-pointer">
                  <div className="font-medium">View & Download</div>
                  <div className="text-xs text-muted-foreground">Recipients can view and download a copy.</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          )}
          
          {activeTab === 'message' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="message">Add a note (optional)</Label>
                <textarea 
                  id="message" 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Check out these helpful notes..." 
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleShare} disabled={isLoading}>
            {isLoading ? 'Sharing...' : 'Share Material'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
