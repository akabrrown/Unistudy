'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LeaderboardUser {
  id: string;
  full_name: string;
  total_xp: number;
  level: string;
  university: string;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        setCurrentUserId(authData.user?.id || null);

        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.leaderboard);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-md" />;
      case 1: return <Medal className="w-6 h-6 text-slate-400 drop-shadow-md" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700 drop-shadow-md" />;
      default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-foreground flex justify-center items-center gap-3">
          <Sparkles className="w-8 h-8 text-amber-500" />
          Global Leaderboard
          <Sparkles className="w-8 h-8 text-amber-500" />
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">Top 50 students ranked by total XP.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p>Loading rankings...</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="divide-y divide-border">
            {users.map((user, index) => {
              const isCurrentUser = user.id === currentUserId;
              
              return (
                <div 
                  key={user.id} 
                  className={`flex items-center p-4 sm:p-6 transition-colors hover:bg-muted/50 ${
                    isCurrentUser ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="w-12 flex justify-center mr-4">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg mr-4 border border-primary/30">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-foreground truncate">
                        {user.full_name || 'Anonymous Student'}
                      </p>
                      {isCurrentUser && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>{user.level || 'Freshman'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline truncate">{user.university || 'No University'}</span>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold font-mono text-primary">
                      {user.total_xp?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
