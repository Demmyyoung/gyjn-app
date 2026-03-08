import React from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MatchesScreen({ route, navigation }) {
  const { matches = [], userName = 'You' } = route.params || {};
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>
          You have <Text style={styles.count}>{matches.length}</Text> match{matches.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ALL MATCHES</Text>
        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💼</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyHint}>Swipe right on jobs you love — when an employer likes you back, they'll appear here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {matches.map((job, i) => (
              <TouchableOpacity key={i} style={styles.listItem} activeOpacity={0.8}>
                <View style={styles.listLogo}>
                  <Text style={{ fontSize: 24 }}>{job.emoji}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listRole}>{job.role}</Text>
                  <Text style={styles.listCompany}>{job.company} · {job.tags[0]?.label}</Text>
                </View>
                <View style={[styles.badge, i === matches.length - 1 && styles.badgeNew]}>
                  <Text style={styles.badgeText}>{i === matches.length - 1 ? 'New' : job.salary}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#ABABAB', marginTop: 2 },
  count: { fontWeight: '700', color: '#AB6453' },
  scroll: { paddingHorizontal: 24, paddingBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#ABABAB', marginBottom: 12 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  emptyHint: { fontSize: 13, color: '#ABABAB', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // List
  list: { gap: 10 },
  listItem: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  listLogo: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(171,100,83,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  listRole: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  listCompany: { fontSize: 13, color: '#AB6453', fontWeight: '600', marginTop: 2 },
  badge: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeNew: { backgroundColor: '#AB6453' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
