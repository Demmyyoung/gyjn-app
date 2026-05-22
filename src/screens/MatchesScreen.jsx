import React, { useCallback, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const query = searchQuery.toLowerCase().trim();
    return matches.filter((item) => {
      const role = item.jobs?.role?.toLowerCase() || '';
      const company = item.jobs?.company?.toLowerCase() || '';
      return role.includes(query) || company.includes(query);
    });
  }, [matches, searchQuery]);

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
              <Text style={styles.sectionLabel}>ALL MATCHES</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧞‍♂️</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : 'No wishes granted yet'}
              </Text>
              <Text style={styles.emptyHint}>
                {searchQuery
                  ? "Try searching for a different keyword or role."
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

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon:  { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.night },
  emptyHint:  { fontSize: 13, color: C.hint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
