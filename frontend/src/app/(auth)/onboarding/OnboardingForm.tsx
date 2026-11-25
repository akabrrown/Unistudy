'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeOnboarding } from './actions';
import { InstitutionSelect } from './components/InstitutionSelect';
import { ProgrammeOfStudyInput } from './components/ProgrammeOfStudyInput';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { formatAcademicLevel } from '@/lib/utils';
import { useAppReducedMotion, SPRING_FLUID } from '@/lib/motion';
import {
  getProgrammeDetails,
  getProgressionLevelsForProgramme,
  UPSA_INSTITUTION,
} from '@/lib/constants/upsa';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Heart,
  Compass,
  Scale,
  Smile,
  Flame,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingFormProps {
  studentName?: string;
  userEmail?: string;
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
    desc: 'Holds your definitions, workings, and statutory citations to full UPSA marking-scheme standards.',
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

export function OnboardingForm({ studentName = 'UPSA Scholar', userEmail = '' }: OnboardingFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currentProgramme, setCurrentProgramme] = useState('');
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');
  const [tutorTone, setTutorTone] = useState<'academic' | 'casual'>('academic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reducedMotion = useAppReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const isHydratedRef = useRef(false);
  const STORAGE_KEY = `unistudy_onboarding_draft_${(userEmail || 'guest').toLowerCase().trim()}`;

  // 3D pointer tilt for Step 3 Scholar Pass
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, SPRING_FLUID);
  const smoothY = useSpring(pointerY, SPRING_FLUID);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);

  const [academicData, setAcademicData] = useState({
    institution_id: UPSA_INSTITUTION.id,
    faculty: 'FITCS',
    department: 'Department of Information Technology Studies',
    degree_programme: '',
    year_of_study: '100',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isExpired = parsed.savedAt && Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000;
        if (!isExpired) {
          if (parsed.step && [1, 2, 3].includes(parsed.step)) {
            setStep(parsed.step as 1 | 2 | 3);
          }
          if (parsed.academicData && typeof parsed.academicData === 'object') {
            setAcademicData((prev) => ({ ...prev, ...parsed.academicData }));
          }
          if (parsed.currentProgramme) {
            setCurrentProgramme(parsed.currentProgramme);
          }
          if (parsed.tutorName) {
            setTutorName(parsed.tutorName);
          }
          if (parsed.tutorPersonality) {
            setTutorPersonality(parsed.tutorPersonality);
          }
          if (parsed.tutorTone) {
            setTutorTone(parsed.tutorTone);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('[Onboarding] Could not restore draft:', err);
    } finally {
      isHydratedRef.current = true;
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!isHydratedRef.current || isSubmitting) return;
    try {
      const draft = {
        step,
        academicData,
        currentProgramme,
        tutorName,
        tutorPersonality,
        tutorTone,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    step,
    academicData,
    currentProgramme,
    tutorName,
    tutorPersonality,
    tutorTone,
    isSubmitting,
    STORAGE_KEY,
  ]);

  const handleProceedToTutor = () => {
    if (!academicData.degree_programme.trim()) {
      toast.error('Please enter or select your UPSA degree programme');
      return;
    }
    setStep(2);
  };

  const handleProceedToPass = () => {
    if (!tutorName.trim()) {
      toast.error('Please name your study tutor');
      return;
    }
    setStep(3);
  };

  const handlePassPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(nx);
    pointerY.set(ny);
  };

  const handlePassPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const selectedPersonalityMeta =
    PERSONALITY_TILES.find((p) => p.id === tutorPersonality) || PERSONALITY_TILES[0];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Visual Stepper Header (Completed steps clickable) ── */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          {[
            { num: 1 as const, title: 'Programme & Level', icon: GraduationCap },
            { num: 2 as const, title: 'Tutor Style', icon: BookOpen },
            { num: 3 as const, title: 'Student Pass', icon: ShieldCheck },
          ].map((s, idx) => {
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isCompleted || isSubmitting}
                  onClick={() => {
                    if (isCompleted) setStep(s.num);
                  }}
                  className={`flex items-center gap-2.5 text-left rounded-xl p-1 transition-colors ${
                    isCompleted ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] ring-2 ring-[#D89A06]/35'
                        : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground tabular-nums">
                      Step {s.num}
                    </div>
                    <div
                      className={`text-xs font-bold truncate max-w-[130px] ${
                        isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {s.title}
                    </div>
                  </div>
                </button>
                {idx < 2 && (
                  <div
                    className={`w-8 sm:w-14 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors ${
                      isCompleted ? 'bg-[#D89A06]' : 'bg-border/60'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Step Card ── */}
      <Card className="shadow-lg border-border/60 bg-card overflow-hidden">
        <form
          ref={formRef}
          action={async (formData) => {
            setIsSubmitting(true);
            try {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                // Ignore storage error
              }
              await completeOnboarding(formData);
            } catch (err) {
              console.error('Onboarding error', err);
              setIsSubmitting(false);
            }
          }}
        >
          {/* Hidden inputs to preserve server-action contract */}
          <input type="hidden" name="institution_id" value={academicData.institution_id} />
          <input type="hidden" name="faculty" value={academicData.faculty} />
          <input type="hidden" name="department" value={academicData.department} />
          <input type="hidden" name="degree_programme" value={academicData.degree_programme} />
          <input type="hidden" name="year_of_study" value={academicData.year_of_study} />
          <input type="hidden" name="university" value="University of Professional Studies, Accra" />
          <input type="hidden" name="learning_style" value="adaptive" />
          <input type="hidden" name="tutor_name" value={tutorName} />
          <input type="hidden" name="tutor_personality" value={tutorPersonality} />
          <input type="hidden" name="tutor_tone" value={tutorTone} />

          <div className="relative p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* ── STEP 1: Academic Enrollment ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={reducedMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#00004E] dark:text-[#D89A06] font-semibold">
                      University of Professional Studies, Accra
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Select Your Programme &amp; Level
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Match your workspace to your UPSA faculty, department, and current academic level.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <ProgrammeOfStudyInput
                      value={academicData.degree_programme}
                      initialValue={academicData.degree_programme}
                      includeHiddenInputs={false}
                      onProgrammeChange={(name, department, facultyCode) => {
                        setCurrentProgramme(name);
                        const details = getProgrammeDetails(name);
                        const fac = facultyCode || details?.facultyCode || academicData.faculty;
                        const dept = department || details?.department || academicData.department;
                        const progressionLevels = getProgressionLevelsForProgramme(name);
                        const currentLevelNum = Number(academicData.year_of_study) || 100;
                        const levelStillValid = progressionLevels.some(
                          (l) => l.value === currentLevelNum
                        );
                        const updatedLevel = levelStillValid
                          ? academicData.year_of_study
                          : String(progressionLevels[0]?.value || 100);

                        setAcademicData((prev) => ({
                          ...prev,
                          degree_programme: name,
                          department: dept,
                          faculty: fac,
                          year_of_study: updatedLevel,
                        }));
                      }}
                    />

                    <InstitutionSelect
                      selectedProgramme={academicData.degree_programme}
                      initialFaculty={academicData.faculty}
                      initialLevel={Number(academicData.year_of_study) || 100}
                      includeHiddenInputs={false}
                      onLevelChange={(lvl) => {
                        setAcademicData((prev) => ({
                          ...prev,
                          year_of_study: String(lvl),
                        }));
                      }}
                      onFacultyChange={(fac, dept) => {
                        setAcademicData((prev) => ({
                          ...prev,
                          faculty: fac,
                          department: dept || prev.department,
                        }));
                      }}
                    />
                  </div>

                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleProceedToTutor}
                      className="h-11 px-6 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                    >
                      <span>Continue to Tutor Style</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Study Tutor Preferences ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={reducedMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#00004E] dark:text-[#D89A06] font-semibold">
                      Personal Study Tutor
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Set Up Your Study Tutor
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Choose how your tutor explains lecture slides, formulas, and past exam questions.
                    </p>
                  </div>

                  {/* Tutor Name & Quick Suggestions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tutor_name_input" className="text-xs font-semibold text-foreground">
                        Tutor Name
                      </Label>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Presets:</span>
                        {['Alex', 'Ama', 'Kwame', 'Sophia'].map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setTutorName(sugg)}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${
                              tutorName === sugg
                                ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {sugg}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      id="tutor_name_input"
                      value={tutorName}
                      onChange={(e) => setTutorName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="h-11 rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20 transition-all text-sm font-medium"
                    />
                  </div>

                  {/* Tutor Personality Selector Tiles */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-foreground">Teaching Approach</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PERSONALITY_TILES.map((tile) => {
                        const isSelected = tutorPersonality === tile.id;
                        const Icon = tile.icon;
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            onClick={() => setTutorPersonality(tile.id)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#00004E]/[0.04] dark:bg-[#D89A06]/10 border-[#00004E] dark:border-[#D89A06] ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/40'
                                : 'bg-background hover:bg-muted/40 border-border/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Icon
                                  className={`w-4 h-4 ${
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
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {tile.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Communication Tone Selector */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-foreground">Voice &amp; Register</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          id: 'academic' as const,
                          label: 'Academic & Formal',
                          desc: 'University terminology, formal structure, and exam-ready phrasing.',
                        },
                        {
                          id: 'casual' as const,
                          label: 'Clear & Conversational',
                          desc: 'Plain peer-to-peer language and everyday analogies.',
                        },
                      ].map((t) => {
                        const isSelected = tutorTone === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTutorTone(t.id)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#00004E]/[0.04] dark:bg-[#D89A06]/10 border-[#00004E] dark:border-[#D89A06] ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/40'
                                : 'bg-background hover:bg-muted/40 border-border/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-foreground">{t.label}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{t.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Sample Response Preview */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center text-[10px] font-bold">
                          {(tutorName.charAt(0) || 'A').toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-foreground">{tutorName || 'Alex'}</span>
                        <span className="text-[11px] text-muted-foreground">
                          · {selectedPersonalityMeta.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {tutorTone === 'casual' ? 'Conversational' : 'Academic'}
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed pl-8">
                      &ldquo;
                      {tutorTone === 'casual'
                        ? selectedPersonalityMeta.sampleCasual
                        : selectedPersonalityMeta.sampleAcademic}
                      &rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-11 px-5 rounded-xl border-border hover:bg-muted"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      <span>Back</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleProceedToPass}
                      className="h-11 px-6 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                    >
                      <span>Review Student Pass</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Tactile 3D Scholar Pass Review & Launch ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={reducedMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                      Ready to Launch
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Your UPSA Student Pass
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Confirm your programme and tutor setup before opening your dashboard.
                    </p>
                  </div>

                  {/* Interactive 3D Pointer-Tilt Collegiate Student Pass */}
                  <div style={{ perspective: 1000 }}>
                    <motion.div
                      onPointerMove={handlePassPointerMove}
                      onPointerLeave={handlePassPointerLeave}
                      style={
                        reducedMotion
                          ? undefined
                          : {
                              rotateX,
                              rotateY,
                              transformStyle: 'preserve-3d',
                            }
                      }
                      className="relative rounded-2xl bg-[#00004E] text-white p-6 border border-[#D89A06]/50 shadow-xl overflow-hidden select-none"
                    >
                      <div
                        className="absolute inset-0 opacity-[0.06] pointer-events-none"
                        style={{
                          backgroundImage: 'radial-gradient(#D89A06 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      />
                      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D89A06]/15 blur-2xl pointer-events-none" />

                      <div className="relative z-10 flex items-center justify-between border-b border-white/12 pb-4 mb-4">
                        <div className="flex items-center gap-2.5">
                          <UniStudyLogo
                            variant="icon"
                            themeMode="dark"
                            height={28}
                            className="shrink-0"
                            alt="UniStudy Crest"
                          />
                          <div>
                            <div className="text-xs font-black tracking-wider uppercase text-white">
                              UniStudy · Student Pass
                            </div>
                            <div className="text-[10px] text-white/65">
                              University of Professional Studies, Accra
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/35">
                          Verified
                        </span>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-[10px] text-white/60 font-mono uppercase block">
                            Student Name
                          </span>
                          <span className="text-sm font-bold text-white block truncate">
                            {studentName}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-white/60 font-mono uppercase block">
                            Level
                          </span>
                          <span className="text-sm font-bold text-[#D89A06] tabular-nums block">
                            {formatAcademicLevel(
                              academicData.year_of_study,
                              academicData.degree_programme
                            )}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-[10px] text-white/60 font-mono uppercase block">
                            Degree Programme
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-white block">
                            {academicData.degree_programme || 'UPSA Degree Programme'}
                          </span>
                          {academicData.department && (
                            <span className="text-[11px] text-white/70 block mt-0.5">
                              {academicData.department}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] text-white/60 font-mono uppercase block">
                            Study Tutor
                          </span>
                          <span className="text-xs font-bold text-white block">
                            {tutorName} · {selectedPersonalityMeta.label}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-white/60 font-mono uppercase block">
                            Starter Credits
                          </span>
                          <span className="text-xs font-bold text-emerald-300 tabular-nums block">
                            20 Study Credits
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                      className="h-11 px-5 rounded-xl border-border hover:bg-muted"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      <span>Back</span>
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 px-7 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-md transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening Workspace...</span>
                        </>
                      ) : (
                        <>
                          <span>Enter Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </Card>
    </div>
  );
}
