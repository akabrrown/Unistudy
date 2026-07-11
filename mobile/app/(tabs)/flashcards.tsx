import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function FlashcardsScreen() {
  const [flipped, setFlipped] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="cloud-offline" size={16} color="#666" />
          <Text style={styles.badgeText}>Offline Mode Active</Text>
        </View>
        <Text style={styles.count}>1/24 Due</Text>
      </View>

      <TouchableOpacity 
        style={styles.flashcard}
        activeOpacity={0.9}
        onPress={() => setFlipped(!flipped)}
      >
        <View style={styles.cardInner}>
          {!flipped ? (
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>QUESTION</Text>
              <Text style={styles.cardText}>What is the derivative of e^x?</Text>
            </View>
          ) : (
            <View style={[styles.cardContent, styles.cardContentBack]}>
              <Text style={[styles.cardLabel, { color: '#5B2D8E' }]}>ANSWER</Text>
              <Text style={styles.cardText}>e^x</Text>
              <Text style={styles.explanation}>The exponential function e^x is unique because its derivative is exactly itself.</Text>
            </View>
          )}
          <Text style={styles.tapToFlip}>Tap to flip</Text>
        </View>
      </TouchableOpacity>

      {flipped && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.actionText, { color: '#D32F2F' }]}>Hard</Text>
            <Text style={styles.actionSub}>&lt; 1m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.actionText, { color: '#F57C00' }]}>Good</Text>
            <Text style={styles.actionSub}>10m</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.actionText, { color: '#388E3C' }]}>Easy</Text>
            <Text style={styles.actionSub}>4d</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  count: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
  },
  flashcard: {
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 40,
  },
  cardInner: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentBack: {
    backgroundColor: '#FAFAFA',
    margin: -32,
    padding: 32,
    borderRadius: 24,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 2,
    marginBottom: 24,
  },
  cardText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  explanation: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 24,
  },
  tapToFlip: {
    textAlign: 'center',
    color: '#BBB',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '30%',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 12,
    color: '#888',
  }
});
