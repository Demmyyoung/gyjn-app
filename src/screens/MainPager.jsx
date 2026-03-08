import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import SwipeScreen from './SwipeScreen';
import MatchesScreen from './MatchesScreen';
import ProfileScreen from './ProfileScreen';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

export default function MainPager({ route, navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);

  // BUG FIX: Track matches in state so SwipeScreen can add them
  // and MatchesScreen can display them.
  const [matches, setMatches] = useState([]);

  const handleTabPress = (index) => {
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // Called by SwipeScreen when user swipes right on a job
  const handleMatchLand = (job) => {
    if (!job) return;
    setMatches(prev => [...prev, job]);
  };

  const commonParams = { ...route.params };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        scrollEventThrottle={16}
        scrollEnabled={false}
      >
        <View style={{ width }}>
          <SwipeScreen
            route={{ params: commonParams }}
            navigation={navigation}
            onMatchLand={handleMatchLand}
            isNested
          />
        </View>
        <View style={{ width }}>
          <MatchesScreen
            route={{ params: { ...commonParams, matches } }}
            navigation={navigation}
            isNested
          />
        </View>
        <View style={{ width }}>
          <ProfileScreen
            route={{ params: { ...commonParams, matchCount: matches.length } }}
            navigation={navigation}
            isNested
          />
        </View>
      </ScrollView>

      <BottomNavBar activeIndex={activeIndex} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
