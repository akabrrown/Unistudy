'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { completeOnboarding } from './actions'

export function OnboardingForm() {
  const [step, setStep] = useState(1)

  return (
    <Card className="w-full max-w-lg shadow-xl shadow-primary/5 border-primary/20 bg-card/80 backdrop-blur-sm">
      <form action={completeOnboarding}>
        <div className="relative h-[450px] overflow-hidden">
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
                  <CardTitle className="text-2xl font-bold">Your Studies</CardTitle>
                  <CardDescription>Tell us what you're studying so we can tailor your experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="university">University</Label>
                    <Input id="university" name="university" placeholder="e.g. Oxford University" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="degree">Degree / Course</Label>
                    <Input id="degree" name="degree" placeholder="e.g. Computer Science" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_study">Year of Study</Label>
                    <Select name="year_of_study" defaultValue="1">
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">First Year (Freshman)</SelectItem>
                        <SelectItem value="2">Second Year (Sophomore)</SelectItem>
                        <SelectItem value="3">Third Year (Junior)</SelectItem>
                        <SelectItem value="4">Fourth Year (Senior)</SelectItem>
                        <SelectItem value="5">Postgraduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="button" className="w-full" onClick={() => setStep(2)}>Next Step</Button>
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
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="flex-1" onClick={() => setStep(3)}>Next Step</Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col"
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary font-bold">3</div>
                  <CardTitle className="text-2xl font-bold">Your AI Tutor</CardTitle>
                  <CardDescription>Customize your personal study companion.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="tutor_name">Tutor Name</Label>
                    <Input id="tutor_name" name="tutor_name" defaultValue="Alex" required />
                  </div>
                  <div className="space-y-3">
                    <Label>Tutor Personality</Label>
                    <RadioGroup name="tutor_personality" defaultValue="encouraging" className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value="encouraging" id="tp-encouraging" />
                        <Label htmlFor="tp-encouraging" className="text-sm cursor-pointer">Encouraging</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value="strict" id="tp-strict" />
                        <Label htmlFor="tp-strict" className="text-sm cursor-pointer">Strict</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value="socratic" id="tp-socratic" />
                        <Label htmlFor="tp-socratic" className="text-sm cursor-pointer">Socratic (Questions)</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value="direct" id="tp-direct" />
                        <Label htmlFor="tp-direct" className="text-sm cursor-pointer">Direct</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
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
