'use client'

import { useState, useRef } from 'react'
import { AIPersonality } from '@/contexts/SettingsContext'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { completeOnboarding } from './actions'
import { InstitutionSelect } from './components/InstitutionSelect'
import { ProgrammeOfStudyInput } from './components/ProgrammeOfStudyInput'
import { toast } from 'sonner'

export function OnboardingForm() {
  const [step, setStep] = useState(1)
  const formRef = useRef<HTMLFormElement>(null)
  const [academicData, setAcademicData] = useState({ institution_id: '', degree_programme: '' })

  const handleNextStep = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const inst = formData.get('institution_id') as string
      const prog = formData.get('degree_programme') as string
      
      if (!inst) {
        toast.error('Please select an institution')
        return
      }
      if (!prog) {
        toast.error('Please enter your programme of study')
        return
      }
      
      setAcademicData({ institution_id: inst, degree_programme: prog })
      setStep(2)
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl shadow-primary/5 border-primary/20 bg-card/80 backdrop-blur-sm">
      <form ref={formRef} action={async (formData) => { await completeOnboarding(formData) }}>
        
        <div className="relative h-[550px] overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col"
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary font-bold">1</div>
                  <CardTitle className="text-2xl font-bold">Academic Details</CardTitle>
                  <CardDescription>Tell us about your studies.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 pt-4">
                  <InstitutionSelect />
                  <ProgrammeOfStudyInput />
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                  <Button type="button" onClick={handleNextStep} className="w-full">Next Step</Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col"
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary font-bold">2</div>
                  <CardTitle className="text-2xl font-bold">Your AI Tutor</CardTitle>
                  <CardDescription>Customize your personal study companion.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1">
                  {/* Hidden inputs to retain data from Step 1 when it unmounts */}
                  <input type="hidden" name="institution_id" value={academicData.institution_id} />
                  <input type="hidden" name="degree_programme" value={academicData.degree_programme} />
                  
                  <input type="hidden" name="learning_style" value="adaptive" />
                  
                  <div className="space-y-2">
                    <Label htmlFor="tutor_name">Tutor Name</Label>
                    <input id="tutor_name" name="tutor_name" defaultValue="Alex" required className="w-full bg-background/50 border rounded p-2 text-foreground" />
                  </div>
                  <div className="space-y-3">
                    <Label>Tutor Personality</Label>
                    <RadioGroup name="tutor_personality" defaultValue="encouraging" className="grid grid-cols-2 gap-3">
                      {['neutral','encouraging','strict','funny','motivational','empathetic','curious'].map((p) => (
                        <div key={p} className="flex items-center space-x-2 rounded-md border p-3">
                          <RadioGroupItem value={p} id={`tp-${p}`} />
                          <Label htmlFor={`tp-${p}`} className="text-sm cursor-pointer capitalize">{p}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" className="flex-1">Complete Setup</Button>
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </Card>
  )
}
