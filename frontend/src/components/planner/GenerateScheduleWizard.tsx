'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarClock, Calendar, Book, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateScheduleWizardProps {
  onSuccess: (schedule: any) => void;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning (8am - 12pm)' },
  { id: 'afternoon', label: 'Afternoon (1pm - 5pm)' },
  { id: 'evening', label: 'Evening (6pm - 10pm)' },
  { id: 'night', label: 'Night Owl (11pm - 2am)' },
];

export function GenerateScheduleWizard({ onSuccess }: GenerateScheduleWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [courses, setCourses] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'wednesday', 'friday']);
  const [coursesPerDay, setCoursesPerDay] = useState(2);
  const [slots, setSlots] = useState<{start: string, end: string}[]>([
    { start: '10:00', end: '12:00' },
    { start: '14:00', end: '16:00' }
  ]);

  const handleCoursesPerDayChange = (val: number) => {
    const newVal = Math.max(1, Math.min(6, val));
    setCoursesPerDay(newVal);
    setSlots(prev => {
      const newSlots = [...prev];
      while (newSlots.length < newVal) {
        newSlots.push({ start: '18:00', end: '20:00' });
      }
      return newSlots.slice(0, newVal);
    });
  };

  const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
    setSlots(prev => prev.map((slot, i) => i === index ? { ...slot, [field]: value } : slot));
  };

  const handleNext = () => setStep(s => Math.min(3, s + 1));
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const toggleDay = (id: string) => {
    setSelectedDays(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };


  const handleGenerate = async () => {
    if (!startDate || !endDate || !courses.trim() || selectedDays.length === 0 || slots.length === 0) {
      toast.error('Please fill in all required fields to generate a solid routine.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/planner/generate-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          courses: courses.split(',').map(c => c.trim()).filter(Boolean),
          days: selectedDays,
          coursesPerDay,
          slots
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate timetable');
      }

      const data = await res.json();
      toast.success('Your smart timetable is ready!');
      onSuccess(data.schedule);
      setOpen(false);
      
      // Reset form
      setTimeout(() => {
        setStep(1);
        setStartDate('');
        setEndDate('');
        setCourses('');
      }, 300);

    } catch (e: any) {
      toast.error(e.message || 'Something went wrong while generating the timetable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
        <CalendarClock className="w-4 h-4" />
        Generate smart timetable
      </Button>
      
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Generate your smart timetable</DialogTitle>
          <DialogDescription>
            Let AI build a realistic study routine based on your actual courses and availability.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium mb-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">1</div>
                Semester duration
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                We'll repeat your weekly routine until the end date so you're covered for the whole semester.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium mb-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">2</div>
                Current courses
              </div>
              <div className="space-y-2">
                <Label htmlFor="courses">What are you studying?</Label>
                <Input 
                  id="courses" 
                  placeholder="e.g. Data Structures, Linear Algebra, Ethics" 
                  value={courses}
                  onChange={(e) => setCourses(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Separate multiple courses with a comma. The AI will balance your study time across all of them.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">3</div>
                Your availability
              </div>
              
              <div className="space-y-3">
                <Label>Preferred study days</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={day.id} 
                        checked={selectedDays.includes(day.id)}
                        onCheckedChange={() => toggleDay(day.id)}
                      />
                      <label htmlFor={day.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Courses per study day</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number" 
                      min={1} 
                      max={6}
                      value={coursesPerDay}
                      onChange={(e) => handleCoursesPerDayChange(parseInt(e.target.value) || 1)}
                      className="w-24 text-center"
                    />
                    <span className="text-sm text-muted-foreground">sessions per day</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Daily Time Slots</Label>
                  <div className="grid gap-3">
                    {slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-3 bg-muted/30 p-2 rounded-md animate-in slide-in-from-right-4 duration-300">
                        <span className="text-xs font-semibold text-muted-foreground w-12">Slot {index + 1}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <Input 
                            type="time" 
                            value={slot.start}
                            onChange={(e) => updateSlot(index, 'start', e.target.value)}
                            className="h-8 text-sm bg-background"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input 
                            type="time" 
                            value={slot.end}
                            onChange={(e) => updateSlot(index, 'end', e.target.value)}
                            className="h-8 text-sm bg-background"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t mt-4">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} disabled={loading}>
              Back
            </Button>
          ) : (
            <div className="flex-1" /> // Spacer
          )}
          
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next step
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating schedule...
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  Generate schedule
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
