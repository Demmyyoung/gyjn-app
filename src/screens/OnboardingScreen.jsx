import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';

const C = {
  orange:  '#FF6B2C',
  night:   '#1A1A2E',
  cream:   '#FFF5EE',
  hint:    '#BEBEBE',
  muted:   '#5A5A7A',
};

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
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login', { role: 'seeker' })}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.emojiBox, { backgroundColor: 'rgba(255, 107, 44, 0.08)' }]}>
                <Text style={styles.cardEmoji}>🙋</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardLabel}>Job Seeker</Text>
                <Text style={styles.cardDesc}>Swipe on jobs, get matched, land interviews</Text>
              </View>
            </View>
            <Text style={styles.cardArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login', { role: 'employer' })}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.emojiBox, { backgroundColor: 'rgba(123, 79, 233, 0.08)' }]}>
                <Text style={styles.cardEmoji}>🏢</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardLabel}>Employer</Text>
                <Text style={styles.cardDesc}>Post roles, discover talent, hire fast</Text>
              </View>
            </View>
            <Text style={styles.cardArrow}>➔</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>← Sign Out / Switch Account</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
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
    color: C.night,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: C.hint,
    lineHeight: 22,
  },
  cards: { gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.015)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  emojiBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 26 },
  cardTextContainer: { flex: 1, gap: 2 },
  cardLabel: { fontSize: 16, fontWeight: '800', color: C.night },
  cardDesc: { fontSize: 12, color: C.muted, lineHeight: 16 },
  cardArrow: { fontSize: 18, color: C.orange, fontWeight: '700', paddingLeft: 8 },
  signOutBtn: {
    marginTop: 24,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  signOutText: {
    color: C.orange,
    fontSize: 14,
    fontWeight: '700',
  },
});
