import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeProvider';
import { springs } from '../lib/animations';

export default function AnimatedTag({
  label,
  icon,
  active = false,
  colorType = 'orange', // 'orange' | 'purple' | 'green' | 'neutral'
  style
}) {
  const { colors, typography, radii } = useTheme();
  const activeAnim = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeAnim.value = withSpring(active ? 1 : 0, springs.bouncy);
  }, [active]);

  // Compute colors on JS thread (outside worklets)
  const activeColor = (() => {
    switch (colorType) {
      case 'purple': return colors.brand.purple;
      case 'green': return colors.status.success;
      case 'neutral': return colors.text.primary;
      case 'orange':
      default: return colors.brand.orange;
    }
  })();

  const activeBg = (() => {
    switch (colorType) {
      case 'purple': return 'rgba(123, 79, 233, 0.15)';
      case 'green': return colors.status.successBg;
      case 'neutral': return colors.bg.sand;
      case 'orange':
      default: return 'rgba(255, 107, 44, 0.15)';
    }
  })();

  const inactiveBg = colors.bg.secondary;
  const inactiveBorder = colors.border.light;
  const inactiveText = colors.text.secondary;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: interpolateColor(
        activeAnim.value,
        [0, 1],
        [inactiveBg, activeBg]
      ),
      borderColor: interpolateColor(
        activeAnim.value,
        [0, 1],
        [inactiveBorder, activeColor]
      ),
      transform: [
        { scale: 1 + (activeAnim.value * 0.05) }
      ]
    };
  });

  const textStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      color: interpolateColor(
        activeAnim.value,
        [0, 1],
        [inactiveText, activeColor]
      )
    };
  });

  return (
    <Animated.View 
      style={[
        styles.tag, 
        { borderRadius: radii.pill },
        animatedStyle,
        style
      ]}
    >
      {icon && (
        <Animated.Text style={[{ marginRight: 4 }, textStyle]}>
          {icon}
        </Animated.Text>
      )}
      <Animated.Text style={[typography.label, textStyle]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  }
});
