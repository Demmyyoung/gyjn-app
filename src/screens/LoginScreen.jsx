import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

// Base64 to ArrayBuffer decoder for React Native uploads
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

function decodeBase64(base64) {
  let bufferLength = base64.length * 0.75;
  const len = base64.length;
  let p = 0;
  let val1, val2, val3, val4;

  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  for (let i = 0; i < len; i += 4) {
    val1 = lookup[base64.charCodeAt(i)];
    val2 = lookup[base64.charCodeAt(i + 1)];
    val3 = lookup[base64.charCodeAt(i + 2)];
    val4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (val1 << 2) | (val2 >> 4);
    if (p < bufferLength) bytes[p++] = ((val2 & 15) << 4) | (val3 >> 2);
    if (p < bufferLength) bytes[p++] = ((val3 & 3) << 6) | (val4 & 63);
  }

  return arrayBuffer;
}

const C = {
  orange:  '#FF6B2C',
  mango:   '#FF9A62',
  peach:   '#FFE0CC',
  cream:   '#FFF5EE',
  night:   '#1A1A2E',
  muted:   '#5A5A7A',
  hint:    '#BEBEBE',
};

const ALL_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React Native', 'Next.js',
  'Node.js', 'Python', 'SQL', 'Figma', 'UI/UX Design',
  'Product Management', 'Data Analysis', 'AWS', 'Docker', 'Git',
  'Swift', 'Kotlin', 'Go', 'GraphQL', 'Firebase',
];

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  // Dynamically resolve Metro host
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)(:\d+)?/);
    if (match && match[1]) {
      const host = match[1];
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3000`;
      }
    }
  }
  return 'http://localhost:3000';
};

import { NativeModules } from 'react-native';

export default function LoginScreen({ navigation, route }) {
  const [name, setName]               = useState('');
  const [role, setRole]               = useState(route.params?.role === 'employer' ? 'Employer' : '');
  const [aboutMe, setAboutMe]         = useState('');
  const [jobType, setJobType]         = useState('Full-time');
  const [searchTarget, setSearchTarget] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [cvUrl, setCvUrl]             = useState(null);
  const [cvName, setCvName]           = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [aiParsing, setAiParsing]     = useState(false);

  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const isEmployer = route.params?.role === 'employer';

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const pickAndUploadCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setCvUploading(true);

      // Read local file as base64 and decode to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decodeBase64(base64);

      // Upload to Supabase Storage
      const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(filename, arrayBuffer, { contentType: file.mimeType, upsert: true });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        setCvUploading(false);
        return;
      }

      // Get public URL
      const { data } = supabase.storage.from('cvs').getPublicUrl(filename);
      setCvUrl(data.publicUrl);
      setCvName(file.name);
      setCvUploading(false);

      // Trigger AI parsing in the background
      setAiParsing(true);
      try {
        const response = await fetch(`${getBackendUrl()}/api/parse-cv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvUrl: data.publicUrl }),
        });

        if (!response.ok) throw new Error('CV Parsing failed');
        const parseData = await response.json();

        if (parseData.success && parseData.profile) {
          const { name: parsedName, role: parsedRole, aboutMe: parsedAbout, skills: parsedSkills } = parseData.profile;
          if (parsedName) setName(parsedName);
          if (parsedRole) setRole(parsedRole);
          if (parsedAbout) setAboutMe(parsedAbout);
          if (Array.isArray(parsedSkills)) setSelectedSkills(parsedSkills);

          Alert.alert('Genie Auto-Filled! ✨', 'Your profile details have been successfully extracted from your CV.');
        }
      } catch (parseErr) {
        console.warn('CV Auto-fill failed:', parseErr);
      } finally {
        setAiParsing(false);
      }
    } catch (err) {
      Alert.alert('Error', `Could not pick file: ${err?.message || err}`);
      setCvUploading(false);
      setAiParsing(false);
    }
  };

  const navigateToMain = (overrideName) => {
    const resolvedName = overrideName || name.trim();
    if (!resolvedName) return;
    navigation.reset({
      index: 0,
      routes: [{
        name: 'Main',
        params: {
          userName:    resolvedName,
          userRole:    role.trim() || (isEmployer ? 'Employer' : 'Professional'),
          jobType,
          aboutMe,
          searchTarget,
          userType:    isEmployer ? 'employer' : 'seeker',
          skills:      selectedSkills.length > 0 ? selectedSkills : ['JavaScript', 'React', 'Figma'],
          cvUrl:       cvUrl ?? null,
        }
      }],
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    navigateToMain();
  };

  const handleGoogleSignIn = () => {
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

          {/* Full Name */}
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

          {/* Role / Company */}
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

          {/* About */}
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

          {/* Job type (seekers) / Search target (employers) */}
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

          {/* Skills section — seekers only */}
          {!isEmployer && (
            <View style={styles.group}>
              <View style={styles.skillsHeader}>
                <Text style={styles.label}>MY SKILLS</Text>
                <Text style={styles.skillsCount}>
                  {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Tap to select'}
                </Text>
              </View>
              <View style={styles.pillRow}>
                {ALL_SKILLS.map((skill) => {
                  const selected = selectedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillPill, selected && styles.skillPillActive]}
                      onPress={() => toggleSkill(skill)}
                    >
                      {selected && <Text style={styles.skillCheck}>✓ </Text>}
                      <Text style={[styles.skillPillText, selected && styles.skillPillTextActive]}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* CV Upload — seekers only */}
          {!isEmployer && (
            <View style={styles.group}>
              <Text style={styles.label}>CV / RESUME</Text>
              <TouchableOpacity
                style={[styles.cvBox, cvUrl && !aiParsing && styles.cvBoxDone]}
                onPress={pickAndUploadCV}
                disabled={cvUploading || aiParsing}
                activeOpacity={0.8}
              >
                {cvUploading ? (
                  <>
                    <ActivityIndicator color={C.orange} size="small" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cvUploadText}>Uploading CV...</Text>
                      <Text style={styles.cvSubText}>Sending file to storage</Text>
                    </View>
                  </>
                ) : aiParsing ? (
                  <>
                    <ActivityIndicator color={C.orange} size="small" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cvUploadText}>🧞‍♂️ Genie is reading your CV...</Text>
                      <Text style={styles.cvSubText}>Auto-filling your profile details</Text>
                    </View>
                  </>
                ) : cvUrl ? (
                  <>
                    <Text style={styles.cvIcon}>✅</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cvDoneText} numberOfLines={1}>{cvName}</Text>
                      <Text style={styles.cvSubText}>Tap to replace</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.cvIcon}>📄</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cvUploadText}>Upload your CV</Text>
                      <Text style={styles.cvSubText}>PDF or Word — optional but recommended</Text>
                    </View>
                    <Text style={styles.cvArrow}>↑</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* CTA */}
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
  backArrow: { fontSize: 22, color: C.night, textAlign: 'center', lineHeight: 22, marginTop: -2, marginLeft: -2 },
  title: { fontSize: 30, fontWeight: '800', color: C.night, lineHeight: 38 },
  subtitle: { fontSize: 14, color: C.hint, marginTop: -8 },
  group: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', letterSpacing: 0.8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 14 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  typePill: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 40, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  typePillActive: { backgroundColor: C.orange, borderColor: C.orange },
  typePillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  typePillTextActive: { color: '#fff' },

  // Skills
  skillsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillsCount: { fontSize: 11, fontWeight: '600', color: C.orange },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 40, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
  },
  skillPillActive: { backgroundColor: 'rgba(255,107,44,0.08)', borderColor: C.orange },
  skillCheck: { fontSize: 11, color: C.orange, fontWeight: '800' },
  skillPillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  skillPillTextActive: { color: C.orange, fontWeight: '700' },

  cta: { borderRadius: 18, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  dividerText: { fontSize: 12, color: C.hint },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)', paddingVertical: 15,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  socialIcon: { fontSize: 16, fontWeight: '900', color: '#4285F4' },
  socialText: { fontSize: 14, fontWeight: '600', color: C.night },

  // CV upload
  cvBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
    paddingHorizontal: 18, paddingVertical: 16,
    minHeight: 60,
  },
  cvBoxDone: {
    borderColor: '#10b981', borderStyle: 'solid',
    backgroundColor: '#ECFDF5',
  },
  cvIcon: { fontSize: 22 },
  cvUploadText: { fontSize: 14, fontWeight: '600', color: C.night },
  cvDoneText:   { fontSize: 13, fontWeight: '700', color: '#059669' },
  cvSubText:    { fontSize: 11, color: C.hint, marginTop: 2 },
  cvArrow:      { fontSize: 18, fontWeight: '700', color: C.orange },
});
