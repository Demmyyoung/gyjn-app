import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolateColor 
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeProvider';
import { springs, timings, shake } from '../lib/animations';
import { haptic } from '../lib/haptics';

export default function AnimatedInput({
  label,
  value,
  onChangeText,
  error,
  style,
  containerStyle,
  labelBgColor,
  ...props
}) {
  const { colors, typography, radii, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation values
  const focusAnim = useSharedValue(value ? 1 : 0);
  const shakeAnim = useSharedValue(0);

  // Update animation when focus or value changes
  React.useEffect(() => {
    if (isFocused || value) {
      focusAnim.value = withSpring(1, springs.snappy);
    } else {
      focusAnim.value = withTiming(0, timings.normal);
    }
  }, [isFocused, value]);

  // Trigger shake on error
  React.useEffect(() => {
    if (error) {
      shake(shakeAnim);
      haptic.error();
    }
  }, [error]);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };

  // Animated styles
  const labelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: focusAnim.value * -24 },
        { scale: 1 - focusAnim.value * 0.15 }
      ],
      color: error 
        ? colors.status.error 
        : interpolateColor(
            focusAnim.value,
            [0, 1],
            [colors.text.hint, colors.brand.orange]
          )
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    return {
      borderColor: error
        ? colors.status.error
        : interpolateColor(
            focusAnim.value,
            [0, 1],
            [colors.border.light, colors.border.active]
          ),
      backgroundColor: isFocused ? colors.bg.card : colors.bg.secondary,
      transform: [{ translateX: shakeAnim.value }]
    };
  });

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      <Animated.View 
        style={[
          styles.inputContainer,
          { borderRadius: radii.lg },
          borderStyle,
          props.multiline && { height: 160 } // Make container taller for multiline
        ]}
      >
        <Animated.Text style={[
          styles.label, 
          typography.caption, 
          labelStyle, 
          { backgroundColor: labelBgColor || colors.bg.primary, paddingHorizontal: 4 }
        ]}>
          {label}
        </Animated.Text>
        
        <TextInput
          style={[
            styles.input, 
            typography.body,
            { color: colors.text.primary },
            props.multiline && { textAlignVertical: 'top', paddingTop: 28, paddingBottom: 16 } // Ensure text starts below the floating label
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.text.hint}
          {...props}
        />
      </Animated.View>
      
      {error && (
        <Text style={[styles.errorText, typography.micro, { color: colors.status.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    height: 56,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 12, // shifted slightly to account for the paddingHorizontal: 4
    top: 18,
    transformOrigin: 'left top',
  },
  input: {
    height: '100%',
    paddingTop: 16, // Make room for floating label
    outlineStyle: 'none',
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  }
});
