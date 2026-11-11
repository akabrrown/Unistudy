import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';

export default function IndexScreen() {
  const { user, loading: authLoading } = useAuth();
  const { colors, loading: settingsLoading } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !settingsLoading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, authLoading, settingsLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <View style={styles.brandContainer}>
        <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoBadgeText}>📚</Text>
        </View>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
          UniStudy <Text style={{ color: colors.primaryViolet }}>AI</Text>
        </Text>
        <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
          Your Complete University AI Study Desk
        </Text>
      </View>
      <ActivityIndicator size="large" color={colors.primaryViolet} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8C52FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBadgeText: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
  },
  spinner: {
    marginTop: 24,
  },
});

