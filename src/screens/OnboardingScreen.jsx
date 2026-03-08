import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';

export default function OnboardingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>You're almost{'\n'}in. 🚀</Text>
          <Text style={styles.subtitle}>
            Tell us who you are so we can{'\n'}personalise your experience.
          </Text>
        </View>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login', { role: 'seeker' })}
          >
            <Text style={styles.cardEmoji}>🙋</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardLabel}>Job Seeker</Text>
              <Text style={styles.cardDesc}>Swipe on jobs, get matched, land interviews</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login', { role: 'employer' })}
          >
            <Text style={styles.cardEmoji}>🏢</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardLabel}>Employer</Text>
              <Text style={styles.cardDesc}>Post roles, discover talent, hire fast</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 36,
  },
  header: { gap: 10 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: '#ABABAB',
    lineHeight: 22,
  },
  cards: { gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardEmoji: { fontSize: 34 },
  cardTextContainer: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: '#6B6B6B' },
});
