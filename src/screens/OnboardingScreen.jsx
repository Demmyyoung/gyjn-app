import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView
} from 'react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeProvider';
import { springs, timings } from '../lib/animations';
import StaggeredList from '../components/StaggeredList';
import BounceButton from '../components/BounceButton';

function SelectionCard({ emoji, label, desc, onPress, colorTheme }) {
  const { colors, typography, radii, shadows } = useTheme();
  const isHovered = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: isHovered.value ? colors.brand.orange : colors.border.light,
      backgroundColor: colors.bg.card,
    };
  });

  const arrowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(isHovered.value ? 5 : 0, springs.snappy) }]
    };
  });

  return (
    <BounceButton
      onPress={onPress}
      onPressIn={() => isHovered.value = true}
      onPressOut={() => isHovered.value = false}
      activeScale={0.97}
      style={{ marginBottom: 16 }}
    >
      <Animated.View style={[styles.card, { borderRadius: radii['2xl'] }, shadows.sm, animatedStyle]}>
        <View style={styles.cardLeft}>
          <View style={[styles.emojiBox, { backgroundColor: colorTheme, borderRadius: radii.lg }]}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={[typography.title, { color: colors.text.primary }]}>{label}</Text>
            <Text style={[typography.label, { color: colors.text.secondary }]}>{desc}</Text>
          </View>
        </View>
        <Animated.View style={[styles.arrowContainer, arrowStyle]}>
          <LinearGradient 
            colors={[colors.brand.orange, colors.brand.mango]} 
            style={[styles.arrowGradient, { borderRadius: radii.circle }]} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardArrow}>➔</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </BounceButton>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const rocketOffset = useSharedValue(0);

  useEffect(() => {
    rocketOffset.value = withRepeat(
      withSequence(
        withTiming(-5, timings.slow),
        withTiming(0, timings.slow)
      ),
      -1,
      true
    );
  }, []);

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketOffset.value }]
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <SafeAreaView style={styles.inner}>
        
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[typography.display, { color: colors.text.primary }]}>
              You're almost{'\n'}in. 
            </Text>
            <Animated.Text style={[styles.rocket, rocketStyle]}>🚀</Animated.Text>
          </View>
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 8 }]}>
            Tell us who you are so we can{'\n'}personalise your experience.
          </Text>
        </View>

        <StaggeredList baseDelay={100} style={styles.cards}>
          <SelectionCard
            key="seeker"
            emoji="🧑‍💻"
            label="Job Seeker"
            desc="Swipe on jobs, get matched, land interviews"
            colorTheme="rgba(255, 107, 44, 0.08)"
            onPress={() => navigation.navigate('Auth', { role: 'seeker' })}
          />
          <SelectionCard
            key="employer"
            emoji="🏢"
            label="Employer"
            desc="Post roles, discover talent, hire fast"
            colorTheme="rgba(123, 79, 233, 0.08)"
            onPress={() => navigation.navigate('Auth', { role: 'employer' })}
          />
        </StaggeredList>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 28,
  },
  header: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  rocket: {
    fontSize: 34,
    lineHeight: 42,
    marginLeft: 4,
  },
  cards: { marginTop: 16 },
  card: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 30 },
  cardTextContainer: { flex: 1, gap: 2 },
  arrowContainer: { paddingLeft: 8 },
  arrowGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrow: { fontSize: 16, color: '#fff', fontWeight: '800' },
});
