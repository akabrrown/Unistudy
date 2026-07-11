import * as Notifications from 'expo-notifications';
import { createClient } from '@supabase/supabase-js';

// We should use env vars here, but using a placeholder for the demo structure
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Register for push on app launch
export async function registerPushToken(userId: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log("No push notification permissions granted.");
    return null;
  }
  
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Store token in Supabase
    await supabase
      .from('profiles')
      .update({ push_token: token }) // assuming we add a push_token column to profiles
      .eq('id', userId);
      
    console.log("Push token registered successfully", token);
    return token;
  } catch (error) {
    console.error("Failed to get push token", error);
    return null;
  }
}
