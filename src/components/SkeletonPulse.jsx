import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  interpolateColor 
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeProvider';
import { breathe } from '../lib/animations';

export default function SkeletonPulse({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}) {
  const { colors, radii, isDark } = useTheme();
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    // Start continuous breathing animation (0 to 1 and back)
    breathe(pulseAnim, 0, 1, 1000);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Colors adapt to dark/light mode automatically via theme
    const baseColor = colors.bg.secondary;
    const pulseColor = isDark ? '#2A2A40' : colors.bg.sand;

    return {
      backgroundColor: interpolateColor(
        pulseAnim.value,
        [0, 1],
        [baseColor, pulseColor]
      )
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radii.md,
        },
        animatedStyle,
        style
      ]}
    />
  );
}
