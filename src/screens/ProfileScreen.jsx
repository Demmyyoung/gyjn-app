import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SKILLS = ['JavaScript', 'React', 'Figma', 'Python', 'TypeScript', 'Node.js', 'SQL', 'Go', 'Swift', 'Kotlin'];
const randomSkills = SKILLS.sort(() => Math.random() - 0.5).slice(0, 5);

export default function ProfileScreen({ route, navigation }) {
  const {
    userName = 'You',
    userRole = 'Professional',
    jobType = 'Full-time',
    totalSwipes = 0,
    totalLikes = 0,
    matchCount = 0,
  } = route.params || {};

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editBtn}><Text style={styles.editIcon}>✎</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.avatar}><Text style={styles.avatarEmoji}>🙋</Text></View>
          <Text style={styles.pName}>{userName}</Text>
          <Text style={styles.pRole}>{userRole}</Text>
          {route.params?.aboutMe && (
            <Text style={styles.pBio} numberOfLines={2}>{route.params.aboutMe}</Text>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{totalSwipes}</Text>
              <Text style={styles.statLbl}>Swipes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{totalLikes}</Text>
              <Text style={styles.statLbl}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{matchCount}</Text>
              <Text style={styles.statLbl}>Matches</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SKILLS</Text>
          <View style={styles.chips}>
            {randomSkills.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>JOB PREFERENCES</Text>
          {[
            { label: 'Looking for', val: jobType },
            { label: 'Availability', val: 'Immediate' },
            { label: 'Remote OK?', val: 'Yes 🌍' },
            { label: 'Salary (min)', val: '£40,000' },
          ].map(({ label, val }) => (
            <View key={label} style={styles.prefRow}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Text style={styles.prefVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  editBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  editIcon: { fontSize: 18, color: '#1A1A2E' },
  scroll: { paddingHorizontal: 24, paddingBottom: 24, gap: 14 },

  profileCard: { borderRadius: 24, padding: 28, alignItems: 'center', gap: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarEmoji: { fontSize: 40 },
  pName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  pRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  pBio: { fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4, paddingHorizontal: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 8 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)' },

  section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#9898B0', marginBottom: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: 'rgba(108,92,231,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6C5CE7' },

  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  prefLabel: { fontSize: 13, color: '#555572' },
  prefVal: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },

  logoutBtn: { backgroundColor: 'rgba(255,77,103,0.1)', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  logoutText: { color: '#FF4D67', fontSize: 14, fontWeight: '700' },
});
