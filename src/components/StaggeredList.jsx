import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { animateStaggerEntrance } from '../lib/animations';

function StaggerItem({ children, index, baseDelay }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    animateStaggerEntrance(opacity, translateY, index, { baseDelay });
  }, [index, baseDelay]);

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
  contentContainerStyle 
}) {
  // Filter out null/undefined children
  const validChildren = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      <View style={contentContainerStyle}>
        {validChildren.map((child, index) => (
          <StaggerItem key={child.key || index} index={index} baseDelay={baseDelay}>
            {child}
          </StaggerItem>
        ))}
      </View>
    </View>
  );
}
