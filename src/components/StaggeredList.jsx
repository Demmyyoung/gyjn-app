import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { animateStaggerEntrance } from '../lib/animations';

function StaggerItem({ children, index, baseDelay, animate }) {
  const opacity = useSharedValue(animate ? 0 : 1);
  const translateY = useSharedValue(animate ? 20 : 0);

  useEffect(() => {
    if (animate) {
      animateStaggerEntrance(opacity, translateY, index, { baseDelay });
    }
  }, [index, baseDelay, animate]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function StaggeredList({ 
  children, 
  baseDelay = 60,
  style,
  contentContainerStyle,
  animate = true
}) {
  // Filter out null/undefined children
  const validChildren = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      <View style={contentContainerStyle}>
        {validChildren.map((child, index) => (
          <StaggerItem key={child.key || index} index={index} baseDelay={baseDelay} animate={animate}>
            {child}
          </StaggerItem>
        ))}
      </View>
    </View>
  );
}
