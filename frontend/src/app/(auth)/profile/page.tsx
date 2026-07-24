'use client';

import { AvatarSelector } from '../signup/components/AvatarSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ProfilePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative py-12">
      {/* Back navigation */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      {/* Subtle radial gradient background for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-background to-background -z-10" />

      <Card className="w-full max-w-xl shadow-2xl shadow-primary/10 border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center mb-2">
            <img src="/logo.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain dark:hidden" />
            <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-12 w-auto object-contain hidden dark:block" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Edit your personal details and choose an avatar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6">
            {/* Avatar selector – now lives on the profile page */}
            <div className="flex justify-center mb-4">
              <AvatarSelector />
            </div>

            {/* Example profile fields – extend as needed */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" placeholder="Jane Doe" className="bg-background/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" name="email" placeholder="jane@example.com" className="bg-background/50" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white"
            >
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
