import Link from 'next/link'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
      <Card className="w-full max-w-md shadow-xl shadow-primary/5 border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="student@university.edu" required className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required className="bg-background/50" />
            </div>
            
            {searchParams?.error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {searchParams.error}
              </div>
            )}

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 pt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
