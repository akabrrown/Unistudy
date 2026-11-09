'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/rateLimiter'

const LoginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
});

const SignupSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Full name cannot exceed 100 characters'),
});

async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  } catch (e) {
    // If headers are unavailable, return fallback
  }
  return 'unknown_client';
}

async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'UniStudy-Security-Audit' },
    });
    if (!response.ok) return false;
    
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(':');
      if (lineSuffix.trim() === suffix) {
        // Require at least 100 occurrences to avoid false positives for randomly generated passwords
        if (parseInt(countStr.trim(), 10) >= 100) {
          return true;
        }
      }
    }
  } catch (e) {
    console.error('Error checking password leak:', e);
  }
  return false;
}

export async function login(formData: FormData) {
  const ip = await getClientIp();
  const rawEmail = (formData.get('email') as string) || '';
  const rateLimitKey = `auth:login:${ip}:${rawEmail.toLowerCase()}`;
  
  // Rate limit: 5 login attempts per 15 minutes
  const rateCheck = await checkRateLimit(rateLimitKey, { limit: 5, windowSeconds: 15 * 60 });
  if (!rateCheck.success) {
    redirect('/login?error=Too many login attempts. Please wait 15 minutes before trying again.');
  }

  const parseResult = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Invalid email or password format';
    redirect(`/login?error=${encodeURIComponent(errorMsg)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parseResult.data.email,
    password: parseResult.data.password,
  });

  if (error) {
    redirect('/login?error=Invalid email or password');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const ip = await getClientIp();
  const signupRateKey = `auth:signup:${ip}`;
  
  // Rate limit: 5 signups per 15 minutes per IP
  const rateCheck = await checkRateLimit(signupRateKey, { limit: 5, windowSeconds: 15 * 60 });
  if (!rateCheck.success) {
    redirect('/signup?error=Too many accounts created from this network. Please wait 15 minutes.');
  }

  const parseResult = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
    fullName: formData.get('fullName'),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Please check your input details.';
    redirect(`/signup?error=${encodeURIComponent(errorMsg)}`);
  }

  const { email, password, username, fullName } = parseResult.data;

  // Server-side username uniqueness check (bypassing RLS with service role)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existingUser, error: checkError } = await adminSupabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking username:', checkError);
  }

  if (existingUser) {
    redirect(`/signup?error=Username '${encodeURIComponent(username)}' is already taken. Please choose another.`);
  }

  const isLeaked = await isPasswordLeaked(password);
  if (isLeaked) {
    redirect(`/signup?error=This password has appeared in a known data breach. Please choose a different, more secure password.`);
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
      },
    },
  });

  if (error) {
    const errorMsg = typeof error.message === 'string' ? error.message : 'Signup failed. Please try again.';
    redirect(`/signup?error=${encodeURIComponent(errorMsg)}`);
  }

  // Refresh materialized view safely
  try {
    await supabase.rpc('refresh_institution_student_counts');
  } catch (e) {
    console.error(e);
  }

  // Trigger initial planner generation in the background
  if (authData?.user?.id) {
    try {
      await adminSupabase.from('profiles').update({
        username,
        full_name: fullName,
      }).eq('id', authData.user.id);
      
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/planner/generate-initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      }).catch(err => console.error('Failed to trigger planner generation:', err));
    } catch (e) {
      console.error('Error triggering planner:', e);
    }
  }

  revalidatePath('/', 'layout');
  
  if (authData?.session) {
    // Instant session established
    redirect('/onboarding');
  } else {
    // Email verification link sent
    redirect('/login?message=Please check your email for the confirmation link to sign in.');
  }
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
