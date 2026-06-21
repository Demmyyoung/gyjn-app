import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { springs, timings } from '../lib/animations';
import { haptic } from '../lib/haptics';
import { useTheme } from '../lib/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BounceButton({
  onPress,
  children,
  style,
  activeScale = 0.95,
  activeOpacity = 0.8,
  variant = 'default', // 'default' | 'ghost' | 'destructive'
  useHaptic = false,
  ...props
}) {
  const { colors, radii } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback((e) => {
    if (useHaptic) {
      if (variant === 'destructive') haptic.warning();
      else haptic.press();
    }
    
    scale.value = withSpring(activeScale, springs.snappy);
    opacity.value = withTiming(activeOpacity, timings.instant);
    if (props.onPressIn) props.onPressIn(e);
  }, [activeScale, activeOpacity, variant, useHaptic, props.onPressIn]);

  const handlePressOut = useCallback((e) => {
    scale.value = withSpring(1, springs.snappy);
    opacity.value = withTiming(1, timings.quick);
    if (props.onPressOut) props.onPressOut(e);
  }, [props.onPressOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getVariantStyle = () => {
    switch (variant) {
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'destructive':
        return { backgroundColor: colors.status.errorBg, borderRadius: radii.md };
      case 'default':
      default:
        return {};
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[getVariantStyle(), animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
