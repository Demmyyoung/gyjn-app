import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function MatchesScreen({ route, navigation }) {
  const { matches = [], userName = 'You' } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches 💜</Text>
        <Text style={styles.subtitle}>
          You have <Text style={styles.count}>{matches.length}</Text> match{matches.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* New matches row */}
        <Text style={styles.sectionLabel}>New Matches</Text>
        {matches.length === 0 ? (
          <Text style={styles.emptyHint}>Swipe right to get matches ✨</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubblesRow}>
            {matches.map((job, i) => (
              <View key={i} style={styles.bubble}>
                <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.bubbleRing}>
                  <View style={styles.bubbleInner}>
                    <Text style={styles.bubbleEmoji}>{job.emoji}</Text>
                  </View>
                </LinearGradient>
                <Text style={styles.bubbleName} numberOfLines={1}>{job.company}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* All matches list */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>All Matches</Text>
        {matches.length === 0 ? (
          <Text style={styles.emptyHint}>No matches yet — start swiping!</Text>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 13, color: '#9898B0', marginTop: 2 },
  count: { fontWeight: '700', color: '#6C5CE7' },
  scroll: { paddingHorizontal: 24, paddingBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#9898B0', marginBottom: 12 },
  emptyHint: { fontSize: 13, color: '#9898B0', paddingVertical: 8 },

  // Bubbles
  bubblesRow: { gap: 14, flexDirection: 'row', paddingBottom: 4 },
  bubble: { alignItems: 'center', gap: 5 },
  bubbleRing: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  bubbleInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(108,92,231,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  bubbleEmoji: { fontSize: 26 },
  bubbleName: { fontSize: 10, fontWeight: '600', color: '#555572', maxWidth: 64, textAlign: 'center' },

  // List
  list: { gap: 10 },
  listItem: { backgroundColor: '#fff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  listLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(108,92,231,0.1)', alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1 },
  listRole: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  listCompany: { fontSize: 12, color: '#9898B0', marginTop: 2 },
  badge: { backgroundColor: '#6C5CE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeNew: { backgroundColor: '#00C896' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Bottom nav
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingVertical: 10, paddingBottom: 20 },
  navItem: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 14 },
  navItemActive: { backgroundColor: 'rgba(108,92,231,0.08)' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, fontWeight: '600', color: '#9898B0', marginTop: 3 },
  navLabelActive: { color: '#6C5CE7' },
});
