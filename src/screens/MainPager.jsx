import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import SwipeScreen from './SwipeScreen';
import MatchesScreen from './MatchesScreen';
import ProfileScreen from './ProfileScreen';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

export default function MainPager({ route, navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);

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

  // Common params to pass to all screens
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
          <SwipeScreen route={{ params: commonParams }} navigation={navigation} isNested />
        </View>
        <View style={{ width }}>
          <MatchesScreen route={{ params: commonParams }} navigation={navigation} isNested />
        </View>
        <View style={{ width }}>
          <ProfileScreen route={{ params: commonParams }} navigation={navigation} isNested />
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
