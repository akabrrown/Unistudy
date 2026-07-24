import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Colors';
import { useAuth } from '../lib/AuthContext';
import Constants from 'expo-constants';

export default function LeaderboardScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const styles = getStyles(colors, theme === 'dark');
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localIp = debuggerHost?.split(':')[0];
        const baseUrl = localIp ? `http://${localIp}:8000` : 'https://unistudy-ai.vercel.app';
        
        // Use JWT token for auth
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        const res = await fetch(`${baseUrl}/api/leaderboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const json = await res.json();
          setLeaderboardData(json.data || []);
        } else {
          console.error('Failed to fetch leaderboard');
        }
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Leaderboard</Text>
        <Text style={styles.subtitle}>Top students by total XP</Text>
      </View>

      <View style={styles.list}>
        {leaderboardData.map((profile, index) => {
          const isCurrentUser = profile.id === user?.id;
          const institutionName = Array.isArray(profile.institutions) 
            ? profile.institutions[0]?.name 
            : profile.institutions?.name;

          return (
            <View 
              key={profile.id} 
              style={[styles.card, isCurrentUser && styles.currentUserCard]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.nameText}>
                  {profile.username ? `@${profile.username}` : (profile.full_name || 'Anonymous Student')}
                </Text>
                
                <View style={styles.metaInfo}>
                  {profile.year_of_study && profile.degree_programme && (
                    <Text style={styles.metaText}>
                      Level {profile.year_of_study} • {profile.degree_programme}
                    </Text>
                  )}
                  {institutionName && (
                    <Text style={styles.institutionText}>{institutionName}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.scoreBox}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.scoreText}>{profile.total_xp || 0}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: colors.tint,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#333' : '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  userInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'column',
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  institutionText: {
    fontSize: 12,
    color: colors.tint,
    marginTop: 2,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#332b00' : '#FFF9C4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontWeight: 'bold',
    color: isDark ? '#FBC02D' : '#F57F17',
    marginLeft: 4,
  }
});
