import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';

// An animated text component
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function CountUp({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  style,
  onComplete,
}) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    // Animate to the new value
    animatedValue.value = withTiming(value, { duration }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });
  }, [value, duration]);

  // Derived display state
  const animatedProps = useAnimatedProps(() => {
    // Format number nicely (e.g., 1000 -> 1,000)
    const formatted = Math.round(animatedValue.value).toLocaleString();
    return {
      text: `${prefix}${formatted}${suffix}`
    };
  });

  // Reanimated 3 doesn't officially support animated text props yet without a specific
  // text prop layout, but we can use an animated prop for native text input or 
  // simply use a derived string approach using useDerivedValue + react state for now.

  // Let's use a safe approach using state updated via runOnJS since true animated 
  // text is buggy across platforms in Reanimated 3.
  const [localText, setLocalText] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    const interval = setInterval(() => {
      const formatted = Math.round(animatedValue.value).toLocaleString();
      setLocalText(`${prefix}${formatted}${suffix}`);
      if (animatedValue.value === value) clearInterval(interval);
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, [value, prefix, suffix]);

  return (
    <Text style={style}>
      {localText}
    </Text>
  );
}
