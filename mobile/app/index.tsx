import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={80} color="#5B2D8E" />
        </View>
        
        <Text style={styles.title}>UniStudy AI</Text>
        <Text style={styles.subtitle}>
          Your ultimate AI study companion. Turn slides into flashcards, master past papers, and ace your exams.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    backgroundColor: '#F3E5F5',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#5B2D8E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  footer: {
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#5B2D8E',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#5B2D8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
