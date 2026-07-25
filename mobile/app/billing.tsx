import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Appearance, Platform } from 'react-native';
import Constants from 'expo-constants';

const localHostUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const BACKEND_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || localHostUrl;

type SubscriptionData = {
  plan_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at: string | null;
};

export default function BillingScreen() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  
  const systemColorScheme = Appearance.getColorScheme();
  const isDark = systemColorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      if (!session?.access_token) return;
      const res = await fetch(`${BACKEND_URL}/api/billing/subscription`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubData(data.subscription);
      } else {
        throw new Error('Failed to fetch billing info');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const manageSubscription = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: 50, credits: 100, type: 'subscription_upgrade' })
      });
      const data = await res.json();
      if (data.url) {
        // Normally open WebView or browser. For now, alert
        Alert.alert('Redirect', `Would redirect to: ${data.url}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to open portal');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6b21a8" />
      </View>
    );
  }

  const planName = subData?.plan_id ? subData.plan_id.charAt(0).toUpperCase() + subData.plan_id.slice(1) : 'Free';
  const isActive = subData?.status === 'active';
  const renewalDate = subData?.current_period_end ? new Date(subData.current_period_end).toLocaleDateString() : 'N/A';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>Billing & Subscription</Text>
      <Text style={styles.description}>Manage your plan, billing history, and upcoming payments.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Plan</Text>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.planDetails}>
          <Text style={styles.planName}>{planName} Plan</Text>
          {isActive && subData?.current_period_end && (
            <Text style={styles.planSub}>Renews on {renewalDate}</Text>
          )}
          {!isActive && (
            <Text style={styles.planSub}>You are currently on the free tier.</Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={manageSubscription}>
            <Text style={styles.primaryButtonText}>
              {isActive ? 'Manage Subscription' : 'Upgrade Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Payment Methods</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="card" size={24} color={colors.textMuted} style={styles.icon} />
            <View>
              <Text style={styles.rowTitle}>No cards saved</Text>
              <Text style={styles.rowSub}>Payments are handled via Paystack securely.</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'inter',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'inter',
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: isDark ? '#1B5E20' : '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: isDark ? '#424242' : '#EEEEEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTextActive: {
    color: isDark ? '#A5D6A7' : '#2E7D32',
  },
  statusTextInactive: {
    color: isDark ? '#BDBDBD' : '#757575',
  },
  planDetails: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'inter',
    marginBottom: 4,
  },
  planSub: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'inter',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  actionSection: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#6b21a8', // plum accent
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'inter',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily: 'inter',
  },
  rowSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'inter',
  },
});
