import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, TextInput,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  runOnJS, interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const C = {
  orange: '#FF6B2C',
  night:  '#1A1A2E',
  cream:  '#FFF5EE',
  muted:  '#5A5A7A',
  hint:   '#BEBEBE',
  border: '#EBEBEB',
};

const STATUS_COLORS = {
  Applied:      { bg: 'rgba(255,107,44,0.12)', text: C.orange },
  Interviewing: { bg: 'rgba(123,79,233,0.12)', text: '#7B4FE9' },
  Hired:        { bg: 'rgba(0,200,150,0.12)',  text: '#00C896' },
};

function MatchCard({ item, isNew, onPress, userType }) {
  const s = STATUS_COLORS[item.status] || STATUS_COLORS.Applied;
  const canChat = item.status === 'Interviewing' || item.status === 'Hired';

  // Calculate unread badge state
  const otherSenderType = userType === 'employer' ? 'candidate' : 'employer';
  const msgs = item.messages ?? [];
  const sortedMsgs = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const lastMsg = sortedMsgs[sortedMsgs.length - 1];
  const hasUnread = lastMsg && lastMsg.sender_type === otherSenderType;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.8 : 1.0}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Logo / initials box */}
      <View style={styles.logoBox}>
        <Text style={styles.logoEmoji}>{item.jobs?.emoji ?? '💼'}</Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardRole} numberOfLines={1}>
          {item.jobs?.role ?? 'Role'}
        </Text>
        <Text style={styles.cardCompany} numberOfLines={1}>
          {item.jobs?.company ?? ''}{item.jobs?.job_type ? ` · ${item.jobs.job_type}` : ''}
        </Text>
        {item.candidate_name ? (
          <Text style={styles.cardCandidate} numberOfLines={1}>
            👤 {item.candidate_name}
          </Text>
        ) : null}
      </View>

      {/* Right: status + new badge */}
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.text }]}>{item.status ?? 'Applied'}</Text>
        </View>
        {canChat && onPress && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={styles.chatActionIndicator}>
              <Text style={styles.chatActionText}>Chat 💬</Text>
            </View>
            {hasUnread && (
              <View style={styles.unreadDot} />
            )}
          </View>
        )}
        {isNew && !canChat && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Custom wrapper to manage row-level gesture state and exit animations.
// It is written with React Native Reanimated to ensure smooth 60fps/120fps animations.
// Reanimated runs animations directly on the UI thread, bypassing the React JS thread.
function SwipeableRow({ item, isNew, onUnapplyConfirmed, navigation, userName, userType }) {
  const swipeableRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const { width: SCREEN_W } = Dimensions.get('window');

  // Animated values for layout changes.
  // translateX moves the card left/right.
  // rowHeight handles collapsing. Initially -1 (sentinel for auto-height).
  // opacity controls fading.
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(-1);
  const opacity = useSharedValue(1);

  const canChat = item.status === 'Interviewing' || item.status === 'Hired';

  // useAnimatedStyle connects the shared animation values to the component's visual styles.
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      height: rowHeight.value === -1 ? undefined : rowHeight.value,
      opacity: opacity.value,
    };
  });

  // This callback measures the item height when it first mounts on the layout.
  const onLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    if (measuredHeight === 0 && height > 0) {
      setMeasuredHeight(height);
    }
  };

  // Perform a smooth 2-stage exit animation:
  // Stage 1: Slide card to the left off-screen while fading out (250ms).
  // Stage 2: Collapse card height to 0 (200ms) so items below slide up dynamically.
  // When completed, run the deletion logic on the JS thread.
  const startDeleteAnimation = () => {
    swipeableRef.current?.close();

    // Lock the height to the measured value before starting the collapse transition
    rowHeight.value = measuredHeight;

    translateX.value = withTiming(-SCREEN_W, { duration: 250 }, (finished) => {
      if (finished) {
        rowHeight.value = withTiming(0, { duration: 200 }, (heightFinished) => {
          if (heightFinished) {
            // runOnJS redirects execution back to the main React thread (JS thread)
            runOnJS(onUnapplyConfirmed)(item);
          }
        });
      }
    });
    opacity.value = withTiming(0, { duration: 250 });
  };

  const handleUnapplyPress = () => {
    Alert.alert(
      'Un - apply',
      'Do you want to un - apply for this job?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRef.current?.close();
          },
        },
        {
          text: 'Un - apply',
          style: 'destructive',
          onPress: startDeleteAnimation,
        },
      ]
    );
  };

  const handleCardPress = () => {
    if (canChat && navigation) {
      navigation.navigate('Chat', { match: item, userName, userType });
    }
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.unapplySwipeBtn}
      activeOpacity={0.8}
      onPress={handleUnapplyPress}
    >
      <Text style={styles.unapplySwipeText}>Un - apply ✕</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[styles.swipeableItemWrap, animatedStyle]}
      onLayout={onLayout}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
      >
        <MatchCard
          item={item}
          isNew={isNew}
          onPress={canChat ? handleCardPress : undefined}
          userType={userType}
        />
      </Swipeable>
    </Animated.View>
  );
}

export default function MatchesScreen({ route, navigation }) {
  const { userName, userType } = route.params || {};
  const isEmployer = userType === 'employer';
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');

  const { data: matches = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['matches', userName],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          jobs(role, company, emoji, job_type, salary),
          messages(text, sender_type, created_at)
        `)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, // 30 s — cached between tab switches
  });

  // Realtime matches & messages cache invalidation listener
  // Updates pipeline status and message unread dots on screen dynamically
  useEffect(() => {
    const channel = supabase
      .channel('matches-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          refetch(); // Invalidate matches cache to fetch new messages and update unread dot indicators
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          refetch(); // Invalidate matches cache on pipeline status updates
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const stageCounts = useMemo(() => {
    const counts = {
      All: matches.length,
      Applied: 0,
      Interviewing: 0,
      Hired: 0,
    };
    matches.forEach((item) => {
      const status = item.status || 'Applied';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let result = [...matches]; // Copy to avoid mutating original
    
    // Sort logic: Hired items first when viewing 'All'
    if (selectedStage === 'All') {
      result.sort((a, b) => {
        const aHired = a.status === 'Hired' ? 1 : 0;
        const bHired = b.status === 'Hired' ? 1 : 0;
        if (aHired !== bHired) {
          return bHired - aHired; // 1 (Hired) comes before 0
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else {
      result = result.filter((item) => (item.status || 'Applied') === selectedStage);
    }
    
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase().trim();
    return result.filter((item) => {
      const role = item.jobs?.role?.toLowerCase() || '';
      const company = item.jobs?.company?.toLowerCase() || '';
      return role.includes(query) || company.includes(query);
    });
  }, [matches, selectedStage, searchQuery]);

  // Handle un-applying from a job posting after animation completes
  const handleUnapplyConfirmed = useCallback(async (item) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('match_id', item.match_id);
    if (error) {
      Alert.alert('Error', `Could not un - apply: ${error.message}`);
    } else {
      refetch(); // Automatically sync UI with database deletions
    }
  }, [refetch]);

  const renderItem = useCallback(({ item, index }) => {
    return (
      <SwipeableRow
        item={item}
        isNew={index === 0}
        onUnapplyConfirmed={handleUnapplyConfirmed}
        navigation={navigation}
        userName={userName}
        userType={userType}
      />
    );
  }, [handleUnapplyConfirmed, navigation, userName, userType]);

  const keyExtractor = useCallback((item) => String(item.match_id ?? item.id), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.title}>{isEmployer ? 'Applicants' : 'Applied'}</Text>
        <Text style={styles.subtitle}>
          {isEmployer ? (
            <>You have <Text style={styles.count}>{matches.length}</Text> applicant{matches.length !== 1 ? 's' : ''}</>
          ) : (
            <>You have applied to <Text style={styles.count}>{matches.length}</Text> role{matches.length !== 1 ? 's' : ''}</>
          )}
        </Text>
      </View>

      {/* Search Bar */}
      {matches.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by role or company..."
            placeholderTextColor={C.hint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
      )}

      {/* Horizontal Pipeline Filter Tabs */}
      {matches.length > 0 && (
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {['All', 'Applied', 'Interviewing', 'Hired'].map((stage) => {
              const isActive = selectedStage === stage;
              const count = stageCounts[stage];
              return (
                <TouchableOpacity
                  key={stage}
                  activeOpacity={0.8}
                  onPress={() => setSelectedStage(stage)}
                  style={[
                    styles.tabPill,
                    isActive && styles.tabPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {stage} <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>({count})</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            filteredMatches.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={C.orange}
            />
          }
          ListHeaderComponent={
            filteredMatches.length > 0 ? (
              <Text style={styles.sectionLabel}>
                {selectedStage === 'All'
                  ? (isEmployer ? 'ALL APPLICANTS' : 'ALL APPLICATIONS')
                  : `${selectedStage.toUpperCase()} (${filteredMatches.length})`}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧞‍♂️</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedStage !== 'All' ? 'No matches found' : 'No wishes granted yet'}
              </Text>
              <Text style={styles.emptyHint}>
                {searchQuery
                  ? "Try searching for a different keyword or role."
                  : selectedStage !== 'All'
                  ? `You don't have any matches in the ${selectedStage.toLowerCase()} stage yet.`
                  : "Keep swiping on roles you love — your matches will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  // Header
  header:   { paddingHorizontal: 24, paddingBottom: 8 },
  title:    { fontSize: 28, fontWeight: '800', color: C.night },
  subtitle: { fontSize: 13, color: C.hint, marginTop: 2 },
  count:    { fontWeight: '700', color: C.orange },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: C.night,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  // Tabs
  tabsContainer: {
    paddingBottom: 12,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    gap: 8,
    flexDirection: 'row',
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  tabPillActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.hint,
  },
  tabCountActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listEmpty:   { flex: 1, justifyContent: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1.2, color: C.orange, marginBottom: 4, marginTop: 8,
  },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 22, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: C.night, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.015)',
  },
  swipeableItemWrap: {
    overflow: 'hidden',
    width: '100%',
  },
  unapplySwipeBtn: {
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 22,
    marginLeft: 10,
    height: '100%',
  },
  unapplySwipeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  logoBox: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,107,44,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,107,44,0.15)',
  },
  logoEmoji: { fontSize: 24 },
  cardInfo:    { flex: 1 },
  cardRole:    { fontSize: 16, fontWeight: '800', color: C.night },
  cardCompany: { fontSize: 13, color: C.orange, fontWeight: '600', marginTop: 2 },
  cardCandidate: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', gap: 4 },

  // Status badge
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // New badge
  newBadge:     { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  chatActionIndicator: {
    backgroundColor: 'rgba(255,107,44,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
    borderWidth: 1,
    borderColor: C.orange,
  },
  chatActionText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.orange,
    textTransform: 'uppercase',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4757', // Alert red indicator dot
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon:  { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.night },
  emptyHint:  { fontSize: 13, color: C.hint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
