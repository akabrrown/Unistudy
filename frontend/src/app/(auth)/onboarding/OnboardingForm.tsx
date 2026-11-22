'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeOnboarding } from './actions';
import { InstitutionSelect } from './components/InstitutionSelect';
import { ProgrammeOfStudyInput } from './components/ProgrammeOfStudyInput';
import { formatAcademicLevel } from '@/lib/utils';
import { getProgrammeDetails } from '@/lib/constants/upsa';
import { 
  GraduationCap, 
  BrainCircuit, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Heart, 
  Compass, 
  Scale, 
  Smile, 
  Flame, 
  Bot,
  Loader2
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
    color: 'text-rose-500',
    desc: 'Validates your hard work, builds confidence, and celebrates your study milestones.',
    sample: 'Great start! Every concept you master brings you closer to an A. Let us break this down together.',
  },
  {
    id: 'curious',
    label: 'Socratic & Curious',
    icon: Compass,
    color: 'text-amber-500',
    desc: 'Asks guiding questions to stimulate deep thinking instead of spoon-feeding answers.',
    sample: 'What do you think happens to consumer surplus when prices rise? Look at the demand curve in slide 4.',
  },
  {
    id: 'strict',
    label: 'Strict & Rigorous',
    icon: Scale,
    color: 'text-blue-500',
    desc: 'Pushes for academic precision, exact legal/financial definitions, and exam standard.',
    sample: 'Your definition misses key statutory elements. In UPSA exams, precision earns the distinction.',
  },
  {
    id: 'empathetic',
    label: 'Empathetic & Calm',
    icon: Smile,
    color: 'text-emerald-500',
    desc: 'Gentle and patient, designed to reduce exam anxiety and cognitive overload.',
    sample: 'Take a breath. Exam stress is normal. Let us take this topic one small paragraph at a time.',
  },
  {
    id: 'motivational',
    label: 'High Energy',
    icon: Flame,
    color: 'text-orange-500',
    desc: 'Goal-driven and energizing, keeping your momentum sharp during late-night revisions.',
    sample: 'Finals are coming up and you have the work ethic to dominate this course. Let us get to work!',
  },
  {
    id: 'neutral',
    label: 'Objective & Crisp',
    icon: Bot,
    color: 'text-cyan-500',
    desc: 'Concise, academic, direct bullet points without conversational fluff.',
    sample: 'Direct answer: The key difference between GAAP and IFRS here lies in inventory impairment rules.',
  },
];

export function OnboardingForm({ studentName = 'UPSA Scholar', userEmail = '' }: OnboardingFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currentProgramme, setCurrentProgramme] = useState('');
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const [academicData, setAcademicData] = useState({
    institution_id: '',
    faculty: 'FITCS',
    department: 'Department of Information Technology Studies',
    degree_programme: '',
    year_of_study: '100',
  });

  // Step 1 -> Step 2 validation
  const handleProceedToTutor = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const inst = (formData.get('institution_id') as string) || '';
      const prog = (formData.get('degree_programme') as string) || '';
      const lvl = (formData.get('year_of_study') as string) || '100';

      if (!prog.trim()) {
        toast.error('Please enter or select your UPSA degree programme');
        return;
      }

      const details = getProgrammeDetails(prog);
      const fac = (formData.get('faculty') as string) || details?.facultyCode || 'FAF';
      const dept = (formData.get('department') as string) || details?.department || '';

      setAcademicData({
        institution_id: inst,
        faculty: fac,
        department: dept,
        degree_programme: prog,
        year_of_study: lvl,
      });
      setStep(2);
    }
  };

  // Step 2 -> Step 3 validation
  const handleProceedToPass = () => {
    if (!tutorName.trim()) {
      toast.error('Please name your AI Study Companion');
      return;
    }
    setStep(3);
  };

  const selectedPersonalityMeta =
    PERSONALITY_TILES.find((p) => p.id === tutorPersonality) || PERSONALITY_TILES[0];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Visual Stepper Header ── */}
      <div className="bg-card/70 backdrop-blur-md border border-[#D89A06]/20 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Academic Profile', icon: GraduationCap },
            { num: 2, title: 'AI Companion', icon: BrainCircuit },
            { num: 3, title: 'Scholar Pass', icon: ShieldCheck },
          ].map((s, idx) => {
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] ring-2 ring-[#D89A06]/40 shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Step {s.num}
                  </div>
                  <div
                    className={`text-xs font-bold truncate max-w-[120px] ${
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.title}
                  </div>
                </div>
                {idx < 2 && (
                  <div className="w-8 sm:w-16 h-0.5 bg-border/60 mx-1 sm:mx-2 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Step Card ── */}
      <Card className="shadow-2xl shadow-[#00004E]/5 border-[#D89A06]/20 bg-card/90 backdrop-blur-md overflow-hidden">
        <form
          ref={formRef}
          action={async (formData) => {
            setIsSubmitting(true);
            try {
              await completeOnboarding(formData);
            } catch (err) {
              console.error('Onboarding error', err);
              setIsSubmitting(false);
            }
          }}
        >
          {/* Hidden inputs to preserve data across all steps */}
          <input type="hidden" name="institution_id" value={academicData.institution_id} />
          <input type="hidden" name="faculty" value={academicData.faculty} />
          <input type="hidden" name="department" value={academicData.department} />
          <input type="hidden" name="degree_programme" value={academicData.degree_programme} />
          <input type="hidden" name="year_of_study" value={academicData.year_of_study} />
          <input type="hidden" name="university" value="University of Professional Studies, Accra" />
          <input type="hidden" name="learning_style" value="adaptive" />
          <input type="hidden" name="tutor_name" value={tutorName} />
          <input type="hidden" name="tutor_personality" value={tutorPersonality} />

          <div className="relative p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* ── STEP 1: Academic Enrollment ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] text-[11px] font-bold">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>University of Professional Studies, Accra (UPSA)</span>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      UPSA Academic Enrollment
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Select your Faculty, Department, and Degree major to tailor lecture slide indexing and past question decks.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <ProgrammeOfStudyInput
                      onProgrammeChange={(name, department, facultyCode) => {
                        setCurrentProgramme(name);
                        const details = getProgrammeDetails(name);
                        setAcademicData((prev) => ({
                          ...prev,
                          degree_programme: name,
                          department: department || details?.department || prev.department,
                          faculty: facultyCode || details?.facultyCode || prev.faculty,
                        }));
                      }}
                    />

                    <InstitutionSelect selectedProgramme={currentProgramme} />
                  </div>

                  <div className="pt-4 border-t border-border/60 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleProceedToTutor}
                      className="h-11 px-6 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                    >
                      <span>Continue to AI Companion</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: AI Study Companion ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] text-[11px] font-bold">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Personalized Socratic AI</span>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Calibrate Your AI Study Companion
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Customize how your tutor communicates when breaking down complex semester slides and marking essays.
                    </p>
                  </div>

                  {/* Tutor Name & Quick Suggestions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tutor_name_input" className="text-xs font-semibold text-foreground">
                        Tutor Name
                      </Label>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Suggestions:</span>
                        {['Alex', 'Ama', 'Kwame', 'Sophia'].map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setTutorName(sugg)}
                            className="px-1.5 py-0.5 rounded bg-muted hover:bg-[#D89A06]/15 hover:text-[#D89A06] font-medium transition-colors"
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
                    <Label className="text-xs font-semibold text-foreground">
                      Tutoring Personality &amp; Tone
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PERSONALITY_TILES.map((tile) => {
                        const isSelected = tutorPersonality === tile.id;
                        const Icon = tile.icon;
                        return (
                          <div
                            key={tile.id}
                            onClick={() => setTutorPersonality(tile.id)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#00004E]/5 dark:bg-[#D89A06]/10 border-[#D89A06] ring-1 ring-[#D89A06] shadow-xs'
                                : 'bg-background hover:bg-muted/50 border-border/80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${tile.color}`} />
                                <span className="text-xs font-bold text-foreground">
                                  {tile.label}
                                </span>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {tile.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Tutor Speech Preview */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00004E] dark:text-[#D89A06]">
                      <Sparkles className="w-3 h-3" />
                      <span>Live Dialogue Preview ({tutorName}):</span>
                    </div>
                    <p className="text-xs text-foreground/90 italic leading-relaxed">
                      &ldquo;{selectedPersonalityMeta.sample}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
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
                      <span>Review Scholar Pass</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Scholar Pass Review & Launch ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-left border-b border-border/50 pb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready for Activation</span>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      Confirm Your UPSA Scholar Pass
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Review your academic configuration before entering your course workspace.
                    </p>
                  </div>

                  {/* Digital Collegiate Scholar Pass Card */}
                  <div className="relative rounded-2xl bg-gradient-to-br from-[#00004E] via-[#000038] to-[#05051C] text-white p-6 border-2 border-[#D89A06]/50 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#D89A06]/15 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#D89A06] text-[#00004E] font-black text-xs flex items-center justify-center">
                          U
                        </div>
                        <div>
                          <div className="text-xs font-black tracking-wider uppercase text-white">
                            UniStudy AI • Scholar Pass
                          </div>
                          <div className="text-[10px] text-white/60">
                            University of Professional Studies, Accra
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                        Active Scholar
                      </span>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-4 text-left">
                      <div>
                        <span className="text-[10px] text-white/60 font-mono uppercase block">
                          Scholar Name
                        </span>
                        <span className="text-sm font-bold text-white block truncate">
                          {studentName}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/60 font-mono uppercase block">
                          Academic Level
                        </span>
                        <span className="text-sm font-bold text-[#D89A06] block">
                          {formatAcademicLevel(academicData.year_of_study, academicData.degree_programme)}
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
                          <span className="text-[10px] text-white/70 block mt-0.5">
                            {academicData.department}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-white/60 font-mono uppercase block">
                          AI Study Companion
                        </span>
                        <span className="text-xs font-bold text-white block">
                          {tutorName} ({selectedPersonalityMeta.label})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/60 font-mono uppercase block">
                          Welcome Bonus
                        </span>
                        <span className="text-xs font-bold text-emerald-400 block">
                          20 Free AI Credits
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
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
                      className="h-11 px-8 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-md transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Activating Workspace...</span>
                        </>
                      ) : (
                        <>
                          <span>Activate &amp; Enter Dashboard</span>
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
