import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Modal, Pressable, Animated, PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { JOBS } from '../data/jobs';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SWIPE_THRESHOLD = 120;       // px to trigger a dismissal
const RISE_DISTANCE   = 24;        // px the next card rises
const NEXT_BASE_SCALE = 0.95;      // scale of the 2nd card at rest
const CARD_HEIGHT     = 340;       // approximate card height

// ─── Helpers ────────────────────────────────────────────────────────────────

const TAG_COLORS = {
  green:   { bg: 'rgba(0,200,150,0.12)', text: '#00C896' },
  gold:    { bg: 'rgba(255,193,7,0.12)', text: '#d4a017' },
  purple:  { bg: 'rgba(108,92,231,0.1)', text: '#6C5CE7' },
  default: { bg: '#EBEBEB',              text: '#555572' },
};

function DotGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.dotGridContainer}>
        {Array.from({ length: 800 }).map((_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );
}

function Tag({ label, type }) {
  const c = TAG_COLORS[type] || TAG_COLORS.default;
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ─── JobCard ────────────────────────────────────────────────────────────────
// Purely a renderer. All gesture logic lives in SwipeScreen.

function JobCard({ job, pan, isTop, onPress, likeOpacity, nopeOpacity, dismissOpacity }) {
  const rotate = pan
    ? pan.x.interpolate({
        inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
        outputRange: ['-15deg', '0deg', '15deg'],
      })
    : '0deg';

  return (
    <Animated.View
      style={[
        styles.card,
        isTop && pan && {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={isTop ? onPress : null}
        style={{ flex: 1 }}
      >
        {/* TOP HALF — brand color, logo bottom-left */}
        <View style={[styles.cardTop, { backgroundColor: job.colors[0] }]}>
          <View style={styles.matchPill}>
            <Text style={styles.matchPillText}>{job.match}% match ⚡</Text>
          </View>
          <View style={styles.cardLogoWrap}>
            <View style={[styles.cardLogoBox, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
              <Text style={styles.cardLogoEmoji}>{job.emoji}</Text>
            </View>
          </View>
        </View>

        {/* BOTTOM HALF — dark, left-aligned details */}
        <View style={styles.cardBottom}>
          <Text style={styles.cardCompany}>{job.company}</Text>
          <Text style={styles.cardRole}>{job.role}</Text>
          <Text style={styles.cardSalary}>{job.salary} / yr</Text>
        </View>
      </TouchableOpacity>

      {/* Swipe feedback labels — only on top card */}
      {isTop && likeOpacity && (
        <>
          <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={styles.likeLabelText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeLabelText}>NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.dismissLabel, { opacity: dismissOpacity }]}>
            <Text style={styles.dismissLabelText}>DISMISS</Text>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

// ─── SwipeScreen ─────────────────────────────────────────────────────────────
// Owns all animation state. Passes pan + derived values down to cards.

export default function SwipeScreen({ route, navigation }) {
  const [jobs, setJobs]           = useState([...JOBS]);
  const [showDetail, setShowDetail] = useState(false);
  const [detailJob, setDetailJob]   = useState(null);

  // ── Top-card animation state ──────────────────────────────────────────────
  // pan drives EVERYTHING: top card position, rotation, AND next-card rise.
  const pan            = useRef(new Animated.ValueXY()).current;
  const likeOpacity    = useRef(new Animated.Value(0)).current;
  const nopeOpacity    = useRef(new Animated.Value(0)).current;
  const dismissOpacity = useRef(new Animated.Value(0)).current;

  // dragMag = magnitude of current drag (0 → 1, clamped at SWIPE_THRESHOLD).
  // Derived from pan so background cards animate in sync — single source of truth.
  const dragMag = useRef(
    Animated.add(
      Animated.multiply(pan.x, pan.x),
      Animated.multiply(pan.y, pan.y)
    )
  ).current; // Note: we'll use a simpler listener approach below for cross-platform compat.

  // We drive a separate progress value [0,1] from the pan listener.
  const stackProgress = useRef(new Animated.Value(0)).current;

  // Reset pan + stack for the NEW top card after each swipe.
  // useLayoutEffect fires synchronously after React commits the new DOM
  // (old card is already unmounted), so there's zero flash.
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    stackProgress.setValue(0);
  }, [jobs.length]);

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,

      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: g.dy * 0.5 });

        // stackProgress: how far along the gesture is (0 = rest, 1 = threshold reached)
        const dist = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
        stackProgress.setValue(Math.min(1, dist / SWIPE_THRESHOLD));

        // Swipe labels
        if (g.dy > 30 && Math.abs(g.dy) > Math.abs(g.dx)) {
          dismissOpacity.setValue(Math.min(1, (g.dy - 30) / 80));
          likeOpacity.setValue(0); nopeOpacity.setValue(0);
        } else if (g.dx > 30) {
          likeOpacity.setValue(Math.min(1, (g.dx - 30) / 80));
          nopeOpacity.setValue(0); dismissOpacity.setValue(0);
        } else if (g.dx < -30) {
          nopeOpacity.setValue(Math.min(1, (-g.dx - 30) / 80));
          likeOpacity.setValue(0); dismissOpacity.setValue(0);
        } else {
          likeOpacity.setValue(0); nopeOpacity.setValue(0); dismissOpacity.setValue(0);
        }
      },

      onPanResponderRelease: (_, g) => {
        const isDown = g.dy > SWIPE_THRESHOLD && Math.abs(g.dy) > Math.abs(g.dx);
        const isRight = g.dx > SWIPE_THRESHOLD;
        const isLeft  = g.dx < -SWIPE_THRESHOLD;

        if (isDown || isRight || isLeft) {
          flyCard(isDown ? 'down' : isRight ? 'right' : 'left', g);
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.spring(stackProgress, { toValue: 0, useNativeDriver: true }),
            Animated.timing(likeOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(nopeOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(dismissOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  // ── Fly card off-screen, then remove from deck ────────────────────────────
  const flyCard = useCallback((direction, gesture) => {
    const vx = gesture?.vx ?? 0;
    const vy = gesture?.vy ?? 0;

    let toValue = { x: 0, y: 0 };
    if (direction === 'right') toValue = { x: SCREEN_W * 1.5, y: (vy * 200) };
    if (direction === 'left')  toValue = { x: -SCREEN_W * 1.5, y: (vy * 200) };
    if (direction === 'down')  toValue = { x: vx * 200, y: SCREEN_H * 1.5 };

    Animated.parallel([
      Animated.timing(pan, {
        toValue,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(likeOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(nopeOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(dismissOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Haptics
      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Remove top card — pan/stackProgress reset handled by useLayoutEffect
      setJobs(prev => prev.slice(1));
    });
  }, [pan, stackProgress]);

  // Programmatic swipe (for "Apply" button in detail sheet)
  const triggerSwipe = (dir) => flyCard(dir, {});

  const openDetail = () => {
    if (jobs.length === 0) return;
    setDetailJob(jobs[0]);
    setShowDetail(true);
  };

  // ── Background card interpolations (driven by stackProgress) ─────────────
  // Card at position 1 (next): scale 0.95→1.0, translateY rises by RISE_DISTANCE
  // Card at position 2: scale 0.91→0.95, translateY rises half as much
  const getBackgroundCardStyle = (stackIndex) => {
    const baseScale = 1 - stackIndex * 0.04;
    const peakScale = baseScale + 0.04;
    const baseTy    = stackIndex * RISE_DISTANCE;
    const peakTy    = baseTy - RISE_DISTANCE;

    return {
      transform: [
        {
          scale: stackProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [baseScale, peakScale],
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: stackProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [baseTy, peakTy],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  // ── Sheet pan-to-close ────────────────────────────────────────────────────
  const sheetPan     = useRef(new Animated.ValueXY()).current;
  const sheetResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetPan.setValue({ x: 0, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          setShowDetail(false);
          sheetPan.setValue({ x: 0, y: 0 });
        } else {
          Animated.spring(sheetPan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // ── Render ────────────────────────────────────────────────────────────────
  // Show 3 visible + 1 invisible pre-mounted card (4th card is warm, opacity 0)
  const VISIBLE_COUNT = 3;
  const renderCount   = Math.min(jobs.length, VISIBLE_COUNT + 1);

  const renderCards = () => {
    if (jobs.length === 0) return null;
    return jobs.slice(0, renderCount).reverse().map((job, idx) => {
      const stackIndex = renderCount - 1 - idx;
      const isTop      = stackIndex === 0;
      const isPreload  = stackIndex >= VISIBLE_COUNT;

      return (
        <Animated.View
          key={job.id}
          style={[
            styles.cardWrapper,
            isTop && styles.cardWrapperTop,
            !isTop && !isPreload && getBackgroundCardStyle(stackIndex),
            { zIndex: renderCount - stackIndex, opacity: isPreload ? 0 : 1 },
          ]}
          {...(isTop ? panResponder.panHandlers : {})}
        >
          <JobCard
            job={job}
            pan={isTop ? pan : null}
            isTop={isTop}
            onPress={isPreload ? null : openDetail}
            likeOpacity={isTop ? likeOpacity : null}
            nopeOpacity={isTop ? nopeOpacity : null}
            dismissOpacity={isTop ? dismissOpacity : null}
          />
        </Animated.View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DotGrid />
      <View style={styles.topBar}>
        <View style={styles.topNavLine} />
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deck}>
        {jobs.length === 0 ? (
          <View style={styles.emptyDeck}>
            <Text style={styles.emptyIcon}>💤</Text>
            <Text style={styles.emptyTitle}>You've seen them all!</Text>
            <Text style={styles.emptySubtitle}>New roles are added daily.</Text>
            <TouchableOpacity onPress={() => setJobs([...JOBS])}>
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.reloadBtn}>
                <Text style={styles.reloadBtnText}>Refresh Jobs ↺</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : renderCards()}
      </View>

      {/* Job detail bottom sheet */}
      <Modal visible={showDetail} transparent animationType="slide">
        <Pressable style={styles.sheetBg} onPress={() => setShowDetail(false)} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{
                translateY: sheetPan.y.interpolate({
                  inputRange: [-100, 0, 1000],
                  outputRange: [0, 0, 1000],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
          {...sheetResponder.panHandlers}
        >
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
            <TouchableOpacity onPress={() => { setShowDetail(false); triggerSwipe('right'); }}>
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.sheetApply}>
                <Text style={styles.sheetApplyText}>Apply via GYJN ↗</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  dotGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 25, padding: 10, opacity: 0.15 },
  dot:              { width: 2, height: 2, borderRadius: 1, backgroundColor: '#6C5CE7' },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  topNavLine:       { width: 60, height: 4, borderRadius: 2, backgroundColor: '#1A1A2E' },
  bellBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellIcon:         { fontSize: 20 },

  // Deck
  deck:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper:  { position: 'absolute' },
  cardWrapperTop: { zIndex: 10 },

  // Card
  card: {
    width: CARD_W,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#fff',
  },
  cardTop: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  matchPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  matchPillText:  { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  cardLogoWrap:   { alignSelf: 'flex-start' },
  cardLogoBox:    { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardLogoEmoji:  { fontSize: 30 },
  cardBottom: {
    backgroundColor: '#1A1A2E',
    padding: 20,
    paddingTop: 16,
    gap: 4,
  },
  cardCompany: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase' },
  cardRole:    { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  cardSalary:  { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Swipe labels
  likeLabel:    { position: 'absolute', top: 28, left: 20, borderWidth: 4, borderColor: '#00C896', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4, transform: [{ rotate: '-15deg' }] },
  likeLabelText: { fontSize: 28, fontWeight: '900', color: '#00C896' },
  nopeLabel:    { position: 'absolute', top: 28, right: 20, borderWidth: 4, borderColor: '#FF4D67', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4, transform: [{ rotate: '15deg' }] },
  nopeLabelText: { fontSize: 28, fontWeight: '900', color: '#FF4D67' },
  dismissLabel: { position: 'absolute', bottom: 60, alignSelf: 'center', borderWidth: 4, borderColor: '#9898B0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4 },
  dismissLabelText: { fontSize: 28, fontWeight: '900', color: '#9898B0' },

  // Empty deck
  emptyDeck:    { alignItems: 'center', gap: 12, padding: 40 },
  emptyIcon:    { fontSize: 64 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  emptySubtitle: { fontSize: 14, color: '#9898B0' },
  reloadBtn:    { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 40, marginTop: 8 },
  reloadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Detail sheet
  sheetBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: SCREEN_H * 0.7 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  sheetRole:    { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  sheetCompany: { fontSize: 14, fontWeight: '600', color: '#6C5CE7', marginBottom: 14 },
  sheetSectionLabel: { fontSize: 11, fontWeight: '700', color: '#9898B0', letterSpacing: 0.8, marginTop: 18, marginBottom: 6 },
  sheetSalary:  { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  sheetDesc:    { fontSize: 14, color: '#555572', lineHeight: 22 },
  sheetReq:     { fontSize: 14, color: '#555572', marginBottom: 4, lineHeight: 22 },
  sheetApply:   { paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  sheetApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag:          { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  tagText:      { fontSize: 11, fontWeight: '600' },
});
