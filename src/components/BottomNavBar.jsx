import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 3;

export default function BottomNavBar({ activeIndex, onTabPress }) {
  const translateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex * TAB_WIDTH,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.highlight, { transform: [{ translateX }] }]} />
      
      <TouchableOpacity style={styles.tab} onPress={() => onTabPress(0)}>
        <Feather name="search" size={22} color={activeIndex === 0 ? '#FF6B2C' : '#ABABAB'} />
        <Text style={[styles.label, activeIndex === 0 && styles.activeText]}>Discover</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onTabPress(1)}>
        <Feather name="message-circle" size={22} color={activeIndex === 1 ? '#FF6B2C' : '#ABABAB'} />
        <Text style={[styles.label, activeIndex === 1 && styles.activeText]}>Matches</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onTabPress(2)}>
        <Feather name="user" size={22} color={activeIndex === 2 ? '#FF6B2C' : '#ABABAB'} />
        <Text style={[styles.label, activeIndex === 2 && styles.activeText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 10,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ABABAB',
    marginTop: 3,
  },
  activeText: {
    color: '#FF6B2C',
  },
  highlight: {
    position: 'absolute',
    top: 5,
    left: (TAB_WIDTH - 60) / 2,
    width: 60,
    height: 44,
    backgroundColor: 'rgba(255, 107, 44, 0.08)',
    borderRadius: 30,
  }
});
