'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Trash2, Loader2, BookOpen, Clock, FileWarning } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'assignment' | 'session';
}

const TYPE_CONFIG = {
  exam: { icon: FileWarning, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  assignment: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  session: { icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Event State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', type: 'exam' as any });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !selectedDate) return;
    
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, date: selectedDate })
      });
      if (!res.ok) throw new Error('Failed to add');
      
      const data = await res.json();
      setEvents([...events, data.event]);
      setIsAdding(false);
      setNewEvent({ title: '', type: 'exam' });
      toast.success('Event added to calendar');
    } catch (e) {
      toast.error('Could not add event');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== id));
      toast('Event removed');
    } catch (e) {
      toast.error('Could not delete');
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const todayDateString = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <CalendarIcon className="w-8 h-8" /> Study Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Plan your semester, track exams, and schedule study sessions.</p>
        </div>
        <Button onClick={() => { setSelectedDate(todayDateString); setIsAdding(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      {isAdding && (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 rounded-md border border-border bg-background" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" placeholder="e.g. Midterm Math Exam" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full p-2 rounded-md border border-border bg-background" />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} className="w-full p-2 rounded-md border border-border bg-background">
              <option value="exam">Exam</option>
              <option value="assignment">Assignment</option>
              <option value="session">Study Session</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddEvent}>Save</Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={today}>Today</Button>
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-muted p-2 text-center text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
          
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-card min-h-[120px]" />;
            
            // Note: Months in ISO strings are 0-indexed in JS date, but output correctly with logic below
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayDateString;
            const dayEvents = events.filter(e => e.date === dateStr);

            return (
              <div 
                key={dateStr} 
                className={`bg-card min-h-[120px] p-2 transition-colors hover:bg-subtle/50 group cursor-pointer ${isToday ? 'bg-primary/5' : ''}`}
                onClick={() => { setSelectedDate(dateStr); setIsAdding(true); }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {dayEvents.map(event => {
                    const config = TYPE_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <div 
                        key={event.id}
                        className={`text-xs p-1.5 rounded-md border flex items-center justify-between group/event ${config.bg} ${config.border} ${config.color}`}
                        title={event.title}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                          className="opacity-0 group-hover/event:opacity-100 hover:text-red-600 transition-opacity p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
