'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Share2, BookOpen, Layers, Video, FileText, Save, ExternalLink } from 'lucide-react'

interface SharedMaterial {
  id: string
  content_type: string
  content_id: string
  title: string
  description: string
  share_scope: string
  permission: string
  created_at: string
  saved: boolean
  profiles: {
    full_name: string
    avatar_url: string
  }
}

export default function SharedMaterialsPage() {
  const [materials, setMaterials] = useState<SharedMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('shared-with-me')

  useEffect(() => {
    fetchMaterials()
  }, [filter])

  const fetchMaterials = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/materials/list?filter=${filter}`)
      const data = await response.json()
      
      if (response.ok) {
        setMaterials(data.materials || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error('Failed to load shared materials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (id: string) => {
    try {
      const response = await fetch('/api/materials/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId: id })
      })

      if (!response.ok) throw new Error('Failed to save')
      
      toast.success('Saved successfully')
      
      // Update local state
      setMaterials(materials.map(m => m.id === id ? { ...m, saved: true } : m))
    } catch (error) {
      toast.error('Error saving material')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen className="h-5 w-5 text-blue-500" />
      case 'flashcard_deck': return <Layers className="h-5 w-5 text-purple-500" />
      case 'video_list': return <Video className="h-5 w-5 text-red-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Shared Materials</h2>
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Search materials..." 
            className="w-[200px] lg:w-[300px]"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex bg-muted p-1 rounded-lg w-fit">
          <button 
            onClick={() => setFilter('shared-with-me')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'shared-with-me' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Shared With Me
          </button>
          <button 
            onClick={() => setFilter('i-shared')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'i-shared' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Materials I Shared
          </button>
        </div>
        
        {filter === 'shared-with-me' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : materials.length === 0 ? (
              <p className="text-muted-foreground">No materials shared with you yet.</p>
            ) : (
              materials.map((item) => (
                <MaterialCard 
                  key={item.id} 
                  item={item} 
                  onSave={handleSave} 
                  isOwner={false}
                />
              ))
            )}
          </div>
        </div>
        )}

        {filter === 'i-shared' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : materials.length === 0 ? (
              <p className="text-muted-foreground">You haven't shared any materials yet.</p>
            ) : (
              materials.map((item) => (
                <MaterialCard 
                  key={item.id} 
                  item={item} 
                  isOwner={true}
                />
              ))
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )

  function MaterialCard({ item, onSave, isOwner }: { item: SharedMaterial, onSave?: (id: string) => void, isOwner: boolean }) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center gap-2">
              {getIcon(item.content_type)}
              <span className="capitalize">{item.content_type.replace('_', ' ')}</span>
            </div>
          </CardTitle>
          <div className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
            {item.share_scope}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold mt-2 truncate">{item.title}</div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          
          {!isOwner && item.profiles && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Shared by {item.profiles.full_name}</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            Shared on {new Date(item.created_at).toLocaleDateString()}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open
          </Button>
          {!isOwner && (
            item.saved ? (
              <Button variant="secondary" size="sm" disabled>
                Saved
              </Button>
            ) : (
              <Button size="sm" className="gap-2" onClick={() => onSave?.(item.id)}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            )
          )}
        </CardFooter>
      </Card>
    )
  }
}
