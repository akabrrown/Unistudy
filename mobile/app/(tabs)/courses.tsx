import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function CoursesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const styles = getStyles(colors, theme === 'dark');

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchCourses() {
      const { data } = await supabase
        .from('courses')
        .select('*, lectures(id)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setCourses(data || []);
      setLoading(false);
    }

    fetchCourses();
  }, [user, authLoading]);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    // Generate a consistent color based on index
    const tintColors = theme === 'dark' 
      ? ['#B39DDB', '#F48FB1', '#90CAF9', '#80CBC4']
      : ['#5B2D8E', '#E91E63', '#0B57D0', '#009688'];
    const icons = ['calculator', 'flask', 'code', 'earth'];
    const color = tintColors[index % tintColors.length];
    const icon = icons[index % icons.length];
    
    // For now we simulate progress since it requires a complex query to calculate completion
    const progress = 0; 
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/course/${item.id}`)}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={28} color={color} />
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </View>
        <Text style={styles.title}>{item.course_code || 'Course'}</Text>
        <Text style={styles.subtitle}>{item.title}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Courses Found</Text>
          <Text style={styles.emptySubtext}>Head over to the web app to create your first course!</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 20,
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
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
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.input,
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
    color: colors.text,
    width: 36,
  }
});
