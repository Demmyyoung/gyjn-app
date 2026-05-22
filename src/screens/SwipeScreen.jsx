import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SWIPE_THRESHOLD = 120;
const RISE_DISTANCE = 24;
const CARD_HEIGHT = 420;

const C = {
  orange:  '#FF6B2C',   // primary CTA, logo, apply action, salary text
  mango:   '#FF9A62',   // hover states, secondary orange
  peach:   '#FFE0CC',   // pill backgrounds, light fills
  cream:   '#FFF5EE',   // app background (replaces #F2F0ED and #F5F5F5)
  purple:  '#7B4FE9',   // match celebration, premium badges
  gold:    '#FFD23F',   // save action, streaks (replaces #FFD60A)
  night:   '#1A1A2E',   // text, dark card headers (replaces #1A1A1A)
  sand:    '#F2EDE8',   // card body background
  green:   '#00C896',   // apply overlay, success (replaces #30D158)
  red:     '#FF4757',   // skip overlay, destructive (replaces #FF3B30)
  muted:   '#5A5A7A',   // body text (replaces #6B6B6B)
  hint:    '#BEBEBE',   // placeholder, hint text
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const TAG_COLORS = {
  green:   { bg: 'rgba(0, 200, 150, 0.12)', text: C.green }, // apply-green
  gold:    { bg: 'rgba(255, 210, 63, 0.12)', text: C.gold }, // wish-gold
  purple:  { bg: 'rgba(123, 79, 233, 0.12)', text: C.purple }, // lamp-purple
  default: { bg: C.peach,                text: C.muted }, // peach background
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
  const colors = job.colors && job.colors.length >= 2 ? job.colors : [C.orange, C.mango];

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.card}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardTop}
      >
        <View style={styles.matchPill}>
          <Text style={styles.matchPillText}>{job.match}% match</Text>
        </View>
        <View style={styles.cardLogoWrap}>
          <View style={styles.cardLogoBox}>
            <Text style={styles.cardLogoEmoji}>{job.emoji}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.cardBottom}>
        <Text style={styles.cardCompany}>{job.company}</Text>
        <Text style={styles.cardRole}>{job.role}</Text>

        <View style={styles.cardTagsRow}>
          {job.tags && job.tags.slice(0, 2).map((t, idx) => (
            <View key={idx} style={[styles.cardTag, { backgroundColor: TAG_COLORS[t.type]?.bg || TAG_COLORS.default.bg }]}>
              <Text style={[styles.cardTagText, { color: TAG_COLORS[t.type]?.text || TAG_COLORS.default.text }]}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.cardBottomFooter}>
          <Text style={styles.cardSalary}>{job.salary} / mo</Text>
          <Text style={styles.tapPrompt}>Tap details ➔</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── AnimatedCard ───────────────────────────────────────────────────────────
// Each card gets its own useAnimatedStyle hook for smooth deck animations.

function AnimatedCard({ job, isTop, stackIndex, translateX, translateY, onPress, swipedCardId, indexOffset }) {
  const animStyle = useAnimatedStyle(() => {
    // If this card just completed swiping out, hide it instantly before React removes it
    if (swipedCardId && swipedCardId.value === job.id) {
      return { opacity: 0, transform: [] };
    }

    // Determine the true visual index mapping during the hand-off frame
    const offset = indexOffset ? indexOffset.value : 0;
    const currentIndex = Math.max(0, stackIndex - offset);
    const activeIsTop = currentIndex === 0;

    if (activeIsTop) {
      return {
        opacity: 1,
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

    // Scale: 1.0 (top) down to ~0.84 (5th card)
    const baseScale = 1 - currentIndex * 0.04;
    // translateY: 0 (top) down and back to 120 (5th card)
    const baseTranslateY = currentIndex * RISE_DISTANCE;

    // Fade the back card in dynamically during the swipe gesture
    const baseOpacity = currentIndex >= 5 ? 0 : 1;
    const nextOpacity = currentIndex - 1 >= 5 ? 0 : 1;
    const currentOpacity = interpolate(progress, [0, 1], [baseOpacity, nextOpacity]);

    return {
      opacity: currentOpacity,
      transform: [
        { scale: interpolate(progress, [0, 1], [baseScale, baseScale + 0.04]) },
        { translateY: interpolate(progress, [0, 1], [baseTranslateY, baseTranslateY - RISE_DISTANCE]) },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, 80], [0, 1], 'clamp');
    return { opacity };
  });

  const nopeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-80, 0], [1, 0], 'clamp');
    return { opacity };
  });

  const saveStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, 80], [0, 1], 'clamp');
    return { opacity };
  });

  return (
    <Animated.View
      style={[styles.cardWrapper, animStyle, { zIndex: 100 - stackIndex }]}
      renderToHardwareTextureAndroid={true}
      shouldRasterizeIOS={true}
    >
      <JobCard job={job} onPress={isTop ? onPress : undefined} />
      {isTop && (
        <>
          <Animated.View style={[styles.stampOverlay, styles.stampLike, likeStyle]}>
            <Text style={styles.stampTextLike}>APPLY</Text>
          </Animated.View>
          <Animated.View style={[styles.stampOverlay, styles.stampNope, nopeStyle]}>
            <Text style={styles.stampTextNope}>SKIP</Text>
          </Animated.View>
          <Animated.View style={[styles.stampOverlay, styles.stampSave, saveStyle]}>
            <Text style={styles.stampTextSave}>SAVE</Text>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

// ─── LeavingCard ────────────────────────────────────────────────────────────

function LeavingCard({ item, onComplete }) {
  const { job, direction, startX = 0, startY = 0 } = item;
  const posX = useSharedValue(startX); 
  const posY = useSharedValue(startY);

  useEffect(() => {
    const targetX = direction === 'right' ? SCREEN_W * 1.5 : direction === 'left' ? -SCREEN_W * 1.5 : 0;
    const targetY = direction === 'down' ? SCREEN_H * 1.3 : 0;

    posX.value = withTiming(targetX, { duration: 350 });
    posY.value = withTiming(targetY, { duration: 350 }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, [direction, onComplete]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { rotate: `${interpolate(posX.value, [-SCREEN_W / 2, 0, SCREEN_W / 2], [-15, 0, 15])}deg` },
    ],
  }));

  return (
    <Animated.View 
      style={[styles.cardWrapper, style, { zIndex: 200 }]} 
      pointerEvents="none"
      renderToHardwareTextureAndroid={true}
      shouldRasterizeIOS={true}
    >
      <JobCard job={job} />
    </Animated.View>
  );
}

// ─── SwipeScreen ────────────────────────────────────────────────────────────

export default function SwipeScreen({ route, navigation, onMatchLand }) {
  const [jobs, setJobs] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [detailJob, setDetailJob] = useState(null);
  const [exitingCards, setExitingCards] = useState([]);
  const queueInitialized = useRef(false);

  // ── Initial job fetch (cached by React Query) ──────────────────────────────
  // staleTime=5min: switching tabs and back won't trigger a redundant network call.
  const { data: serverJobs = [], refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Seed the swipe queue from query cache exactly once on first load
  useEffect(() => {
    if (serverJobs.length > 0 && !queueInitialized.current) {
      queueInitialized.current = true;
      setJobs(serverJobs);
    }
  }, [serverJobs]);

  const handleReload = async () => {
    const { data } = await refetch();
    if (data) {
      setJobs(data);
    }
  };

  // ── Refill fetch (direct, bypasses React Query) ────────────────────────────
  // Tags each card with a unique ID so it doesn't key-clash with existing cards.
  const refillJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const refill = data.map(j => ({
        ...j,
        id: `${j.id}-refill-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      }));
      setJobs(prev => [...prev, ...refill]);
    }
  };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipedCardId = useSharedValue(null);
  const indexOffset = useSharedValue(0);

  const { userName } = route.params || { userName: 'Professional' };

  // Sync indexOffset back to 0 when React finishes updating the jobs array.
  const topJobId = jobs[0]?.id;
  useEffect(() => {
    swipedCardId.value = null;
    indexOffset.value = 0;
  }, [topJobId, swipedCardId, indexOffset]);

  // Called after a successful swipe animation completes
  const handleSwipeComplete = useCallback((direction) => {
    // FIX: Look up the job on the JS thread where state is always fresh
    const topJob = jobs[0]; 
    if (!topJob) return;

    // Capture current trajectory before resetting shared values
    const currentX = translateX.value;
    const currentY = translateY.value;

    // Handoff to exiting state for smooth flight
    setExitingCards(prev => [...prev, { 
      id: `${topJob.id}-exiting-${Date.now()}`, 
      job: topJob, 
      direction,
      startX: currentX,
      startY: currentY
    }]);

    // Instantly freeze the visual state on the UI thread
    // This perfectly bridges the gap before React re-renders the deck
    swipedCardId.value = topJob.id;
    indexOffset.value = 1;
    translateX.value = 0;
    translateY.value = 0;

    setJobs(prev => {
      const remaining = prev.slice(1);
      // Refill the deck when it gets low
      if (remaining.length < 5) {
        refillJobs();
      }
      return remaining;
    });

    if (direction === 'right') {
      // Persist match to Supabase
      supabase.from('matches').insert({
        job_id:              topJob.id,
        candidate_name:      route.params?.userName  ?? 'Professional',
        candidate_role:      route.params?.userRole  ?? '',
        about_me:            route.params?.aboutMe   ?? null,
        job_type_preference: route.params?.jobType   ?? null,
        skills:              route.params?.skills    ?? [],
        cv_url:              route.params?.cvUrl     ?? null,
        match_percent:       topJob.match ?? 0,
        status:              'Applied',
      }).then(({ error }) => {
        if (error) console.warn('[saveMatch]', error.message);
      });
      if (onMatchLand) onMatchLand(topJob);
    }
  }, [jobs, route.params, onMatchLand, translateX, translateY]);

  const hasTriggeredHaptic = useSharedValue(false);

  const gesture = Gesture.Pan()
    .minDistance(8)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.4;

      const THRESHOLD = 100;
      const isOver = Math.abs(translateX.value) > THRESHOLD || translateY.value > THRESHOLD;
      
      if (isOver && !hasTriggeredHaptic.value) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        hasTriggeredHaptic.value = true;
      } else if (!isOver && hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((e) => {
      'worklet';
      const THRESHOLD = 120;
      const isDown  = translateY.value > THRESHOLD && translateY.value > Math.abs(translateX.value);
      const isRight = translateX.value > THRESHOLD && !isDown;
      const isLeft  = translateX.value < -THRESHOLD && !isDown;

      if (isRight || isLeft || isDown) {
        const dir = isDown ? 'down' : isRight ? 'right' : 'left';
        const targetX = isRight ? SCREEN_W * 1.5 : isLeft ? -SCREEN_W * 1.5 : 0;
        const targetY = isDown ? SCREEN_H * 1.5 : 0;
        
        translateX.value = withTiming(targetX, { duration: 300 });
        translateY.value = withTiming(targetY, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(handleSwipeComplete)(dir);
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
      hasTriggeredHaptic.value = false;
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
    // For trigger buttons or programmatic swipes
    const targetX = dir === 'right' ? SCREEN_W * 1.5 : dir === 'left' ? -SCREEN_W * 1.5 : 0;
    const targetY = dir === 'down' ? SCREEN_H * 1.5 : 0;
    
    translateX.value = withTiming(targetX, { duration: 400 });
    translateY.value = withTiming(targetY, { duration: 400 }, (finished) => {
      if (finished) runOnJS(handleSwipeComplete)(dir);
    });
  }, [handleSwipeComplete]);

  // ── Render ────────────────────────────────────────────────────────────────
  const VISIBLE_COUNT = 5;
  const renderCount = Math.min(jobs.length, VISIBLE_COUNT + 1);
  const insets = useSafeAreaInsets();

  const renderCards = () => {
    if (jobs.length === 0) return null;
    return jobs.slice(0, renderCount).reverse().map((job, idx) => {
      const stackIndex = renderCount - 1 - idx;
      const isTop = stackIndex === 0;
      const card = (
        <AnimatedCard
          key={job.id}
          job={job}
          isTop={isTop}
          stackIndex={stackIndex}
          translateX={translateX}
          translateY={translateY}
          onPress={openDetail}
          swipedCardId={swipedCardId}
          indexOffset={indexOffset}
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
        <Text style={styles.logo}>🧞‍♂️ Jinni</Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <View style={styles.filterBtnCircle}>
            <Text style={styles.filterIcon}>☰</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Card Deck */}
      <View style={styles.deck}>
        {jobs.length === 0 ? (
          <View style={styles.emptyDeck}>
            <Text style={styles.emptyIcon}>🧞‍♂️</Text>
            <Text style={styles.emptyTitle}>Your wish is our command, {userName}!</Text>
            <Text style={styles.emptySubtitle}>But you've seen all roles for now. Check back tomorrow for more magic.</Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={handleReload}>
              <Text style={styles.reloadBtnText}>Refresh Wishes ↺</Text>
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
            <Text style={styles.sheetSalary}>{detailJob?.salary} / mo</Text>
            <Text style={styles.sheetSectionLabel}>ABOUT THE ROLE</Text>
            <Text style={styles.sheetDesc}>{detailJob?.description}</Text>
            <Text style={styles.sheetSectionLabel}>REQUIREMENTS</Text>
            {detailJob?.reqs.map((r, i) => <Text key={i} style={styles.sheetReq}>• {r}</Text>)}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ marginTop: 24 }}
              onPress={() => { setShowDetail(false); triggerSwipe('right'); }}
            >
              <LinearGradient
                colors={[C.orange, C.mango]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sheetApply}
              >
                <Text style={styles.sheetApplyText}>Apply via Jinni →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  logo: { fontSize: 22, fontWeight: '900', color: C.orange, letterSpacing: -0.5 },
  filterBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterBtnCircle: {
    width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  filterIcon: { fontSize: 16, color: C.night },

  // Deck
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: { position: 'absolute' },

  // Card — soft ambient shadow, no borders
  card: {
    width: CARD_W, height: CARD_HEIGHT, borderRadius: 28, overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: C.night, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  cardTop: { flex: 1, justifyContent: 'space-between', padding: 20 },
  matchPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  matchPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardLogoWrap: { alignSelf: 'flex-start' },
  cardLogoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLogoEmoji: { fontSize: 32 },
  cardBottom: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  cardCompany: {
    fontSize: 12,
    fontWeight: '700',
    color: C.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardRole: {
    fontSize: 22,
    fontWeight: '800',
    color: C.night,
    letterSpacing: -0.5,
  },
  cardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardBottomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    paddingTop: 10,
  },
  cardSalary: {
    fontSize: 15,
    fontWeight: '800',
    color: C.night,
  },
  tapPrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.hint,
  },

  // Stamp Overlays
  stampOverlay: {
    position: 'absolute',
    top: 36,
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  stampLike: {
    left: 36,
    borderColor: C.green,
    transform: [{ rotate: '-12deg' }],
  },
  stampNope: {
    right: 36,
    borderColor: C.red,
    transform: [{ rotate: '12deg' }],
  },
  stampSave: {
    alignSelf: 'center',
    top: CARD_HEIGHT / 2 - 30,
    borderColor: C.gold,
    transform: [{ rotate: '-5deg' }],
  },
  stampTextLike: {
    fontSize: 24,
    fontWeight: '900',
    color: C.green,
    letterSpacing: 2,
  },
  stampTextNope: {
    fontSize: 24,
    fontWeight: '900',
    color: C.red,
    letterSpacing: 2,
  },
  stampTextSave: {
    fontSize: 24,
    fontWeight: '900',
    color: C.gold,
    letterSpacing: 2,
  },

  // Empty state
  emptyDeck: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyIcon: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: C.night, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.hint, textAlign: 'center', lineHeight: 22 },
  reloadBtn: { backgroundColor: C.orange, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 12 },
  reloadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Detail sheet
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: SCREEN_H * 0.7 },
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetRole: { fontSize: 22, fontWeight: '800', color: C.night, marginBottom: 4 },
  sheetCompany: { fontSize: 14, fontWeight: '600', color: C.orange, marginBottom: 14 },
  sheetSectionLabel: { fontSize: 11, fontWeight: '700', color: C.hint, letterSpacing: 0.8, marginTop: 18, marginBottom: 6 },
  sheetSalary: { fontSize: 20, fontWeight: '800', color: C.night },
  sheetDesc: { fontSize: 14, color: C.muted, lineHeight: 22 },
  sheetReq: { fontSize: 14, color: C.muted, marginBottom: 4, lineHeight: 22 },
  sheetApply: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  sheetApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '600' },
});
