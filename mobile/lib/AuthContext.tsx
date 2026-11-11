import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  institution_id?: string | null;
  institution_name?: string | null;
  degree_programme?: string | null;
  year_of_study?: number | null;
  streak_days?: number;
  study_points?: number;
  role?: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (params: {
    email: string;
    password: string;
    fullName: string;
    institutionId?: string;
    degreeProgramme?: string;
    yearOfStudy?: number;
  }) => Promise<{ error: Error | null; user?: User | null }>;
  forgotPassword: (email: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, institutions(id, name, short_name)')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const inst = data.institutions as any;
        setProfile({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          institution_id: data.institution_id,
          institution_name: inst?.name || inst?.short_name || null,
          degree_programme: data.degree_programme,
          year_of_study: data.year_of_study,
          streak_days: data.streak_days || 0,
          study_points: data.study_points || 0,
          role: data.role || 'student',
          avatar_url: data.avatar_url,
        });
      }
    } catch (err) {
      console.warn('Error loading profile:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        await fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signup = async ({
    email,
    password,
    fullName,
    institutionId,
    degreeProgramme,
    yearOfStudy,
  }: {
    email: string;
    password: string;
    fullName: string;
    institutionId?: string;
    degreeProgramme?: string;
    yearOfStudy?: number;
  }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            institution_id: institutionId || null,
            degree_programme: degreeProgramme || null,
            year_of_study: yearOfStudy || 1,
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'unistudy://reset-password',
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.warn('Error signing out:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        login,
        signup,
        forgotPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
