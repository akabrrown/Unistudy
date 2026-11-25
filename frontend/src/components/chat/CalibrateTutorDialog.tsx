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
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
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
    desc: 'Builds confidence and breaks tough chapters into steady, achievable steps.',
    sampleAcademic:
      'Solid progress. Let us examine the IAS 2 net realizable value rule on Slide 14 step by step.',
    sampleCasual:
      "You're making steady progress. Let's break down Slide 14 together one piece at a time.",
  },
  {
    id: 'curious',
    label: 'Socratic & Questioning',
    icon: Compass,
    desc: 'Asks guiding questions so you work out concepts yourself before seeing the answer.',
    sampleAcademic:
      'Before checking the solution: when market prices fall below cost on Slide 4, how does inventory valuation adjust?',
    sampleCasual:
      'Hold on before peeking at the answer: look at Slide 4—what happens when selling price drops below cost?',
  },
  {
    id: 'strict',
    label: 'Exam-Strict',
    icon: Scale,
    desc: 'Holds your definitions, workings, and citations to full UPSA marking-scheme standards.',
    sampleAcademic:
      'Your definition omits two required elements. On UPSA papers, state both the statutory rule and exception for full marks.',
    sampleCasual:
      'Careful—mixing up those two terms costs marks on the final paper. Here is the exact distinction examiners look for.',
  },
  {
    id: 'empathetic',
    label: 'Calm & Patient',
    icon: Smile,
    desc: 'Unpacks dense quantitative or legal topics slowly without overwhelming you.',
    sampleAcademic:
      'Take your time with this derivation. We will isolate each variable in the formula before combining them.',
    sampleCasual:
      "No rush—this formula looks dense at first, so let's unpack one variable at a time.",
  },
  {
    id: 'motivational',
    label: 'Focused & Driven',
    icon: Flame,
    desc: 'Keeps momentum brisk and goal-oriented during revision week.',
    sampleAcademic:
      'Lock down this core derivation now—it appears repeatedly across past Semester 2 papers.',
    sampleCasual:
      "Let's nail this topic now—it shows up on past papers almost every year.",
  },
  {
    id: 'neutral',
    label: 'Direct & Concise',
    icon: FileText,
    desc: 'Crisp bullet points, formulas, and definitions with zero small talk.',
    sampleAcademic:
      'Key rule: Under IAS 2, inventory write-downs reverse up to the original write-down amount when NRV recovers.',
    sampleCasual:
      'Short version: IAS 2 lets you reverse an inventory write-down if NRV recovers, capped at the original write-down.',
  },
];

export function CalibrateTutorDialog({ open, onOpenChange, onSaved }: CalibrateTutorDialogProps) {
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');
  const [tutorTone, setTutorTone] = useState<'academic' | 'casual'>('academic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchCurrentSettings = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [settingsRes, profileRes] = await Promise.all([
          supabase
            .from('user_settings')
            .select('ai_tutor_name, ai_personality, ai_tone')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('tutor_name, tutor_personality')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        const name = settingsRes.data?.ai_tutor_name || profileRes.data?.tutor_name || 'Alex';
        const personality =
          settingsRes.data?.ai_personality || profileRes.data?.tutor_personality || 'encouraging';
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

    void fetchCurrentSettings();
    return () => {
      isMounted = false;
    };
  }, [open, supabase]);

  const selectedMeta =
    PERSONALITY_TILES.find((p) => p.id === tutorPersonality) || PERSONALITY_TILES[0];

  const handleSave = async () => {
    const trimmedName = tutorName.trim() || 'Alex';
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in to save settings');
        return;
      }

      await supabase.from('user_settings').upsert({
        user_id: user.id,
        ai_tutor_name: trimmedName,
        ai_personality: tutorPersonality,
        ai_tone: tutorTone,
      });

      await supabase
        .from('profiles')
        .update({
          tutor_name: trimmedName,
          tutor_personality: tutorPersonality,
        })
        .eq('id', user.id);

      toast.success(`Tutor style updated to ${trimmedName} (${selectedMeta.label})`);

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
      toast.error('Failed to save tutor style. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border border-border/80 bg-card">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-foreground">
              Tutor Style &amp; Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose how your tutor explains lecture slides, formulas, and exam questions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-[#D89A06]" />
            <span className="text-xs">Loading preferences...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tutor_dialog_name" className="text-xs font-bold text-foreground">
                  Tutor Name
                </Label>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>Presets:</span>
                  {['Alex', 'Ama', 'Kwame', 'Sophia'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTutorName(preset)}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        tutorName === preset
                          ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Teaching Approach</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERSONALITY_TILES.map((tile) => {
                  const isSelected = tutorPersonality === tile.id;
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => setTutorPersonality(tile.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00004E]/[0.04] dark:bg-[#D89A06]/10 border-[#00004E] dark:border-[#D89A06] ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/40'
                          : 'bg-background hover:bg-muted/40 border-border/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            className={`w-3.5 h-3.5 ${
                              isSelected
                                ? 'text-[#00004E] dark:text-[#D89A06]'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <span className="text-xs font-bold text-foreground">{tile.label}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {tile.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Voice &amp; Register</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'academic' as const,
                    label: 'Academic & Formal',
                    desc: 'University terminology and exam-ready phrasing.',
                  },
                  {
                    id: 'casual' as const,
                    label: 'Clear & Conversational',
                    desc: 'Plain peer-to-peer language and everyday analogies.',
                  },
                ].map((tone) => {
                  const isSelected = tutorTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setTutorTone(tone.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00004E]/[0.04] dark:bg-[#D89A06]/10 border-[#00004E] dark:border-[#D89A06] ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/40'
                          : 'bg-background hover:bg-muted/40 border-border/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-foreground">{tone.label}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{tone.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center text-[10px] font-bold">
                    {(tutorName.charAt(0) || 'A').toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-foreground">{tutorName || 'Alex'}</span>
                  <span className="text-[11px] text-muted-foreground">· {selectedMeta.label}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {tutorTone === 'casual' ? 'Conversational' : 'Academic'}
                </span>
              </div>
              <p className="text-xs text-foreground leading-relaxed pl-7">
                &ldquo;
                {tutorTone === 'casual' ? selectedMeta.sampleCasual : selectedMeta.sampleAcademic}
                &rdquo;
              </p>
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
              'Save Preferences'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
