import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, useThemeColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function StudyCalendarScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  // Add Event Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState('exam');
  const [adding, setAdding] = useState(false);

  const fetchCalendarData = async () => {
    // existing fetch logic remains unchanged
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      // Use local date to avoid UTC offset issues
      const today = new Date().toLocaleDateString('en-CA');
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', today)
        .order('date', { ascending: true });

      if (data) setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [session?.user?.id]);

  const handleAddEvent = async () => {
    if (!title.trim() || !date) {
      Alert.alert('Missing Info', 'Please provide a title and date.');
      return;
    }
    
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: session?.user?.id,
          title,
          date,
          type: eventType,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      Alert.alert('Success', 'Event added to your calendar!');
      setModalVisible(false);
      setTitle('');
      setEventType('exam');
      fetchCalendarData(); // Refresh list
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  };

  // Utility to parse a YYYY-MM-DD date string as a local Date (no timezone shift)
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert('Confirm Delete', 'Remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
            if (error) throw error;
            fetchCalendarData();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam': return 'document-text';
      case 'assignment': return 'create';
      case 'session': return 'time';
      default: return 'calendar';
    }
  };


  const getEventColor = (type: string) => {
    switch (type) {
      case 'exam': return '#ef4444'; // red
      case 'assignment': return '#3b82f6'; // blue
      case 'session': return '#22c55e'; // green
      default: return colors.tint;
    }
  };

  if (loading && events.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Group events by date
  const groupedEvents: Record<string, any[]> = {};
  events.forEach(e => {
    if (!groupedEvents[e.date]) groupedEvents[e.date] = [];
    groupedEvents[e.date].push(e);
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>Study Calendar</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={64} color={colors.textMuted} style={{opacity: 0.5}} />
            <Text style={styles.emptyText}>No upcoming events scheduled.</Text>
            <TouchableOpacity style={styles.uploadEmptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.uploadEmptyBtnText}>Add Event Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.keys(groupedEvents).map(dateStr => {
            const dateObj = new Date(dateStr);
            return (
              <View key={dateStr} style={styles.section}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderDay}>{dateObj.getDate()}</Text>
                  <View>
                    <Text style={styles.dateHeaderMonth}>{dateObj.toLocaleString('default', { month: 'short' })}</Text>
                    <Text style={styles.dateHeaderWeekday}>{dateObj.toLocaleString('default', { weekday: 'long' })}</Text>
                  </View>
                </View>

                {groupedEvents[dateStr].map(event => {
                  const eventColor = getEventColor(event.type);
                  return (
                    <View key={event.id} style={[styles.card, { borderLeftColor: eventColor, borderLeftWidth: 4 }]}>
                      <View style={[styles.iconBox, { backgroundColor: eventColor + '20' }]}>
                        <Ionicons name={getEventIcon(event.type)} size={20} color={eventColor} />
                      </View>
                      <View style={styles.cardContent}>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(event.id)}>
                          <Ionicons name="trash" size={20} color={eventColor} />
                        </TouchableOpacity>
                        <Text style={styles.cardTitle}>{event.title}</Text>
                        <View style={styles.eventTypeBadge}>
                          <Text style={styles.eventTypeText}>{event.type}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.title, { marginBottom: 0 }]}>Add Event</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Math Midterm Exam" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2026-10-31" placeholderTextColor={colors.textMuted} value={date} onChangeText={setDate} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Type</Text>
              <View style={styles.pickerRow}>
                {[
                  { id: 'exam', label: 'Exam', color: '#ef4444' }, 
                  { id: 'assignment', label: 'Assignment', color: '#3b82f6' }, 
                  { id: 'session', label: 'Session', color: '#22c55e' }
                ].map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[
                      styles.typePill, 
                      eventType === t.id && { backgroundColor: t.color, borderColor: t.color }
                    ]} 
                    onPress={() => setEventType(t.id)}
                  >
                    <Text style={[styles.typePillText, eventType === t.id && styles.typePillTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.submitButton, adding && { opacity: 0.7 }]} onPress={handleAddEvent} disabled={adding}>
              {adding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add to Calendar</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadEmptyBtn: {
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadEmptyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  dateHeaderDay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  dateHeaderMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.tint,
    textTransform: 'uppercase',
  },
  dateHeaderWeekday: {
    fontSize: 12,
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  eventTypeBadge: {
    backgroundColor: isDark ? '#424242' : '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  eventTypeText: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalContent: {
    padding: 20,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  typePillText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  typePillTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: colors.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
