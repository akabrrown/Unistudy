'use client'

import { useState } from 'react'
import { AIPersonality } from '@/contexts/SettingsContext'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { completeOnboarding } from './actions'

export function OnboardingForm() {
  const [step, setStep] = useState(1)

  return (
    <Card className="w-full max-w-lg shadow-xl shadow-primary/5 border-primary/20 bg-card/80 backdrop-blur-sm">
      <form action={async (formData) => { await completeOnboarding(formData) }}>
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
                  <CardTitle className="text-2xl font-bold">Learning Style</CardTitle>
                  <CardDescription>How do you learn best?</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <RadioGroup name="learning_style" defaultValue="adaptive" className="gap-4">
                    <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value="adaptive" id="ls-adaptive" />
                      <Label htmlFor="ls-adaptive" className="flex-1 cursor-pointer font-medium">Adaptive (AI decides)</Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value="visual" id="ls-visual" />
                      <Label htmlFor="ls-visual" className="flex-1 cursor-pointer font-medium">Visual (Diagrams, charts)</Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value="reading" id="ls-reading" />
                      <Label htmlFor="ls-reading" className="flex-1 cursor-pointer font-medium">Reading/Writing (Text heavy)</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                  <Button type="button" onClick={() => setStep(2)}>Next Step</Button>
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
                  <div className="space-y-2">
                    <Label htmlFor="tutor_name">Tutor Name</Label>
                    <input id="tutor_name" name="tutor_name" defaultValue="Alex" required className="w-full bg-background/50 border rounded p-2" />
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
