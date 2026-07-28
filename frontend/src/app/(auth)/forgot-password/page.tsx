'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const OTP_LENGTH = 6

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Step 1: Request Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')
    const supabase = createClient()
    
    // Supabase will send a 'recovery' email
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setStep(2)
    setLoading(false)
  }

  // Step 2: Verify OTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    setError('')
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code.')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    // Verify the OTP code for recovery
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // OTP verified, user is now logged in to a temporary session
    setStep(3)
    setLoading(false)
  }

  // Step 3: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setStep(4)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative py-12">
      <Link href="/login" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        Back to Login
      </Link>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-background to-background -z-10" />
      
      <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-primary/20 bg-card/80 backdrop-blur-sm mt-12 md:mt-0">
        
        {step === 1 && (
          <>
            <CardHeader className="space-y-4 text-center pb-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your email address and we'll send you a code to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50" 
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={loading || !email} className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Code'}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="space-y-4 text-center pb-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Check your email</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter the 6-digit code we sent to <br />
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-10 sm:h-14 sm:w-12 rounded-lg border-2 border-border bg-background/50 text-center text-xl font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                ))}
              </div>
              {error && <p className="text-sm text-center text-destructive">{error}</p>}
              <Button onClick={handleVerifyOtp} disabled={loading || otp.join('').length !== OTP_LENGTH} className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 text-white">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify Code'}
              </Button>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="space-y-4 text-center pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Create New Password</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your code was verified. Please enter a new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInput 
                    id="newPassword" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background/50" 
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={loading || newPassword.length < 6} className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 text-white">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 4 && (
          <CardContent className="space-y-6 pt-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Password Reset</h3>
              <p className="text-muted-foreground">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
            </div>
            <Button onClick={() => router.replace('/login')} className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 text-white">
              Go to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
