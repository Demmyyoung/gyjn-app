import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
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

function MatchCard({ item, isNew }) {
  const s = STATUS_COLORS[item.status] || STATUS_COLORS.Applied;
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
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
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MatchesScreen({ route }) {
  const { userName } = route.params || {};
  const insets = useSafeAreaInsets();

  const { data: matches = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['matches', userName],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*, jobs(role, company, emoji, job_type, salary)')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, // 30 s — cached between tab switches
  });

  const renderItem = useCallback(({ item, index }) => (
    <MatchCard item={item} isNew={index === 0} />
  ), []);

  const keyExtractor = useCallback((item) => String(item.match_id ?? item.id), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>
          You have <Text style={styles.count}>{matches.length}</Text>{' '}
          match{matches.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            matches.length === 0 && styles.listEmpty,
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
            <Text style={styles.sectionLabel}>ALL MATCHES</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧞‍♂️</Text>
              <Text style={styles.emptyTitle}>No wishes granted yet</Text>
              <Text style={styles.emptyHint}>
                Keep swiping on roles you love — your matches will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header:   { paddingHorizontal: 24, paddingBottom: 8 },
  title:    { fontSize: 28, fontWeight: '800', color: C.night },
  subtitle: { fontSize: 13, color: C.hint, marginTop: 2 },
  count:    { fontWeight: '700', color: C.orange },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listEmpty:   { flex: 1, justifyContent: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, color: C.hint, marginBottom: 4, marginTop: 8,
  },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: C.border,
  },
  logoBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,107,44,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 24 },
  cardInfo:    { flex: 1 },
  cardRole:    { fontSize: 16, fontWeight: '800', color: C.night },
  cardCompany: { fontSize: 13, color: C.orange, fontWeight: '600', marginTop: 2 },
  cardCandidate: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', gap: 4 },

  // Status badge
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  // New badge
  newBadge:     { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon:  { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.night },
  emptyHint:  { fontSize: 13, color: C.hint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
