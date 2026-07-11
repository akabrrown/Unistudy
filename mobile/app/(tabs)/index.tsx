import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Alex 👋</Text>
          <Text style={styles.subtitle}>Let's crush those exams!</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={20} color="#FF9800" />
          <Text style={styles.streakText}>5 Day Streak</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.captureCard}
        onPress={() => router.push('/camera')}
      >
        <View style={styles.captureIconContainer}>
          <Ionicons name="camera" size={32} color="#fff" />
        </View>
        <View style={styles.captureTextContainer}>
          <Text style={styles.captureTitle}>Quick Capture</Text>
          <Text style={styles.captureSubtitle}>Snap a whiteboard or slide for AI explanation.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Due Today</Text>
      
      <View style={styles.dueCard}>
        <View style={styles.dueLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="albums" size={24} color="#5B2D8E" />
          </View>
          <View>
            <Text style={styles.dueTitle}>Advanced Mathematics</Text>
            <Text style={styles.dueSubtitle}>24 Flashcards • ~15 mins</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.studyBtn}
          onPress={() => router.push('/flashcards')}
        >
          <Text style={styles.studyBtnText}>Study</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Courses</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.courseCard}>
            <View style={[styles.courseIcon, { backgroundColor: i === 1 ? '#E8DEF8' : '#D3E3FD' }]}>
              <Ionicons name={i === 1 ? 'flask' : 'code'} size={24} color={i === 1 ? '#5B2D8E' : '#0B57D0'} />
            </View>
            <Text style={styles.courseTitle}>{i === 1 ? 'Organic Chemistry' : 'Algorithms'}</Text>
            <Text style={styles.courseSubtitle}>4 Modules</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    color: '#E65100',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  captureCard: {
    backgroundColor: '#5B2D8E',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#5B2D8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
  },
  captureIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  captureTextContainer: {
    flex: 1,
  },
  captureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  captureSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
  },
  dueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dueSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  studyBtn: {
    backgroundColor: '#5B2D8E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  studyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  horizontalScroll: {
    overflow: 'visible',
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#888',
  }
});
