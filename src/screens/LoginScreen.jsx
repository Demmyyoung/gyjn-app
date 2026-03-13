import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
  orange:  '#FF6B2C',
  mango:   '#FF9A62',
  peach:   '#FFE0CC',
  cream:   '#FFF5EE',
  night:   '#1A1A2E',
  muted:   '#5A5A7A',
  hint:    '#BEBEBE',
};

const DEFAULT_SKILLS = ['JavaScript', 'React', 'Figma', 'Python', 'TypeScript'];

export default function LoginScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(route.params?.role === 'employer' ? 'Employer' : '');
  const [aboutMe, setAboutMe] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [searchTarget, setSearchTarget] = useState('');

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const isEmployer = route.params?.role === 'employer';

  const navigateToMain = (overrideName) => {
    const resolvedName = overrideName || name.trim();
    if (!resolvedName) return;
    navigation.reset({
      index: 0,
      routes: [{
        name: 'Main',
        params: {
          userName: resolvedName,
          userRole: role.trim() || (isEmployer ? 'Employer' : 'Professional'),
          jobType,
          aboutMe,
          searchTarget,
          userType: isEmployer ? 'employer' : 'seeker',
          // FIX: Pass stable skills so ProfileScreen doesn't randomise on every render
          skills: DEFAULT_SKILLS,
        }
      }],
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    navigateToMain();
  };

  // FIX: Google sign-in handler — wired up and ready for real SDK (e.g. expo-auth-session)
  const handleGoogleSignIn = () => {
    // TODO: Replace this Alert with your actual Google OAuth flow, e.g.:
    // import * as Google from 'expo-auth-session/providers/google';
    // const [request, response, promptAsync] = Google.useAuthRequest({ ... });
    Alert.alert(
      'Google Sign-In',
      'Connect your Google OAuth credentials in LoginScreen.jsx to enable this.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {isEmployer ? "Find elite talent\nin 10 seconds." : "Make a wish.\nGet your job."}
          </Text>
          <Text style={styles.subtitle}>
            {isEmployer ? "No long recruitment cycles." : "Your profile in 10 seconds. No CVs."}
          </Text>

          <View style={styles.group}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jordan Lee"
              placeholderTextColor="#ABABAB"
              value={name}
              onChangeText={setName}
              autoCorrect={false}
            />
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>{isEmployer ? "COMPANY NAME" : "CURRENT ROLE"}</Text>
            <TextInput
              style={styles.input}
              placeholder={isEmployer ? "e.g. Acme Inc" : "e.g. UX Designer"}
              placeholderTextColor="#ABABAB"
              value={role}
              onChangeText={setRole}
              autoCorrect={false}
            />
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>ABOUT {isEmployer ? "COMPANY" : "YOU"}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={isEmployer ? "Briefly describe your company..." : "Tell us a bit about yourself..."}
              placeholderTextColor="#ABABAB"
              value={aboutMe}
              onChangeText={setAboutMe}
              multiline
              numberOfLines={3}
            />
          </View>

          {isEmployer ? (
            <View style={styles.group}>
              <Text style={styles.label}>WHAT DO YOU WANT TO FIND?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Frontend Engineer"
                placeholderTextColor="#ABABAB"
                value={searchTarget}
                onChangeText={setSearchTarget}
              />
            </View>
          ) : (
            <View style={styles.group}>
              <Text style={styles.label}>I'M LOOKING FOR</Text>
              <View style={styles.pillRow}>
                {jobTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, jobType === type && styles.typePillActive]}
                    onPress={() => setJobType(type)}
                  >
                    <Text style={[styles.typePillText, jobType === type && styles.typePillTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85}>
            <LinearGradient colors={[C.orange, C.mango]} style={styles.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.ctaText}>Let's Go ✨</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* FIX: Google button now has a real onPress handler */}
          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} activeOpacity={0.8}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, gap: 20 },
  backBtn: {
    width: 40, height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  backArrow: { 
    fontSize: 22, 
    color: C.night,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -2,
    marginLeft: -2,
  },
  title: { fontSize: 30, fontWeight: '800', color: C.night, lineHeight: 38 },
  subtitle: { fontSize: 14, color: C.hint, marginTop: -8 },
  group: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', letterSpacing: 0.8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 40, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  typePillActive: { backgroundColor: C.orange, borderColor: C.orange },
  typePillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  typePillTextActive: { color: '#fff' },
  cta: { borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  dividerText: { fontSize: 12, color: C.hint },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 15,
  },
  socialIcon: { fontSize: 16, fontWeight: '900', color: '#4285F4' },
  socialText: { fontSize: 14, fontWeight: '600', color: C.night },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
});
