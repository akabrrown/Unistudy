import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSettings } from '../../lib/SettingsContext';
import { Appearance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AIScreen() {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = getStyles(colors, isDark);

  const personalities = [
    { id: 'neutral', label: 'Neutral' },
    { id: 'encouraging', label: 'Encouraging' },
    { id: 'strict', label: 'Strict' },
    { id: 'funny', label: 'Funny' },
    { id: 'motivational', label: 'Motivational' },
    { id: 'empathetic', label: 'Empathetic' },
    { id: 'curious', label: 'Curious' },
  ];

  const readingLevels = [
    { id: 'simplified', label: 'Simplified (Like I\'m 5)' },
    { id: 'beginner', label: 'Beginner (High School)' },
    { id: 'intermediate', label: 'Intermediate (College Intro)' },
    { id: 'advanced', label: 'Advanced (Upper Level)' },
    { id: 'expert', label: 'Expert (Post-grad)' },
  ];

  const tones = [
    { id: 'academic', label: 'Academic' },
    { id: 'casual', label: 'Casual & Conversational' },
  ];

  const renderRadio = (selectedId: string, item: { id: string, label: string }, onSelect: (id: string) => void) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.radioItem, isSelected && styles.radioItemSelected]} 
        onPress={() => onSelect(item.id)}
      >
        <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
          {isSelected && <View style={styles.radioDotInner} />}
        </View>
        <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>AI Tutor Personalization</Text>
      <Text style={styles.description}>
        Customize how your AI tutor speaks and explains concepts.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tutor Name</Text>
        <TextInput
          style={styles.input}
          value={settings.aiTutorName}
          onChangeText={(text) => updateSetting('aiTutorName', text)}
          placeholder="Name your tutor (e.g. Uni, Prof. Smith)"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personality</Text>
        <View style={styles.grid}>
          {personalities.map(p => renderRadio(settings.aiPersonality, p, (id) => updateSetting('aiPersonality', id as any)))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explanation Complexity</Text>
        <View style={styles.list}>
          {readingLevels.map(rl => renderRadio(settings.aiReadingLevel, rl, (id) => updateSetting('aiReadingLevel', id as any)))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject Tone</Text>
        <View style={styles.list}>
          {tones.map(t => renderRadio(settings.aiTone, t, (id) => updateSetting('aiTone', id as any)))}
        </View>
      </View>

    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'inter',
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'inter',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  list: {
    flexDirection: 'column',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 6,
    width: 'auto',
  },
  radioItemSelected: {
    borderColor: '#6b21a8',
    backgroundColor: isDark ? '#2E1065' : '#F3E8FF',
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDotSelected: {
    borderColor: '#6b21a8',
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6b21a8',
  },
  radioLabel: {
    fontSize: 15,
    color: colors.text,
  },
  radioLabelSelected: {
    color: isDark ? '#C084FC' : '#6b21a8',
    fontWeight: '600',
  },
});
