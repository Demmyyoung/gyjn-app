import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen({ navigation }) {
  return (
    <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.container}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    color: '#fff',
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  cards: { gap: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardEmoji: { fontSize: 34 },
  cardTextContainer: { flex: 1 }, // Added this
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
});
