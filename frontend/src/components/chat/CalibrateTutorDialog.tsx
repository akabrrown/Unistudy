'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Heart,
  Compass,
  Scale,
  Smile,
  Flame,
  Bot,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
  MessageSquareQuote,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export interface CalibrateTutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: { tutor_name: string; tutor_personality: string; tutor_tone: string }) => void;
}

const PERSONALITY_TILES = [
  {
    id: 'encouraging',
    label: 'Encouraging',
    icon: Heart,
    color: 'text-rose-500',
    desc: 'Validates hard work, builds confidence, and celebrates study milestones.',
    sampleAcademic: 'Excellent effort. Every concept you master brings you closer to distinction. Let us examine this mechanism systematically.',
    sampleCasual: "Great job! You're really getting the hang of this. Let's break this slide down step by step!",
  },
  {
    id: 'curious',
    label: 'Socratic & Curious',
    icon: Compass,
    color: 'text-amber-500',
    desc: 'Asks guiding questions to stimulate deep thinking instead of spoon-feeding answers.',
    sampleAcademic: 'Consider the underlying economic rationale: when prices rise, what happens to consumer surplus along the demand curve in Slide 4?',
    sampleCasual: "Hold on, before I give you the answer: look at Slide 4. What happens to buyers when that price jumps up?",
  },
  {
    id: 'strict',
    label: 'Strict & Rigorous',
    icon: Scale,
    color: 'text-blue-500',
    desc: 'Pushes for academic precision, exact statutory definitions, and exam standard.',
    sampleAcademic: 'Your definition lacks essential statutory elements. In UPSA examinations, precision in distinguishing legal entities is mandatory.',
    sampleCasual: "Careful here: you cannot mix those two terms up. On the exam, that small slip costs points. Here is the exact distinction.",
  },
  {
    id: 'empathetic',
    label: 'Empathetic & Calm',
    icon: Smile,
    color: 'text-emerald-500',
    desc: 'Gentle and patient, designed to reduce exam anxiety and cognitive overload.',
    sampleAcademic: 'Take a calm breath. Exam stress is completely understandable. We will dissect this complex framework one clear paragraph at a time.',
    sampleCasual: "Take a deep breath, you're doing fine! This topic looks scary at first, but let's take it one simple piece at a time.",
  },
  {
    id: 'motivational',
    label: 'High Energy',
    icon: Flame,
    color: 'text-orange-500',
    desc: 'Goal-driven and energizing, keeping momentum sharp during late-night revisions.',
    sampleAcademic: 'Finals season rewards relentless preparation. Master this core derivation today and consolidate your academic standing.',
    sampleCasual: "Let's crush this! Semester exams are coming and you've got what it takes to get that A. Let's get to work!",
  },
  {
    id: 'neutral',
    label: 'Objective & Crisp',
    icon: Bot,
    color: 'text-cyan-500',
    desc: 'Concise, academic, direct bullet points without conversational fluff.',
    sampleAcademic: 'Direct analysis: The core distinction between GAAP and IFRS here governs inventory impairment reversal under IAS 2.',
    sampleCasual: 'Quick breakdown: Here are the two key differences between GAAP and IFRS on inventory without any extra fluff.',
  },
];

export function CalibrateTutorDialog({ open, onOpenChange, onSaved }: CalibrateTutorDialogProps) {
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');
  const [tutorTone, setTutorTone] = useState<'academic' | 'casual'>('academic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  // Load existing tutor settings on dialog open
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchCurrentSettings = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [settingsRes, profileRes] = await Promise.all([
          supabase.from('user_settings').select('ai_tutor_name, ai_personality, ai_tone').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('tutor_name, tutor_personality').eq('id', user.id).maybeSingle(),
        ]);

        if (!isMounted) return;

        const name = settingsRes.data?.ai_tutor_name || profileRes.data?.tutor_name || 'Alex';
        const personality = settingsRes.data?.ai_personality || profileRes.data?.tutor_personality || 'encouraging';
        const tone = (settingsRes.data?.ai_tone as 'academic' | 'casual') || 'academic';

        setTutorName(name);
        setTutorPersonality(personality);
        setTutorTone(tone);
      } catch (err) {
        console.warn('Failed to load tutor settings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCurrentSettings();
    return () => {
      isMounted = false;
    };
  }, [open, supabase]);

  const selectedMeta = PERSONALITY_TILES.find((p) => p.id === tutorPersonality) || PERSONALITY_TILES[0];

  const handleSave = async () => {
    const trimmedName = tutorName.trim() || 'Alex';
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save settings');
        return;
      }

      // 1. Sync to user_settings
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        ai_tutor_name: trimmedName,
        ai_personality: tutorPersonality,
        ai_tone: tutorTone,
      });

      // 2. Sync to profiles
      await supabase.from('profiles').update({
        tutor_name: trimmedName,
        tutor_personality: tutorPersonality,
      }).eq('id', user.id);

      toast.success(`AI Tutor updated to ${trimmedName} (${selectedMeta.label} • ${tutorTone === 'casual' ? 'Casual' : 'Academic'})`);
      
      if (onSaved) {
        onSaved({
          tutor_name: trimmedName,
          tutor_personality: tutorPersonality,
          tutor_tone: tutorTone,
        });
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update tutor settings:', err);
      toast.error('Failed to save AI Tutor settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-2 border-[#D89A06]/35 bg-card">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <DialogTitle className="text-lg font-black text-foreground">
              Calibrate AI Study Companion
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Adjust your tutor’s identity, pedagogical style, and communication tone at any time. Changes take effect on your next question.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-[#D89A06]" />
            <span className="text-xs">Loading tutor configuration...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Tutor Name & Quick Suggestions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tutor_dialog_name" className="text-xs font-bold text-foreground">
                  Companion Name
                </Label>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>Presets:</span>
                  {['Alex', 'Ama', 'Kwame', 'Sophia'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTutorName(preset)}
                      className="px-1.5 py-0.5 rounded bg-muted hover:bg-[#D89A06]/20 hover:text-[#D89A06] font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="tutor_dialog_name"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="e.g. Alex"
                className="h-10 rounded-xl bg-background border-border text-sm font-medium focus:border-[#D89A06]"
              />
            </div>

            {/* Personality Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Pedagogical Personality
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERSONALITY_TILES.map((tile) => {
                  const isSelected = tutorPersonality === tile.id;
                  const Icon = tile.icon;
                  return (
                    <div
                      key={tile.id}
                      onClick={() => setTutorPersonality(tile.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00004E]/5 dark:bg-[#D89A06]/10 border-[#D89A06] ring-1 ring-[#D89A06] shadow-xs'
                          : 'bg-background hover:bg-muted/40 border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${tile.color}`} />
                          <span className="text-xs font-bold text-foreground">{tile.label}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {tile.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Communication Tone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Communication Tone
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'academic', label: 'Academic & Scholarly', badge: 'Exam-Focused', desc: 'Formal disciplinary vocabulary, structured rigor.' },
                  { id: 'casual', label: 'Relatable & Casual', badge: 'Student-Peer', desc: 'Everyday analogies, conversational and approachable.' },
                ].map((tone) => {
                  const isSelected = tutorTone === tone.id;
                  return (
                    <div
                      key={tone.id}
                      onClick={() => setTutorTone(tone.id as 'academic' | 'casual')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00004E]/5 dark:bg-[#D89A06]/10 border-[#D89A06] ring-1 ring-[#D89A06] shadow-xs'
                          : 'bg-background hover:bg-muted/40 border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-foreground">{tone.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {tone.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Speech Preview */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FEF8E7] to-white dark:from-[#00004E]/30 dark:to-card border border-[#D89A06]/40 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    {tutorName.charAt(0) || 'A'}
                  </span>
                  <span className="text-xs font-bold text-[#00004E] dark:text-white">
                    {tutorName}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#D89A06]/15 text-[#D89A06] font-bold">
                    {selectedMeta.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                  {tutorTone === 'casual' ? '💬 Casual' : '🎓 Academic'}
                </span>
              </div>
              <div className="rounded-xl rounded-tl-xs p-2.5 bg-white dark:bg-card border border-border/80 text-xs text-foreground leading-relaxed shadow-2xs">
                &ldquo;{tutorTone === 'casual' ? selectedMeta.sampleCasual : selectedMeta.sampleAcademic}&rdquo;
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 px-4 rounded-xl border-border text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-9 px-5 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-xs shadow-sm transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Persona'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
