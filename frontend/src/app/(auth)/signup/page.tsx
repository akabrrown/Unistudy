import Link from 'next/link'
import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft } from 'lucide-react'

import { EmailField } from './components/EmailField'
import { UsernameField } from './components/UsernameField'
import { PasswordStrengthField } from './components/PasswordStrengthField'
import { FullNameField } from './components/FullNameField' // Force TS re-evaluation

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative py-12">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        Back to Home
      </Link>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-background to-background -z-10" />
      <Card className="w-full max-w-xl shadow-2xl shadow-primary/10 border-primary/20 bg-card/80 backdrop-blur-sm mt-12 md:mt-0">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center mb-2">
            <img src="/logo.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain dark:hidden" />
            <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain hidden dark:block" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Create an Account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Join UniStudy AI and transform your learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} autoComplete="off" className="space-y-6">


            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UsernameField />
                <FullNameField />
              </div>
              <EmailField />
            </div>

            <PasswordStrengthField />

            <div className="border-t border-border pt-4">
              {searchParams?.error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md mb-4">
                  {searchParams.error}
                </div>
              )}

              <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white">
                Sign Up
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
