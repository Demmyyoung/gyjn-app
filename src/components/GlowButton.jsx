import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/ThemeProvider';
import { springs, timings } from '../lib/animations';
import { haptic } from '../lib/haptics';
import { playSound } from '../lib/sounds';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GlowButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  ...props
}) {
  const { colors, gradients, shadows, radii, typography } = useTheme();
  const scale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  // Shimmer effect when loading
  useEffect(() => {
    if (loading) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        false
      );
    } else {
      shimmer.value = 0;
    }
  }, [loading]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, springs.snappy);
    haptic.press();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, springs.snappy);
  };

  const handlePress = (e) => {
    if (disabled || loading) return;
    playSound('send');
    if (onPress) onPress(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.6 : 1,
  }));

  // Shimmer translation
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 200]) }],
    opacity: loading ? 0.3 : 0,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container, 
        !disabled && shadows.glow,
        animatedStyle, 
        style
      ]}
      {...props}
    >
      <LinearGradient
        colors={gradients.primary(colors.isDark)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { borderRadius: radii.lg }]}
      >
        {/* Shimmer overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={[typography.label, { color: colors.text.inverse }]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    width: '100%',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }
});
