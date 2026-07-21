import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withDelay,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeProvider';
import { springs, timings } from '../lib/animations';

const { width } = Dimensions.get('window');

// Helper to animate individual letters
const AnimatedLetter = ({ letter, index }) => {
  const { colors, typography } = useTheme();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Stagger each letter by 100ms
    const delay = 300 + (index * 80);
    translateY.value = withDelay(delay, withSpring(0, springs.bouncy));
    opacity.value = withDelay(delay, withTiming(1, timings.quick));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.wordmark, typography.hero, { color: colors.brand.orange }, style]}>
      {letter}
    </Animated.Text>
  );
};

export default function SplashScreen({ navigation }) {
  const { colors, typography, radii } = useTheme();
  
  // Icon animation
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  
  // Tagline and footer animation
  const fadeUpTranslate = useSharedValue(15);
  const fadeUpOpacity = useSharedValue(0);

  // Progress bar animation
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Initial entrance animations
    iconScale.value = withSpring(1, springs.elastic);
    iconOpacity.value = withTiming(1, timings.normal);
    
    fadeUpTranslate.value = withDelay(800, withSpring(0, springs.snappy));
    fadeUpOpacity.value = withDelay(800, withTiming(1, timings.normal));

    progressWidth.value = withDelay(1000, withTiming(60, { duration: 2000, easing: Easing.inOut(Easing.ease) }));

    // Helper: wraps a promise with a timeout so we never hang indefinitely
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), ms)
        ),
      ]);

    // Hard failsafe: if anything takes longer than 6 seconds total, go to Onboarding
    const hardTimeout = setTimeout(() => {
      Sentry.captureMessage('[Splash] Hard timeout hit — navigating to Onboarding', 'warning');
      navigation.replace('Onboarding');
    }, 15000);

    // Fetch data immediately alongside the animation
    const fetchSessionAndNavigate = async () => {
      try {
        const [sessionRes] = await Promise.all([
          withTimeout(supabase.auth.getSession(), 4000), // max 4s for auth
          new Promise(r => setTimeout(r, 1000))          // min 1s animation time
        ]);
        
        const { data: { session } } = sessionRes;

        if (session) {
          let data = null;
          let userType = 'employer';

          try {
            const empRes = await withTimeout(
              supabase.from('employer_profiles').select('*').eq('id', session.user.id).single(),
              1500
            );
            data = empRes.data;
          } catch (_) {}

          if (!data) {
            try {
              const seekerRes = await withTimeout(
                supabase.from('seeker_profiles').select('*').eq('id', session.user.id).single(),
                1500
              );
              data = seekerRes.data;
              userType = 'seeker';
            } catch (_) {}
          }

          clearTimeout(hardTimeout);
          if (data && data.user_name) {
            let lastTab = null;
            try {
              lastTab = await AsyncStorage.getItem('LAST_ACTIVE_TAB');
            } catch (e) {}

            Sentry.setUser({ id: session.user.id, email: session.user.email, role: userType });

            navigation.replace('Main', {
              screen: lastTab || 'Discover',
              params: {
                userName: data.user_name,
                userRole: data.user_role || data.job_type,
                jobType: data.job_type,
                aboutMe: data.about_me,
                searchTarget: data.search_target,
                userType: userType,
                skills: data.skills || [],
                cvUrl: data.cv_url,
                category: data.category,
              }
            });
          } else {
            navigation.replace('Onboarding');
          }
        } else {
          clearTimeout(hardTimeout);
          navigation.replace('Onboarding');
        }
      } catch (err) {
        console.warn('[Splash] Session fetch error or timeout:', err.message);
        Sentry.captureException(err);
        clearTimeout(hardTimeout);
        navigation.replace('Onboarding');
      }
    };

    fetchSessionAndNavigate();

    return () => {
      clearTimeout(hardTimeout);
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const fadeUpStyle = useAnimatedStyle(() => ({
    opacity: fadeUpOpacity.value,
    transform: [{ translateY: fadeUpTranslate.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.iconBox, 
            { 
              backgroundColor: 'rgba(255, 107, 44, 0.1)',
              borderColor: 'rgba(255, 107, 44, 0.2)',
              borderRadius: radii['2xl']
            }, 
            iconStyle
          ]}
        >
          <Image source={require('../../assets/logo.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
        </Animated.View>
        
        {/* Letter by letter Wordmark */}
        <View style={styles.wordmarkContainer}>
          {'Jinni'.split('').map((letter, index) => (
            <AnimatedLetter key={index} letter={letter} index={index} />
          ))}
        </View>
        
        <Animated.Text 
          style={[
            styles.tagline, 
            typography.caption, 
            { color: colors.text.hint }, 
            fadeUpStyle
          ]}
        >
          MAKE A WISH. GET YOUR JOB.
        </Animated.Text>
      </View>

      <View style={[styles.loaderTrack, { backgroundColor: colors.border.light }]}>
        <Animated.View style={[styles.loaderBar, { backgroundColor: colors.brand.orange }, progressStyle]} />
      </View>

      {/* Powered by Brand Footer */}
      <Animated.View style={[styles.footer, fadeUpStyle]}>
        <Text style={[typography.micro, { color: colors.text.hint }]}>powered by</Text>
        <Text style={[typography.micro, { color: colors.brand.orange, letterSpacing: 0.5 }]}>KODx</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 4,
  },
  icon: { fontSize: 48 },
  wordmarkContainer: {
    flexDirection: 'row',
  },
  wordmark: {
    // Extra styling handled in AnimatedLetter via theme
  },
  tagline: {
    letterSpacing: 3,
  },
  loaderTrack: {
    position: 'absolute',
    bottom: 96,
    width: 60,
    height: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    borderRadius: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
