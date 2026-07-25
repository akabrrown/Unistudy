import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { View, Image, StyleSheet } from 'react-native';

function CustomSplashScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  
  return (
    <View style={[styles.splashContainer, { backgroundColor: colorScheme === 'dark' ? '#121212' : '#FAFAFA' }]}>
      <View style={styles.iconContainer}>
        <Image 
          source={require('../assets/app-icon.jpeg')} 
          style={{ width: 100, height: 100, borderRadius: 20 }} 
          resizeMode="contain" 
        />
      </View>
      <Image 
        source={colorScheme === 'dark' ? require('../assets/logo-dark.jpeg') : require('../assets/logo-secondary.jpeg')} 
        style={{ width: 200, height: 40 }} 
        resizeMode="contain" 
      />
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { loading } = useAuth();

  useEffect(() => {
    // Hide the native splash screen as fast as possible to show our custom one
    SplashScreen.hideAsync().catch(() => {});
    // Force portrait orientation globally by default
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  if (loading) {
    return <CustomSplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="signup" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="camera" options={{ presentation: 'modal' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="course/[courseId]" options={{ headerShown: false }} />
          <Stack.Screen name="lecture/[lectureId]" options={{ headerShown: false, orientation: 'all' }} />
          <Stack.Screen name="accessibility" options={{ title: 'Accessibility', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="accessibility/font" options={{ title: 'Font', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="accessibility/contrast" options={{ title: 'Contrast', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="accessibility/bandwidth" options={{ title: 'Bandwidth', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="accessibility/ui" options={{ title: 'Interface', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="accessibility/ai" options={{ title: 'AI Tutor', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="billing" options={{ title: 'Billing', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="past-papers" options={{ title: 'Past Papers', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="study-calendar" options={{ title: 'Study Calendar', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="notes-scanner" options={{ title: 'Notes Scanner', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="essay-grader" options={{ title: 'Essay Grader', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="youtube-study" options={{ title: 'YouTube Study', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard', headerShown: true, headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }, headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(108, 75, 180, 0.1)', // accent color fallback
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#6C4BB4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  }
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
