import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const scale = new Animated.Value(0.5);
  const opacity = new Animated.Value(0);
  const progress = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>💼</Text>
        </View>
        {/* Wordmark and Tagline */}
        <Text style={styles.wordmark}>Jinni</Text>
        <Text style={styles.tagline}>MAKE A WISH. GET YOUR JOB.</Text>
      </Animated.View>

      <View style={styles.loaderTrack}>
        <Animated.View style={[styles.loaderBar, { width: barWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EE',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 44, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 44, 0.2)',
    marginBottom: 4,
  },
  icon: { fontSize: 48 },
  wordmark: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FF6B2C',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 12,
    color: '#ABABAB',
    fontWeight: '600',
    letterSpacing: 3,
  },
  loaderTrack: {
    position: 'absolute',
    bottom: 80,
    width: 60,
    height: 3,
    backgroundColor: 'rgba(26,26,26,0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#FF6B2C',
    borderRadius: 10,
  },
});
