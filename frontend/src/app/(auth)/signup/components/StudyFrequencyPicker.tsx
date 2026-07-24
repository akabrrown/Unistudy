'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar, CalendarCheck, Clock, Sun, Shuffle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const frequencies = [
  { id: 'daily', label: 'Daily', icon: Sun },
  { id: 'weekdays', label: 'Weekdays', icon: Calendar },
  { id: 'weekends', label: 'Weekends', icon: CalendarCheck },
  { id: 'custom', label: 'Custom', icon: Shuffle },
  { id: 'flexible', label: 'Flexible', icon: Clock },
]

export function StudyFrequencyPicker() {
  const [selected, setSelected] = useState<string>('')
  const [hours, setHours] = useState<string>('2')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Study Frequency</Label>
        <Select value={selected} onValueChange={(val: any) => setSelected(val || '')}>
          <SelectTrigger className="w-full bg-background/50">
            <SelectValue placeholder="Select how often you study" />
          </SelectTrigger>
          <SelectContent>
            {frequencies.map((freq) => {
              const Icon = freq.icon
              return (
                <SelectItem key={freq.id} value={freq.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{freq.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" name="study_frequency" value={selected} required />

      {selected && selected !== 'flexible' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Label htmlFor="study_hours_per_session">Average Study Hours Per Session</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="study_hours_per_session"
              name="study_hours_per_session"
              type="number" 
              min="1" 
              max="12"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-24 bg-background/50"
              required
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>
      )}
      
      {selected === 'flexible' && (
        <input type="hidden" name="study_hours_per_session" value="0" />
      )}
    </div>
  )
}
