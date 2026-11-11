import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';
import { SettingsProvider, useSettings } from '../lib/SettingsContext';

function RootNavigator() {
  const { colors, settings } = useSettings();

  return (
    <>
      <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bgPage,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.bgPage,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="course/[courseId]"
          options={{
            title: 'Course Details',
            headerBackTitle: 'Courses',
          }}
        />
        <Stack.Screen
          name="lecture/[lectureId]"
          options={{
            title: 'Lecture Slides & AI Tutor',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="calculator"
          options={{
            title: 'AI Math Calculator',
            headerBackTitle: 'Tools',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            title: 'Scan Whiteboard & Notes',
            headerBackTitle: 'Tools',
          }}
        />
        <Stack.Screen
          name="essay-grader"
          options={{
            title: 'AI Essay Grader',
            headerBackTitle: 'Tools',
          }}
        />
        <Stack.Screen
          name="study-calendar"
          options={{
            title: 'Study Calendar & Exams',
            headerBackTitle: 'Tools',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <RootNavigator />
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
