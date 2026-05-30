import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Pressable
} from 'react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const C = {
  orange:  '#FF6B2C',
  mango:   '#FF9A62',
  night:   '#1A1A2E',
  cream:   '#FFF5EE',
  hint:    '#BEBEBE',
  muted:   '#5A5A7A',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SelectionCard({ emoji, label, desc, onPress, colorTheme }) {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isPressed.value ? 0.98 : 1) }],
      shadowOpacity: withTiming(isPressed.value ? 0.15 : 0.04),
      shadowColor: isPressed.value ? C.orange : C.night,
      borderColor: withTiming(isPressed.value ? 'rgba(255,107,44,0.4)' : 'rgba(0,0,0,0.015)'),
    };
  });

  const arrowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withTiming(isPressed.value ? 5 : 0) }]
    };
  });

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPressIn={() => isPressed.value = true}
      onPressOut={() => isPressed.value = false}
      onPress={onPress}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.emojiBox, { backgroundColor: colorTheme }]}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
      </View>
      <Animated.View style={[styles.arrowContainer, arrowStyle]}>
        <LinearGradient colors={[C.orange, C.mango]} style={styles.arrowGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.cardArrow}>➔</Text>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
}

export default function OnboardingScreen({ navigation }) {
  const rocketOffset = useSharedValue(0);

  useEffect(() => {
    rocketOffset.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketOffset.value }]
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>You're almost{'\n'}in. </Text>
            <Animated.Text style={[styles.rocket, rocketStyle]}>🚀</Animated.Text>
          </View>
          <Text style={styles.subtitle}>
            Tell us who you are so we can{'\n'}personalise your experience.
          </Text>
        </View>

        <View style={styles.cards}>
          <SelectionCard
            emoji="🧑‍💻"
            label="Job Seeker"
            desc="Swipe on jobs, get matched, land interviews"
            colorTheme="rgba(255, 107, 44, 0.08)"
            onPress={() => navigation.navigate('Auth', { role: 'seeker' })}
          />
          <SelectionCard
            emoji="🏢"
            label="Employer"
            desc="Post roles, discover talent, hire fast"
            colorTheme="rgba(123, 79, 233, 0.08)"
            onPress={() => navigation.navigate('Auth', { role: 'employer' })}
          />
        </View>

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
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.night,
    lineHeight: 42,
  },
  rocket: {
    fontSize: 34,
    lineHeight: 42,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    fontWeight: '500',
  },
  cards: { gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1.5,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  emojiBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 30 },
  cardTextContainer: { flex: 1, gap: 2 },
  cardLabel: { fontSize: 17, fontWeight: '800', color: C.night },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  arrowContainer: { paddingLeft: 8 },
  arrowGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardArrow: { fontSize: 16, color: '#fff', fontWeight: '800' },
});
