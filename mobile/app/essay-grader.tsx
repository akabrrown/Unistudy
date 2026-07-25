import React, { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, useThemeColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export default function EssayGraderScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const [essayText, setEssayText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');

  const gradeEssay = async () => {
    if (!essayText.trim()) return;
    setIsProcessing(true);
    setFeedback('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp ? `http://${localIp}:3000/api/ai/ask` : 'https://unistudy-ai.vercel.app/api/ai/ask';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          feature: 'essay_grader',
          payload: { 
            prompt: essayText,
            stream: false
          }
        })
      });

      const data = await res.json();
      const content = data.result?.choices?.[0]?.message?.content || "Could not grade the essay. Please try again.";
      setFeedback(content);
    } catch (e) {
      setFeedback("An error occurred while grading the essay. Please try again.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {!feedback && !isProcessing ? (
          <View style={styles.inputContainer}>
            <View style={styles.header}>
              <Ionicons name="pencil" size={32} color={colors.tint} />
              <View>
                <Text style={styles.title}>AI Essay Grader</Text>
                <Text style={styles.subtitle}>Paste your essay below for instant feedback</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Start typing or paste your essay here..."
              placeholderTextColor={colors.textMuted}
              value={essayText}
              onChangeText={setEssayText}
            />
            
            <TouchableOpacity 
              style={[styles.gradeBtn, !essayText.trim() && styles.gradeBtnDisabled]} 
              onPress={gradeEssay}
              disabled={!essayText.trim() || isProcessing}
            >
              <Text style={styles.gradeBtnText}>Grade My Essay</Text>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.resultTitle}>Feedback Report</Text>
              <TouchableOpacity onPress={() => {setFeedback(''); setEssayText('');}} style={styles.newEssayBtn}>
                <Ionicons name="refresh" size={16} color={colors.tint} />
                <Text style={styles.newEssayText}>New Essay</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.feedbackBox}>
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <Text style={styles.loadingText}>Analyzing structure, grammar, and content...</Text>
                </View>
              ) : (
                <Text style={styles.feedbackText}>{feedback}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  inputContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 300,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    color: colors.text,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  gradeBtn: {
    backgroundColor: colors.tint,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradeBtnDisabled: {
    opacity: 0.5,
  },
  gradeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  newEssayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newEssayText: {
    color: colors.tint,
    fontWeight: 'bold',
    fontSize: 14,
  },
  feedbackBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.tint,
    marginTop: 16,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
});
