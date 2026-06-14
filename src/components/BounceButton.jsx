import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BounceButton({
  onPress,
  children,
  style,
  activeScale = 0.95,
  activeOpacity = 0.8,
  ...props
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback((e) => {
    scale.value = withSpring(activeScale, {
      damping: 15,
      stiffness: 300,
      mass: 1,
    });
    opacity.value = withTiming(activeOpacity, { duration: 100 });
    if (props.onPressIn) props.onPressIn(e);
  }, [activeScale, activeOpacity, props.onPressIn]);

  const handlePressOut = useCallback((e) => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
      mass: 1,
    });
    opacity.value = withTiming(1, { duration: 150 });
    if (props.onPressOut) props.onPressOut(e);
  }, [props.onPressOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
