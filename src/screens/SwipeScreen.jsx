import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Pressable, Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { JOBS } from '../data/jobs';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SWIPE_THRESHOLD = 120;
const RISE_DISTANCE = 24;
const CARD_HEIGHT = 420;

// ─── Helpers ────────────────────────────────────────────────────────────────

const TAG_COLORS = {
  green:   { bg: 'rgba(186,219,148,0.15)', text: '#5A8C2E' },
  gold:    { bg: 'rgba(255,190,118,0.15)', text: '#E17A14' },
  purple:  { bg: 'rgba(171,100,83,0.08)',  text: '#AB6453' },
  default: { bg: '#F0F0F0',                text: '#6B6B6B' },
};

function Tag({ label, type }) {
  const c = TAG_COLORS[type] || TAG_COLORS.default;
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ─── JobCard (pure renderer) ────────────────────────────────────────────────

function JobCard({ job, onPress }) {
  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} style={styles.card}>
      <View style={[styles.cardTop, { backgroundColor: job.colors[0] }]}>
        <View style={styles.matchPill}>
          <Text style={styles.matchPillText}>{job.match}% match</Text>
        </View>
        <View style={styles.cardLogoWrap}>
          <View style={[styles.cardLogoBox, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
            <Text style={styles.cardLogoEmoji}>{job.emoji}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardCompany}>{job.company}</Text>
        <Text style={styles.cardRole}>{job.role}</Text>
        <Text style={styles.cardSalary}>{job.salary} / yr</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── AnimatedCard ───────────────────────────────────────────────────────────
// Each card gets its own useAnimatedStyle hook for smooth deck animations.

function AnimatedCard({ job, isTop, stackIndex, translateX, translateY, onPress, isPreload }) {
  const animStyle = useAnimatedStyle(() => {
    if (isTop) {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${interpolate(translateX.value, [-200, 200], [-10, 10])}deg` },
        ],
      };
    }
    // Background card rises + scales as user drags the top card
    const dist = Math.sqrt(translateX.value ** 2 + translateY.value ** 2);
    const progress = Math.min(1, dist / SWIPE_THRESHOLD);
    const baseScale = 1 - stackIndex * 0.04;
    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [baseScale, baseScale + 0.04]) },
        { translateY: interpolate(progress, [0, 1], [stackIndex * RISE_DISTANCE, (stackIndex - 1) * RISE_DISTANCE]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.cardWrapper, animStyle, { zIndex: 100 - stackIndex, opacity: isPreload ? 0 : 1 }]}
    >
      <JobCard job={job} onPress={isTop ? onPress : undefined} />
    </Animated.View>
  );
}

// ─── LeavingCard ────────────────────────────────────────────────────────────

function LeavingCard({ item, onComplete }) {
  const { job, startX, startY, direction, vx, vy } = item;
  const posX = useSharedValue(startX);
  const posY = useSharedValue(startY);

  useEffect(() => {
    const targetX = direction === 'right' ? SCREEN_W * 1.5 : direction === 'left' ? -SCREEN_W * 1.5 : vx * 400;
    const targetY = direction === 'down' ? SCREEN_H * 1.5 : vy * 400;
    posX.value = withTiming(targetX, { duration: 350 });
    posY.value = withTiming(targetY, { duration: 350 }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { rotate: `${interpolate(posX.value, [-SCREEN_W / 2, 0, SCREEN_W / 2], [-15, 0, 15])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, style, { zIndex: 200 }]} pointerEvents="none">
      <JobCard job={job} />
    </Animated.View>
  );
}

// ─── SwipeScreen ────────────────────────────────────────────────────────────

export default function SwipeScreen({ route, navigation, onMatchLand }) {
  const [jobs, setJobs] = useState(JOBS.slice(0, 10));
  const [showDetail, setShowDetail] = useState(false);
  const [detailJob, setDetailJob] = useState(null);
  const [exitingCards, setExitingCards] = useState([]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Called on the JS thread after a successful swipe gesture
  const handleSwipeComplete = useCallback((direction, currentX, currentY, vx, vy) => {
    const topJob = jobs[0];
    if (!topJob) return;

    setExitingCards(prev => [...prev, {
      id: Date.now() + Math.random(),
      job: topJob, startX: currentX, startY: currentY, direction, vx, vy,
    }]);

    setJobs(prev => {
      const remaining = prev.slice(1);
      if (remaining.length <= 2) {
        return [...remaining, ...JOBS.map(j => ({ ...j, id: `${j.id}-${Date.now()}` }))];
      }
      return remaining;
    });

    translateX.value = 0;
    translateY.value = 0;

    if (direction === 'right') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onMatchLand) setTimeout(() => onMatchLand(topJob), 350);
    }
  }, [jobs, onMatchLand]);

  // ── Gesture ───────────────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.5;
    })
    .onEnd((e) => {
      const isDown  = e.translationY > SWIPE_THRESHOLD && Math.abs(e.translationY) > Math.abs(e.translationX);
      const isRight = e.translationX > SWIPE_THRESHOLD;
      const isLeft  = e.translationX < -SWIPE_THRESHOLD;

      if (isRight || isLeft || isDown) {
        const dir = isDown ? 'down' : isRight ? 'right' : 'left';
        runOnJS(handleSwipeComplete)(dir, e.translationX, e.translationY * 0.5, e.velocityX / 1000, e.velocityY / 1000);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const removeExitingCard = useCallback((id) => {
    setExitingCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const openDetail = useCallback(() => {
    if (jobs.length === 0) return;
    setDetailJob(jobs[0]);
    setShowDetail(true);
  }, [jobs]);

  const triggerSwipe = useCallback((dir) => {
    handleSwipeComplete(dir, dir === 'right' ? SCREEN_W : -SCREEN_W, 0, 0, 0);
  }, [handleSwipeComplete]);

  // ── Render ────────────────────────────────────────────────────────────────
  const VISIBLE_COUNT = 3;
  const renderCount = Math.min(jobs.length, VISIBLE_COUNT + 1);
  const insets = useSafeAreaInsets();

  const renderCards = () => {
    if (jobs.length === 0) return null;
    return jobs.slice(0, renderCount).reverse().map((job, idx) => {
      const stackIndex = renderCount - 1 - idx;
      const isTop = stackIndex === 0;
      const isPreload = stackIndex >= VISIBLE_COUNT;

      const card = (
        <AnimatedCard
          key={job.id}
          job={job}
          isTop={isTop}
          stackIndex={stackIndex}
          translateX={translateX}
          translateY={translateY}
          onPress={openDetail}
          isPreload={isPreload}
        />
      );

      return isTop ? (
        <GestureDetector key={job.id} gesture={gesture}>
          {card}
        </GestureDetector>
      ) : card;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header — logo center, filter right */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.logo}>GYJN</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Card Deck */}
      <View style={styles.deck}>
        {jobs.length === 0 ? (
          <View style={styles.emptyDeck}>
            <Text style={styles.emptyIcon}>💤</Text>
            <Text style={styles.emptyTitle}>You've seen them all!</Text>
            <Text style={styles.emptySubtitle}>New roles are added daily.</Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={() => setJobs([...JOBS])}>
              <Text style={styles.reloadBtnText}>Refresh Jobs ↺</Text>
            </TouchableOpacity>
          </View>
        ) : renderCards()}

        {exitingCards.map(item => (
          <LeavingCard key={item.id} item={item} onComplete={() => removeExitingCard(item.id)} />
        ))}
      </View>

      {/* Detail bottom sheet */}
      <Modal visible={showDetail} transparent animationType="slide">
        <Pressable style={styles.sheetBg} onPress={() => setShowDetail(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetRole}>{detailJob?.role}</Text>
            <Text style={styles.sheetCompany}>{detailJob?.company}</Text>
            <View style={styles.tagsRow}>
              {detailJob?.tags.map((t, i) => <Tag key={i} label={t.label} type={t.type} />)}
            </View>
            <Text style={styles.sheetSectionLabel}>SALARY</Text>
            <Text style={styles.sheetSalary}>{detailJob?.salary} / year</Text>
            <Text style={styles.sheetSectionLabel}>ABOUT THE ROLE</Text>
            <Text style={styles.sheetDesc}>{detailJob?.desc}</Text>
            <Text style={styles.sheetSectionLabel}>REQUIREMENTS</Text>
            {detailJob?.reqs.map((r, i) => <Text key={i} style={styles.sheetReq}>• {r}</Text>)}
            <TouchableOpacity style={styles.sheetApply} onPress={() => { setShowDetail(false); triggerSwipe('right'); }}>
              <Text style={styles.sheetApplyText}>Apply via GYJN →</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  logo: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
  filterBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterIcon: { fontSize: 18, color: '#1A1A1A' },

  // Deck
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: { position: 'absolute' },

  // Card — soft ambient shadow, no borders
  card: {
    width: CARD_W, height: CARD_HEIGHT, borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  cardTop: { flex: 1, justifyContent: 'space-between', padding: 20 },
  matchPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  matchPillText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  cardLogoWrap: { alignSelf: 'flex-start' },
  cardLogoBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLogoEmoji: { fontSize: 28 },
  cardBottom: { backgroundColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 22, gap: 4 },
  cardCompany: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' },
  cardRole: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  cardSalary: { fontSize: 14, fontWeight: '600', color: '#AB6453', marginTop: 2 },

  // Empty state
  emptyDeck: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyIcon: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#ABABAB', textAlign: 'center', lineHeight: 22 },
  reloadBtn: { backgroundColor: '#AB6453', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 12 },
  reloadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Detail sheet
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: SCREEN_H * 0.7 },
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetRole: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  sheetCompany: { fontSize: 14, fontWeight: '600', color: '#AB6453', marginBottom: 14 },
  sheetSectionLabel: { fontSize: 11, fontWeight: '700', color: '#ABABAB', letterSpacing: 0.8, marginTop: 18, marginBottom: 6 },
  sheetSalary: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  sheetDesc: { fontSize: 14, color: '#6B6B6B', lineHeight: 22 },
  sheetReq: { fontSize: 14, color: '#6B6B6B', marginBottom: 4, lineHeight: 22 },
  sheetApply: { backgroundColor: '#AB6453', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  sheetApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '600' },
});
