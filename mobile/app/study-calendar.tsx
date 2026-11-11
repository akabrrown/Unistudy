import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSettings } from '../lib/SettingsContext';
import { apiFetch } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'exam' | 'assignment' | 'study';
  date: string;
  course_code?: string;
  description?: string;
}

export default function StudyCalendarScreen() {
  const { colors } = useSettings();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'exam' | 'assignment' | 'study'>('exam');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventCourse, setEventCourse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await apiFetch('/calendar/events');
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        // Fallback default academic dates
        setEvents([
          {
            id: 'ev-1',
            title: 'Computer Architecture Mid-Semester Exam',
            type: 'exam',
            date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            course_code: 'CPEN 201',
          },
          {
            id: 'ev-2',
            title: 'Algorithm Analysis Problem Set 3 Due',
            type: 'assignment',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            course_code: 'CSCD 205',
          },
          {
            id: 'ev-3',
            title: 'Database Systems Group Revision',
            type: 'study',
            date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            course_code: 'CSCD 301',
          },
        ]);
      }
    } catch {
      setEvents([
        {
          id: 'ev-1',
          title: 'Computer Architecture Mid-Semester Exam',
          type: 'exam',
          date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          course_code: 'CPEN 201',
        },
        {
          id: 'ev-2',
          title: 'Algorithm Analysis Problem Set 3 Due',
          type: 'assignment',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          course_code: 'CSCD 205',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: eventTitle.trim(),
        type: eventType,
        date: eventDate,
        course_code: eventCourse.trim().toUpperCase() || undefined,
      };

      const newEv = await apiFetch('/calendar/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setEvents(prev => [newEv, ...prev]);
      setIsModalOpen(false);
      setEventTitle('');
      setEventCourse('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDaysRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Passed';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(e => e.type === filterType);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Study Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Stay ahead of exam dates, assignments, and revision milestones.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primaryViolet }]}
            onPress={() => setIsModalOpen(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All Events' },
            { id: 'exam', label: 'Exams' },
            { id: 'assignment', label: 'Assignments' },
            { id: 'study', label: 'Revision' },
          ].map(f => {
            const active = filterType === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primaryViolet : colors.bgCard,
                    borderColor: active ? colors.primaryViolet : colors.border,
                  },
                ]}
                onPress={() => setFilterType(f.id)}
              >
                <Text style={{ color: active ? '#FFFFFF' : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Event List */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primaryViolet} style={{ marginVertical: 30 }} />
        ) : filteredEvents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={36} color={colors.primaryViolet} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scheduled events</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Tap the Schedule button above to set reminders for your upcoming exams.
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {filteredEvents.map(ev => {
              const daysText = getDaysRemaining(ev.date);
              const isUrgent = daysText === 'Today' || daysText === 'Tomorrow' || daysText.startsWith('In 1') || daysText.startsWith('In 2');
              const typeColor = ev.type === 'exam' ? '#EF4444' : ev.type === 'assignment' ? '#F59E0B' : '#8C52FF';

              return (
                <View
                  key={ev.id}
                  style={[styles.eventCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                >
                  <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />

                  <View style={styles.eventBody}>
                    <View style={styles.eventTop}>
                      {ev.course_code && (
                        <View style={[styles.courseBadge, { backgroundColor: colors.bgSubtle }]}>
                          <Text style={[styles.courseBadgeText, { color: colors.textPrimary }]}>
                            {ev.course_code}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.countdownBadge,
                          { backgroundColor: isUrgent ? '#EF444420' : colors.bgSubtle },
                        ]}
                      >
                        <Text style={[styles.countdownText, { color: isUrgent ? '#EF4444' : colors.textSecondary }]}>
                          {daysText}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{ev.title}</Text>
                    <Text style={[styles.eventDateText, { color: colors.textMuted }]}>
                      {new Date(ev.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Schedule Exam or Task</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Event Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Mid-Semester Quiz 2"
                  placeholderTextColor={colors.textMuted}
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Associated Course Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. CPEN 201"
                  placeholderTextColor={colors.textMuted}
                  value={eventCourse}
                  onChangeText={setEventCourse}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Event Type</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { id: 'exam', label: 'Exam' },
                    { id: 'assignment', label: 'Assignment' },
                    { id: 'study', label: 'Revision' },
                  ].map(t => {
                    const active = eventType === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.typeSelectorBtn,
                          {
                            backgroundColor: active ? colors.primaryViolet : colors.bgInput,
                            borderColor: active ? colors.primaryViolet : colors.border,
                          },
                        ]}
                        onPress={() => setEventType(t.id as any)}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="2026-11-20"
                  placeholderTextColor={colors.textMuted}
                  value={eventDate}
                  onChangeText={setEventDate}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveEventBtn, { backgroundColor: colors.primaryViolet }]}
                onPress={handleCreateEvent}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveEventBtnText}>Add to Calendar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 240,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  typeIndicator: {
    width: 6,
  },
  eventBody: {
    flex: 1,
    padding: 16,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventDateText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    gap: 16,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectorBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEventBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveEventBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

