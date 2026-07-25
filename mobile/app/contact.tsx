import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, useThemeColors } from '../constants/Colors';

export default function ContactScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const styles = getStyles(colors, theme === 'dark');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (!name || !email || !message) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (response.ok) {
        Alert.alert('Message Sent!', 'We will get back to you shortly.');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Get in Touch</Text>
            <Text style={styles.subtitle}>
              We're here to answer any questions about UniStudy AI. Drop us a line!
            </Text>
          </View>

          {/* Contact Info Card */}
          <View style={styles.glassCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={24} color={colors.tint} />
              <Text style={styles.infoText}>unistudy.ai@gmail.com</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={24} color={colors.tint} />
              <Text style={styles.infoText}>Accra, Ghana</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={24} color={colors.tint} />
              <Text style={styles.infoText}>+233592722997</Text>
            </View>
          </View>

          {/* Contact Form Card */}
          <View style={styles.glassCard}>
            <Text style={styles.formTitle}>Contact Form</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Your Name*"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email Address*"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Subject (Optional)"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your message..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity 
              style={[styles.sendButton, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleSend}
              disabled={isSubmitting}
            >
              <Text style={styles.sendButtonText}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  glassCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  infoText: {
    color: colors.text,
    fontSize: 16,
  },
  formTitle: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  sendButton: {
    backgroundColor: colors.tint, // Fallback for gradient
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
