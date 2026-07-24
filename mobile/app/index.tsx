import { View, Text, StyleSheet, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function LandingScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('../assets/app-icon.jpeg')} 
            style={{ width: 100, height: 100, borderRadius: 20 }} 
            resizeMode="contain" 
          />
        </View>
        
        {theme === 'dark' ? (
          <Image 
            source={require('../assets/logo-dark.jpeg')} 
            style={{ width: 200, height: 40, marginBottom: 12 }} 
            resizeMode="contain" 
          />
        ) : (
          <Image 
            source={require('../assets/logo-secondary.jpeg')} 
            style={{ width: 200, height: 40, marginBottom: 12 }} 
            resizeMode="contain" 
          />
        )}
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

        <TouchableOpacity 
          style={{ marginTop: 24, alignItems: 'center' }}
          onPress={() => router.push('/contact')}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>Contact Us</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.accent,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  footer: {
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.tint,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.tint,
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
    backgroundColor: colors.card,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
