import React, {
  useState, useCallback, useRef, useMemo, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  orange:    '#FF6B2C',
  peach:     '#FFE0CC',
  cream:     '#FFF5EE',   // Background tint
  night:     '#1A1A2E',   // Main dark text
  muted:     '#5A5A7A',   // Secondary text
  hint:      '#A0A0C0',   // Placeholders
  green:     '#00C896',   // Active state
  red:       '#FF4757',   // Closed state
  border:    '#F2EDE8',   // Light dividers
  card:      '#FFFFFF',   // Card background
  shadow:    'rgba(26, 26, 46, 0.05)',
  lightGray: '#F7F7FA',
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Open:   { bg: 'rgba(0, 200, 150, 0.1)',  text: C.green },
    Paused: { bg: 'rgba(217, 119, 6, 0.1)',   text: '#D97706' },
    Closed: { bg: 'rgba(255, 71, 87, 0.1)',  text: C.red },
  };
  const s = map[status] || map.Open;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: s.text }]} />
      <Text style={[styles.badgeText, { color: s.text }]}>{status ?? 'Open'}</Text>
    </View>
  );
}

// ─── OverviewCard ────────────────────────────────────────────────────────────
function OverviewCard({ value, label, subtext }) {
  return (
    <View style={styles.overviewCard}>
      <Text style={styles.overviewVal}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
      {subtext && <Text style={styles.overviewSub}>{subtext}</Text>}
    </View>
  );
}

// ─── JobCard ─────────────────────────────────────────────────────────────────
const JobCard = React.memo(function JobCard({ item }) {
  const matchCount = item.match_count ?? 0;
  const swipeCount = item.swipe_count ?? 0;
  
  // Default values matching standard design in candidate swiper
  const cardEmoji = item.emoji || '💼';
  const lightBgColor = item.colors?.[1] || C.peach;

  return (
    <View style={styles.card}>
      {/* Upper row: logo, role title, and status */}
      <View style={styles.cardHeaderRow}>
        <View style={[styles.cardLogoBox, { backgroundColor: lightBgColor }]}>
          <Text style={styles.cardLogoText}>{cardEmoji}</Text>
        </View>

        <View style={styles.cardRoleContainer}>
          <Text style={styles.cardRoleText} numberOfLines={1}>{item.role ?? 'Untitled Role'}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardCompanyText}>{item.company || 'My Company'}</Text>
            <Text style={styles.cardMetaDot}>•</Text>
            <Text style={styles.cardMetaText}>{item.job_type || 'Full-time'}</Text>
          </View>
        </View>

        <StatusBadge status={item.status} />
      </View>

      {/* Divider line */}
      <View style={styles.cardDivider} />

      {/* Footer: Stats & Salary */}
      <View style={styles.cardFooterRow}>
        <View style={styles.cardMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SWIPES</Text>
            <Text style={styles.metricValue}>{swipeCount}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>MATCHES</Text>
            <Text style={[styles.metricValue, { color: C.orange }]}>{matchCount}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>MATCH RATE</Text>
            <Text style={[styles.metricValue, { color: C.green }]}>
              {swipeCount > 0 ? `${Math.round((matchCount / swipeCount) * 100)}%` : '—'}
            </Text>
          </View>
        </View>

        {item.salary ? (
          <View style={styles.salaryBadge}>
            <Text style={styles.salaryText}>{item.salary}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

// ─── EmptyState ──────────────────────────────────────────────────────────────
function EmptyState({ onPost }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🧞‍♂️</Text>
      <Text style={styles.emptyTitle}>Create Your First Role</Text>
      <Text style={styles.emptySub}>Get matches instantly by posting a role for candidates to swipe on.</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onPost} activeOpacity={0.9}>
        <Text style={styles.emptyBtnText}>Post a Role ✨</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── EmployerScreen ──────────────────────────────────────────────────────────
export default function EmployerScreen({ route }) {
  const { userName, userRole } = route.params || {};
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formRole, setFormRole]       = useState('');
  const [formSalary, setFormSalary]   = useState('');
  const [formJobType, setFormJobType] = useState('Full-time');
  const [formCategory, setFormCategory] = useState('Tech & Software');
  const [formRemote, setFormRemote]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const CATEGORIES = [
    'Tech & Software',
    'Design & Creative',
    'Product & Project',
    'Data & Analytics',
    'Marketing & Sales',
    'Business & Operations',
    'Finance & Accounting',
    'Human Resources',
    'Supply Chain & Logistics',
    'Other'
  ];

  // ── Bottom sheet ───────────────────────────────────────────────────────────
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => ['70%'], []);

  const openSheet = useCallback(() => sheetRef.current?.expand(), []);
  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    [],
  );

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const enriched = await Promise.all(
        (jobsData ?? []).map(async (job) => {
          const [{ count: matchCount }, { count: swipeCount }] = await Promise.all([
            supabase
              .from('matches')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id ?? job.match_id),
            supabase
              .from('swipes')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id ?? job.match_id),
          ]);
          return { ...job, match_count: matchCount ?? 0, swipe_count: swipeCount ?? 0 };
        }),
      );

      setJobs(enriched);
    } catch (err) {
      console.warn('[EmployerScreen] fetchJobs error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Dashboard metrics computation ──────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalRoles = jobs.length;
    const totalSwipes = jobs.reduce((acc, j) => acc + (j.swipe_count || 0), 0);
    const totalMatches = jobs.reduce((acc, j) => acc + (j.match_count || 0), 0);
    const rate = totalSwipes > 0 ? `${Math.round((totalMatches / totalSwipes) * 100)}%` : '—';
    return { totalRoles, totalSwipes, totalMatches, rate };
  }, [jobs]);

  // ── Quick Post submit ──────────────────────────────────────────────────────
  const handlePostJob = useCallback(async () => {
    if (!formRole.trim()) {
      Alert.alert('Role Title Required', 'Please enter a title for the role before posting.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Generate elegant visual fallbacks matching swipe-screen requirements
      const emojis = ['💻', '🚀', '📈', '🎨', '💼', '🛠️', '⚙️', '🎯', '✍️', '💡', '🧪', '👾'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      const colorSchemes = [
        ['#FF6B2C', '#FFE0CC'], // Jinni Orange
        ['#7B4FE9', '#EBE5FC'], // Jinni Purple
        ['#00C896', '#E6FAF5'], // Jinni Green
        ['#3B82F6', '#DBEAFE'], // Jinni Blue
      ];
      const randomColors = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
      const randomMatch = Math.floor(Math.random() * 12) + 87; // 87% to 98%

      // 2. Generate standard card metadata
      const desc = `We are seeking a talented ${formRole.trim()} to join our team. If you are passionate about building great experiences, solving meaningful problems, and working with a dynamic team, swipe right!`;
      const reqs = [
        `Prior experience working as a ${formRole.trim()}`,
        "Excellent communication and team-player mindset",
        "Excited to work in a fast-paced environment and take ownership"
      ];

      let finalSalary = null;
      if (formSalary.trim()) {
        const cleaned = formSalary.replace(/[₦,]/g, '').trim();
        const isNumeric = /^\d+$/.test(cleaned);
        if (isNumeric) {
          const formattedAmount = Number(cleaned).toLocaleString();
          if (formJobType === 'Contract' || formJobType === 'Internship') {
            finalSalary = `₦${formattedAmount}`;
          } else {
            finalSalary = `₦${formattedAmount}/mo`;
          }
        } else {
          let temp = formSalary.trim();
          if (!temp.includes('₦')) {
            temp = `₦${temp}`;
          }
          finalSalary = temp;
        }
      }

      const tags = [
        { label: formJobType, type: 'default' }
      ];
      if (formRemote) {
        tags.push({ label: '🌍 Remote', type: 'green' });
      }
      if (finalSalary) {
        tags.push({ label: finalSalary, type: 'gold' });
      }

      // 3. Insert fully enriched role payload
      const { error } = await supabase.from('jobs').insert({
        role:       formRole.trim(),
        company:    userName || 'My Company',
        salary:     finalSalary,
        job_type:   formJobType,
        category:   formCategory,
        emoji:      randomEmoji,
        colors:     randomColors,
        match:      randomMatch,
        description: desc,
        reqs:       reqs,
        tags:       tags,
        status:     'Open'
      });

      if (error) throw error;

      // Reset form fields
      setFormRole('');
      setFormSalary('');
      setFormJobType('Full-time');
      setFormCategory('Tech & Software');
      setFormRemote(false);
      closeSheet();
      fetchJobs(true);
    } catch (err) {
      Alert.alert('Post failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formRole, formSalary, formJobType, formCategory, formRemote, closeSheet, fetchJobs, userName]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => <JobCard item={item} />, []);
  const keyExtractor = useCallback((item) => String(item.id ?? item.match_id), []);

  const listHeader = useMemo(() => {
    if (jobs.length === 0) return null;
    return (
      <View style={styles.headerBlock}>
        {/* Dynamic mini-dashboard layout */}
        <View style={styles.overviewGrid}>
          <OverviewCard value={metrics.totalRoles} label="Active Roles" />
          <OverviewCard value={metrics.totalSwipes} label="Total Swipes" />
          <OverviewCard value={metrics.totalMatches} label="Matches" subtext={`${metrics.rate} rate`} />
        </View>
        <Text style={styles.sectionTitle}>Manage Postings</Text>
      </View>
    );
  }, [jobs.length, metrics]);

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Simple, clean navigation header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View>
          <Text style={styles.headerTitle}>Overview</Text>
          <Text style={styles.headerSub}>{userName ?? 'My Company'} · {userRole ?? 'Employer'}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(userName || 'C').substring(0, 1).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Roles List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            jobs.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<EmptyState onPost={openSheet} />}
          refreshing={refreshing}
          onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            fetchJobs(true);
          }}
          initialNumToRender={5}
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Elegant FAB for New Posts */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom + 20, 28) }]}
        onPress={openSheet}
        activeOpacity={0.9}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Premium Quick Post Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetView style={styles.sheetContent}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingBottom: 40 }}
            >
              {/* Form title */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Post a New Role</Text>
                <TouchableOpacity onPress={closeSheet}>
                  <Text style={styles.sheetClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Role title input */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>JOB TITLE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Lead Product Designer"
                  placeholderTextColor={C.hint}
                  value={formRole}
                  onChangeText={setFormRole}
                  autoCorrect={false}
                />
              </View>

              {/* Salary input */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SALARY (OPTIONAL)</Text>
                <View style={styles.salaryInputContainer}>
                  <Text style={styles.salaryPrefix}>₦</Text>
                  <TextInput
                    style={[styles.input, styles.salaryInput]}
                    placeholder={formJobType === 'Contract' ? "700,000" : "400,000"}
                    placeholderTextColor={C.hint}
                    value={formSalary.replace(/[₦]/g, '')}
                    onChangeText={setFormSalary}
                    autoCorrect={false}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {/* Job category selection pills */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>JOB CATEGORY</Text>
                <View style={styles.pillRow}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.pill, formCategory === c && styles.pillActive]}
                      onPress={() => setFormCategory(c)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, formCategory === c && styles.pillTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Job type selection pills */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>EMPLOYMENT TYPE</Text>
                <View style={styles.pillRow}>
                  {JOB_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pill, formJobType === t && styles.pillActive]}
                      onPress={() => {
                        setFormJobType(t);
                        if (t === 'Contract') {
                          setFormSalary('700,000');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, formJobType === t && styles.pillTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Remote Friendly toggle */}
              <View style={styles.field}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setFormRemote((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={styles.toggleLabel}>REMOTE FRIENDLY</Text>
                    <Text style={styles.toggleSub}>Allow applicants to work from anywhere</Text>
                  </View>
                  <View style={[styles.toggle, formRemote && styles.toggleOn]}>
                    <View style={[styles.toggleKnob, formRemote && styles.toggleKnobOn]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handlePostJob}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Post Role Live ✨</Text>
                )}
              </TouchableOpacity>
            </BottomSheetScrollView>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cream, // Yellowish cream background
  },

  // Navigation Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: C.cream,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.night,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // Soft drop shadow
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.orange,
  },

  // List layout
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mini-dashboard Header Block
  headerBlock: {
    marginBottom: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    marginTop: 8,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.015)',
    // Subtle shadow
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewVal: {
    fontSize: 20,
    fontWeight: '900',
    color: C.night,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  overviewSub: {
    fontSize: 9,
    fontWeight: '600',
    color: C.green,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.night,
    letterSpacing: -0.3,
    marginBottom: 10,
    paddingLeft: 4,
  },

  // Premium Job Card
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.015)',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogoText: {
    fontSize: 22,
  },
  cardRoleContainer: {
    flex: 1,
    gap: 2,
  },
  cardRoleText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.night,
    letterSpacing: -0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardCompanyText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  cardMetaDot: {
    fontSize: 10,
    color: C.hint,
  },
  cardMetaText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },

  // Badge Status
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Card Divider
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5FA',
    marginVertical: 14,
  },

  // Footer: Stats & Salary
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.hint,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: C.night,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#EBEBEF',
    marginHorizontal: 12,
  },
  salaryBadge: {
    backgroundColor: C.lightGray,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EBEBEF',
  },
  salaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },

  // Empty state design
  emptyWrap: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.night,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  emptySub: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: C.orange,
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // FAB (Floating Action Button)
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
    marginTop: -2,
    fontWeight: '600',
  },

  // Bottom Sheet Form styling
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    backgroundColor: '#EBEBEF',
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.night,
    letterSpacing: -0.5,
  },
  sheetClose: {
    fontSize: 16,
    color: C.hint,
    padding: 6,
    fontWeight: '700',
  },

  // Form Fields
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 1.0,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.night,
    fontWeight: '500',
  },
  salaryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  salaryPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: C.orange,
    marginRight: 4,
  },
  salaryInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    color: C.night,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#EBEBEF',
    backgroundColor: C.lightGray,
  },
  pillActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // Toggle switch field
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 1.0,
  },
  toggleSub: {
    fontSize: 12,
    color: C.hint,
    fontWeight: '500',
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBEBEF',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: C.green,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },

  // Form Submission
  submitBtn: {
    backgroundColor: C.orange,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
