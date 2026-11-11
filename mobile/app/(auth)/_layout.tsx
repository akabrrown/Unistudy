import React from 'react';
import { Stack } from 'expo-router';
import { useSettings } from '../../lib/SettingsContext';

export default function AuthLayout() {
  const { colors } = useSettings();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bgPage,
        },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.bgPage,
        },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
