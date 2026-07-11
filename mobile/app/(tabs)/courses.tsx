import { View, Text, StyleSheet, FlatList, TouchableOpacity, ProgressBarAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COURSES = [
  { id: '1', title: 'Advanced Mathematics', progress: 0.7, modules: 12, color: '#5B2D8E', icon: 'calculator' },
  { id: '2', title: 'Organic Chemistry', progress: 0.4, modules: 8, color: '#E91E63', icon: 'flask' },
  { id: '3', title: 'Computer Science 101', progress: 0.9, modules: 15, color: '#0B57D0', icon: 'code' },
  { id: '4', title: 'World History', progress: 0.2, modules: 10, color: '#009688', icon: 'earth' },
];

export default function CoursesScreen() {
  const renderItem = ({ item }: { item: typeof COURSES[0] }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={28} color={item.color} />
        </View>
        <Ionicons name="ellipsis-vertical" size={20} color="#888" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.modules} Modules</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${item.progress * 100}%`, backgroundColor: item.color }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={COURSES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 36,
  }
});
