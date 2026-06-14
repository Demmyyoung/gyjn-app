import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  interpolate, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import BounceButton from '../components/BounceButton';

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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const C = {
  orange: '#FF6B2C',
  night:  '#1A1A2E',
  muted:  '#5A5A7A',
  cream:  '#FFF5EE',
  hint:   '#ABABAB',
};

const ALL_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React Native', 'Next.js',
  'Node.js', 'Python', 'SQL', 'Figma', 'UI/UX Design',
  'Product Management', 'Data Analysis', 'AWS', 'Docker', 'Git',
  'Swift', 'Kotlin', 'Go', 'GraphQL', 'Firebase',
];

const CATEGORIES = [
  { name: 'Tech & Software', icon: 'monitor' },
  { name: 'Design & Creative', icon: 'pen-tool' },
  { name: 'Product & Project', icon: 'trello' },
  { name: 'Data & Analytics', icon: 'trending-up' },
  { name: 'Marketing & Sales', icon: 'pie-chart' },
  { name: 'Business & Operations', icon: 'settings' },
  { name: 'Finance & Accounting', icon: 'dollar-sign' },
  { name: 'Human Resources', icon: 'users' },
  { name: 'Supply Chain & Logistics', icon: 'truck' },
  { name: 'Other', icon: 'briefcase' }
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

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

export default function ProfileScreen({ route, navigation }) {
  const {
    userName    = 'You',
    userRole    = 'Professional',
    jobType     = 'Full-time',
    totalSwipes = 0,
    totalLikes  = 0,
    matchCount  = 0,
    aboutMe     = '',
    skills: initialSkills,
    cvUrl:  initialCvUrl  = null,
    cvName: initialCvName = null,
    userType,
    category: initialCategory = 'Tech & Software',
  } = route.params || {};
  const isEmployer = userType === 'employer';

  const defaultSkills = useMemo(() =>
    initialSkills?.length > 0 ? initialSkills : ['JavaScript', 'React', 'Figma'],
  [initialSkills]);

  // Local profile state — editable without navigating away
  const [profile, setProfile] = useState({
    name:    userName,
    role:    userRole,
    about:   aboutMe,
    jobType: jobType,
    skills:  defaultSkills,
    category: initialCategory,
    companyName: route.params?.companyName || '',
  });

  // CV state
  const [cvUrl, setCvUrl]             = useState(initialCvUrl);
  const [cvName, setCvName]           = useState(initialCvName);
  const [cvUploading, setCvUploading] = useState(false);
  const [aiParsing, setAiParsing]     = useState(false);

  // CV Review Modal state
  const [showCvReview, setShowCvReview] = useState(false);
  const [cvChanges, setCvChanges]       = useState(null); // { name, role, about, skills, category }
  const [acceptedFields, setAcceptedFields] = useState({
    name: true, role: true, about: true, skills: true, category: true,
  });
  const [revealedFields, setRevealedFields] = useState({});
  const reviewTranslateY = useSharedValue(SCREEN_H);
  const [skillInput, setSkillInput]   = useState('');
  const [userEmail, setUserEmail]     = useState('');

  // Live stats states
  const [localSwipes, setLocalSwipes] = useState(0);
  const [localMatches, setLocalMatches] = useState(0);

  const pulseOpacity = useSharedValue(1);

  const loadProfileAndStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        
        // 1. Fetch live profile data from Supabase
        const tableName = isEmployer ? 'employer_profiles' : 'seeker_profiles';
        const { data: dbProfile } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', user.id)
          .single();

        let activeName = userName;
        if (dbProfile) {
          activeName = dbProfile.user_name || userName;
          setProfile({
            name:     activeName,
            role:     dbProfile.user_role || userRole,
            about:    dbProfile.about_me || aboutMe,
            jobType:  dbProfile.job_type || jobType,
            skills:   dbProfile.skills || defaultSkills,
            category: dbProfile.category || initialCategory,
            companyName: dbProfile.company_name || '',
          });
          setCvUrl(dbProfile.cv_url);
          if (dbProfile.cv_url) {
            const parts = dbProfile.cv_url.split('/');
            const filenameWithTimestamp = parts[parts.length - 1];
            const filename = filenameWithTimestamp.replace(/^\d+_/, '');
            setCvName(decodeURIComponent(filename));
          } else {
            setCvName(null);
          }
        }

        // 2. Fetch live stats
        // Swipes count from local storage
        const swipesVal = await AsyncStorage.getItem('seeker_swipes_count');
        if (swipesVal) {
          setLocalSwipes(parseInt(swipesVal));
        }

        // Applied count from matches table
        if (isEmployer) {
          const { count } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true });
          setLocalMatches(count || 0);
        } else {
          const { count } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('candidate_name', activeName);
          setLocalMatches(count || 0);
        }
      }
    } catch (err) {
      console.warn('Failed to load live profile and stats:', err);
    }
  }, [userName, userRole, aboutMe, jobType, defaultSkills, initialCategory, isEmployer]);

  // Load when screen focuses (tab changes, navigation back, etc.)
  useFocusEffect(
    useCallback(() => {
      loadProfileAndStats();
    }, [loadProfileAndStats])
  );

  useEffect(() => {
    if (aiParsing) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [aiParsing]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseOpacity.value,
    };
  });

  // Edit modal state
  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState({ ...profile });

  const insets = useSafeAreaInsets();

  // Edit profile bottom sheet animation values
  const editTranslateY = useSharedValue(0);

  const closeEditModal = useCallback(() => {
    editTranslateY.value = withTiming(SCREEN_H, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setEditing)(false);
      }
    });
  }, [editTranslateY]);

  // Slide up sheet when opening the editor
  useEffect(() => {
    if (editing) {
      editTranslateY.value = SCREEN_H;
      editTranslateY.value = withTiming(0, { duration: 200 });
    }
  }, [editing, editTranslateY]);

  const sheetBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(editTranslateY.value, [0, SCREEN_H * 0.5], [1, 0], 'clamp');
    return { opacity };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: editTranslateY.value }],
  }));

  const openEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  // Animated styles for CV review modal
  const reviewSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reviewTranslateY.value }],
  }));
  const reviewBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(reviewTranslateY.value, [0, SCREEN_H * 0.5], [1, 0], 'clamp');
    return { opacity };
  });

  const closeCvReview = useCallback(() => {
    reviewTranslateY.value = withTiming(SCREEN_H, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setShowCvReview)(false);
      }
    });
  }, [reviewTranslateY]);

  const toggleField = (field) => {
    setAcceptedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const applyCvChanges = async () => {
    if (!cvChanges) return;
    const updates = {};
    if (acceptedFields.name && cvChanges.name) updates.name = cvChanges.name;
    if (acceptedFields.role && cvChanges.role) updates.role = cvChanges.role;
    if (acceptedFields.about && cvChanges.about) updates.about = cvChanges.about;
    if (acceptedFields.skills && cvChanges.skills) updates.skills = cvChanges.skills;
    if (acceptedFields.category && cvChanges.category) updates.category = cvChanges.category;

    // Apply to draft
    setDraft(prev => ({ ...prev, ...updates }));
    // Also apply to live profile immediately
    setProfile(prev => ({ ...prev, ...updates }));

    // Save to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tableName = isEmployer ? 'employer_profiles' : 'seeker_profiles';
        const dbUpdates = {};
        if (updates.name) dbUpdates.user_name = updates.name;
        if (updates.role) dbUpdates.user_role = updates.role;
        if (updates.about) dbUpdates.about_me = updates.about;
        if (updates.skills) dbUpdates.skills = updates.skills;
        if (updates.category) dbUpdates.category = updates.category;
        dbUpdates.cv_url = cvUrl;

        await supabase.from(tableName).upsert({ id: user.id, ...dbUpdates });

        // Sync changes to ALL existing matches for this candidate
        const candidateName = updates.name || profile.name;
        const { data: existingMatches } = await supabase
          .from('matches')
          .select('match_id')
          .eq('candidate_name', candidateName);

        // Also check old name if it changed
        if (updates.name && updates.name !== profile.name) {
          const { data: oldMatches } = await supabase
            .from('matches')
            .select('match_id')
            .eq('candidate_name', profile.name);
          if (oldMatches) {
            existingMatches?.push(...oldMatches);
          }
        }

        if (existingMatches && existingMatches.length > 0) {
          const matchUpdates = {
            candidate_role: updates.role || profile.role,
            skills: updates.skills || profile.skills,
            category: updates.category || profile.category,
            about_me: updates.about || profile.about,
            cv_url: cvUrl,
            updated_at: new Date().toISOString(),
          };
          if (updates.name) matchUpdates.candidate_name = updates.name;

          for (const m of existingMatches) {
            await supabase.from('matches').update(matchUpdates).eq('match_id', m.match_id);
            // Trigger score recalculation
            fetch(`${getBackendUrl()}/api/recalculate-match`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ match_id: m.match_id }),
            }).catch(err => console.warn('[recalculate-match]', err));
          }
        }

        // Sync route params
        navigation.getParent()?.setParams({
          userName: updates.name || profile.name,
          userRole: updates.role || profile.role,
          aboutMe: updates.about || profile.about,
          skills: updates.skills || profile.skills,
          category: updates.category || profile.category,
        });
      }
    } catch (err) {
      console.warn('Failed to sync CV changes:', err);
    }

    closeCvReview();
  };
  const saveEdit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tableName = isEmployer ? 'employer_profiles' : 'seeker_profiles';
        const { error } = await supabase
          .from(tableName)
          .upsert({
            id:            user.id,
            user_name:     draft.name,
            user_role:     draft.role,
            about_me:      draft.about,
            skills:        draft.skills,
            category:      draft.category,
            job_type:      draft.jobType,
            cv_url:        cvUrl,
            ...(isEmployer && { company_name: draft.companyName }),
          });
        if (error) {
          Alert.alert('Error updating profile', error.message);
          return;
        }
      }
    } catch (err) {
      console.warn('Database save failed:', err);
    }

    setProfile({ ...draft });
    // Sync profile back to parent Navigator route.params so Tab switches auto-reload properly
    navigation.getParent()?.setParams({
      userName: draft.name,
      userRole: draft.role,
      aboutMe: draft.about,
      skills: draft.skills,
      category: draft.category,
      jobType: draft.jobType,
    });
    closeEditModal();
  };

  const pickAndUploadCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setCvUploading(true);

      // Read local file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decodeBase64(base64);
      const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(filename, arrayBuffer, { contentType: file.mimeType, upsert: true });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        setCvUploading(false);
        return;
      }
      const { data } = supabase.storage.from('cvs').getPublicUrl(filename);
      setCvUrl(data.publicUrl);
      setCvName(file.name);
      setCvUploading(false);

      // Sync CV to user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tableName = isEmployer ? 'employer_profiles' : 'seeker_profiles';
        await supabase
          .from(tableName)
          .update({ cv_url: data.publicUrl })
          .eq('id', user.id);
      }

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
          const { name: parsedName, role: parsedRole, aboutMe: parsedAbout, skills: parsedSkills, category: parsedCategory } = parseData.profile;

          // Store changes for review modal instead of auto-applying
          setCvChanges({
            name: parsedName || null,
            role: parsedRole || null,
            about: parsedAbout || null,
            skills: Array.isArray(parsedSkills) ? parsedSkills : null,
            category: parsedCategory || null,
          });
          setAcceptedFields({ name: true, role: true, about: true, skills: true, category: true });
          setRevealedFields({});
          setShowCvReview(true);
          reviewTranslateY.value = SCREEN_H;
          reviewTranslateY.value = withTiming(0, { duration: 350 });
        }
      } catch (parseErr) {
        console.warn('CV Auto-fill failed:', parseErr);
        Alert.alert(
          'Auto-fill Unavailable',
          'Genie was unable to parse your CV automatically, but your file has been uploaded. Please update your profile details manually.'
        );
      } finally {
        setAiParsing(false);
      }
    } catch (err) {
      Alert.alert('Error', `Could not pick file: ${err?.message || err}`);
      setCvUploading(false);
      setAiParsing(false);
    }
  };

  const deleteCV = () => {
    Alert.alert('Remove CV', 'Remove your uploaded CV?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setCvUrl(null);
          setCvName(null);
          const { data: { user } } = await supabase.auth.getUser();
          const tableName = isEmployer ? 'employer_profiles' : 'seeker_profiles';
          if (user) {
            await supabase
              .from(tableName)
              .update({ cv_url: null })
              .eq('id', user.id);
          }
        },
      },
    ]);
  };

  const handleAddDraftSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !draft.skills.includes(trimmed)) {
      setDraft(prev => ({
        ...prev,
        skills: [...prev.skills, trimmed]
      }));
    }
    setSkillInput('');
  };

  const removeDraftSkill = (skillToRemove) => {
    setDraft(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Profile</Text>
        <BounceButton style={styles.editBtn} onPress={openEdit} activeScale={0.85}>
          <Feather name="edit-2" size={18} color={C.night} />
        </BounceButton>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card - midnight glow theme */}
        <LinearGradient colors={[C.night, '#2A2A4E']} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.pName}>{profile.name}</Text>
          <Text style={styles.pRole}>{profile.role} {isEmployer ? (profile.companyName ? `at ${profile.companyName}` : '') : `· ${profile.category}`}</Text>
          {profile.about ? (
            <Text style={styles.pBio} numberOfLines={2}>{profile.about}</Text>
          ) : null}
        </LinearGradient>

        {/* Statistical Grid - Premium, independent glassmorphic cards */}
        <View style={styles.statsCardsRow}>
          {[
            { val: localSwipes, lbl: 'Swipes', icon: 'zap', color: C.orange },
            { val: localMatches,  lbl: isEmployer ? 'Applicants' : 'Applied', icon: 'star', color: '#7B4FE9' },
          ].map(({ val, lbl, icon, color }) => (
            <View key={lbl} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: `${color}12` }]}>
                <Feather name={icon} size={16} color={color} />
              </View>
              <Text style={styles.statCardVal}>{val}</Text>
              <Text style={styles.statCardLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SKILLS</Text>
          {profile.skills.length > 0 ? (
            <View style={styles.chips}>
              {profile.skills.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>Tap edit icon to add your skills</Text>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT & PREFERENCES</Text>
          {[
            { label: 'Email',        val: userEmail || 'Loading...' },
            { label: 'Looking for',  val: profile.jobType },
            ...(isEmployer ? [] : [{ label: 'Category', val: profile.category }]),
            { label: 'Availability', val: 'Immediate' },
            { label: 'Remote OK?',   val: 'Yes' },
          ].map(({ label, val }) => (
            <View key={label} style={styles.prefRow}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Text style={styles.prefVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* CV */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CV / RESUME</Text>
          {cvUrl ? (
            <View>
              <View style={styles.cvRow}>
                <Feather name="file-text" size={20} color="#065F46" />
                <Text style={styles.cvFileName} numberOfLines={1}>{cvName || 'My CV'}</Text>
                <TouchableOpacity onPress={deleteCV} style={styles.cvDeleteBtn}>
                  <Feather name="x" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                onPress={pickAndUploadCV} 
                disabled={cvUploading || aiParsing}
                style={{ 
                  marginTop: 10, 
                  backgroundColor: 'rgba(255,107,44,0.08)', 
                  paddingVertical: 12, 
                  paddingHorizontal: 16,
                  borderRadius: 12, 
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255,107,44,0.15)'
                }}
              >
                {cvUploading || aiParsing ? (
                  <ActivityIndicator size="small" color={C.orange} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={C.orange} />
                )}
                <Text style={{ color: C.orange, fontWeight: '700', fontSize: 13 }}>
                  {aiParsing ? 'Genie is updating your profile...' : 'Upload newer CV to sync profile'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cvUploadBox} onPress={pickAndUploadCV} disabled={cvUploading || aiParsing}>
              {cvUploading || aiParsing
                ? <ActivityIndicator color={C.orange} size="small" />
                : <>
                    <Feather name="file-text" size={24} color={C.night} />
                    <Text style={styles.cvBoxText}>Upload CV</Text>
                    <Text style={styles.cvBoxSub}>Tap here to auto-fill profile</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editing} transparent animationType="none" statusBarTranslucent={true}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal}>
          <Animated.View style={[styles.sheetBg, sheetBgStyle]} />
        </Pressable>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEditModal}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={saveEdit}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              {/* Name */}
              <View style={styles.group}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <Animated.View style={aiParsing && animatedPulseStyle}>
                  <TextInput
                    style={[styles.fieldInput, aiParsing && { backgroundColor: '#FFF5EE', borderColor: C.orange }]}
                    value={draft.name}
                    onChangeText={v => setDraft(p => ({ ...p, name: v }))}
                    placeholder={aiParsing ? "Genie is extracting name..." : "Your name"}
                    placeholderTextColor={aiParsing ? C.orange : C.hint}
                    editable={!aiParsing}
                  />
                </Animated.View>
              </View>

              {/* Company Name (Employers Only) */}
              {isEmployer && (
                <View style={styles.group}>
                  <Text style={styles.fieldLabel}>COMPANY NAME</Text>
                  <Animated.View style={aiParsing && animatedPulseStyle}>
                    <TextInput
                      style={[styles.fieldInput, aiParsing && { backgroundColor: '#FFF5EE', borderColor: C.orange }]}
                      value={draft.companyName}
                      onChangeText={v => setDraft(p => ({ ...p, companyName: v }))}
                      placeholder={aiParsing ? "Genie is extracting..." : "e.g. Jinni Technologies"}
                      placeholderTextColor={aiParsing ? C.orange : C.hint}
                      editable={!aiParsing}
                    />
                  </Animated.View>
                </View>
              )}

              {/* Role */}
              <View style={styles.group}>
                <Text style={styles.fieldLabel}>CURRENT ROLE</Text>
                <Animated.View style={aiParsing && animatedPulseStyle}>
                  <TextInput
                    style={[styles.fieldInput, aiParsing && { backgroundColor: '#FFF5EE', borderColor: C.orange }]}
                    value={draft.role}
                    onChangeText={v => setDraft(p => ({ ...p, role: v }))}
                    placeholder={aiParsing ? "Genie is extracting role..." : "e.g. UX Designer"}
                    placeholderTextColor={aiParsing ? C.orange : C.hint}
                    editable={!aiParsing}
                  />
                </Animated.View>
              </View>

              {/* About */}
              <View style={styles.group}>
                <Text style={styles.fieldLabel}>ABOUT YOU</Text>
                <Animated.View style={aiParsing && animatedPulseStyle}>
                  <TextInput
                    style={[styles.fieldInput, styles.textArea, aiParsing && { backgroundColor: '#FFF5EE', borderColor: C.orange }]}
                    value={draft.about}
                    onChangeText={v => setDraft(p => ({ ...p, about: v }))}
                    placeholder={aiParsing ? "Genie is extracting bio..." : "Tell recruiters about yourself..."}
                    placeholderTextColor={aiParsing ? C.orange : C.hint}
                    multiline
                    numberOfLines={4}
                    editable={!aiParsing}
                  />
                </Animated.View>
              </View>

              {/* Job Type */}
              <View style={styles.group}>
                <Text style={styles.fieldLabel}>I'M LOOKING FOR</Text>
                <View style={styles.pillRow}>
                  {JOB_TYPES.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typePill, draft.jobType === type && styles.typePillActive]}
                      onPress={() => setDraft(p => ({ ...p, jobType: type }))}
                    >
                      <Text style={[styles.typePillText, draft.jobType === type && styles.typePillActiveText]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category selector — seekers only */}
              {!isEmployer && (
                <View style={styles.group}>
                  <Text style={styles.fieldLabel}>PROFESSIONAL CATEGORY</Text>
                  <Animated.View style={[styles.pillRow, aiParsing && animatedPulseStyle]}>
                    {CATEGORIES.map((cat) => {
                      const selected = draft.category === cat.name;
                      return (
                        <TouchableOpacity
                          key={cat.name}
                          style={[styles.categoryPill, selected && styles.categoryPillActive]}
                          onPress={() => setDraft(prev => ({ ...prev, category: cat.name }))}
                          disabled={aiParsing}
                          activeOpacity={0.8}
                        >
                          <Feather name={cat.icon} size={15} color={selected ? C.orange : C.muted} style={{ marginRight: 4 }} />
                          <Text style={[styles.categoryText, selected && styles.categoryTextActive, aiParsing && { color: C.orange }]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </Animated.View>
                </View>
              )}

              {/* Skills */}
              {!isEmployer && (
                <View style={styles.group}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.fieldLabel}>MY SKILLS</Text>
                    <Text style={[styles.fieldLabel, { color: C.orange }]}>
                      {aiParsing ? "Genie matching skills..." : `${draft.skills.length} selected`}
                    </Text>
                  </View>

                  {/* Skill Input Row */}
                  <View style={styles.skillInputContainer}>
                    <TextInput
                      style={styles.skillTextInput}
                      placeholder="e.g. Python, Figma, Copywriting"
                      placeholderTextColor="#ABABAB"
                      value={skillInput}
                      onChangeText={setSkillInput}
                      onSubmitEditing={handleAddDraftSkill}
                      editable={!aiParsing}
                      autoCorrect={false}
                    />
                    <TouchableOpacity 
                      style={styles.addSkillBtn} 
                      onPress={handleAddDraftSkill}
                      disabled={aiParsing}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.addSkillBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic Skills Tag Cloud */}
                  <Animated.View style={[styles.pillRow, aiParsing && animatedPulseStyle, { marginTop: 4 }]}>
                    {draft.skills.length > 0 ? (
                      draft.skills.map((skill) => (
                        <View key={skill} style={styles.skillTag}>
                          <Text style={styles.skillTagText}>{skill}</Text>
                          <TouchableOpacity onPress={() => removeDraftSkill(skill)} disabled={aiParsing}>
                            <Feather name="x" size={12} color={C.orange} style={{ paddingLeft: 4 }} />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={{ fontSize: 13, color: '#ABABAB', fontStyle: 'italic', paddingLeft: 4 }}>
                        No skills added yet. Type above to add, or auto-fill via CV.
                      </Text>
                    )}
                  </Animated.View>
                </View>
              )}

              {/* CV section */}
              <View style={styles.group}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.fieldLabel}>CV / RESUME</Text>
                  <Text style={{ fontSize: 10, color: '#06b6d4', fontWeight: '700' }}>AUTO-UPDATES PROFILE</Text>
                </View>
                
                <View style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="zap" size={14} color="#0891b2" />
                    <Text style={{ fontSize: 12, color: '#0891b2', fontWeight: '600', flex: 1 }}>Upload a new CV to automatically update your profile details.</Text>
                  </View>
                </View>
                {cvUrl && !aiParsing ? (
                  <View style={styles.cvEditRow}>
                    <Feather name="file-text" size={20} color="#065F46" />
                    <Text style={styles.cvFileName} numberOfLines={1}>{cvName || 'Uploaded CV'}</Text>
                    <TouchableOpacity onPress={pickAndUploadCV} style={styles.cvReplaceBtn} disabled={cvUploading || aiParsing}>
                      {cvUploading
                        ? <ActivityIndicator color={C.orange} size="small" />
                        : <Text style={styles.cvReplaceText}>Replace</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity onPress={deleteCV} style={styles.cvDeleteBtnEdit}>
                      <Feather name="x" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.cvPickBox}
                    onPress={pickAndUploadCV}
                    disabled={cvUploading || aiParsing}
                    activeOpacity={0.8}
                  >
                    {cvUploading ? (
                      <>
                        <ActivityIndicator color={C.orange} size="small" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cvPickText}>Uploading CV...</Text>
                          <Text style={styles.cvPickSub}>Sending file to storage</Text>
                        </View>
                      </>
                    ) : aiParsing ? (
                      <>
                        <ActivityIndicator color={C.orange} size="small" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cvPickText}>Genie is reading your CV...</Text>
                          <Text style={styles.cvPickSub}>Updating your draft details</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Feather name="upload-cloud" size={24} color={C.orange} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.cvPickText}>Upload your CV</Text>
                          <Text style={styles.cvPickSub}>PDF or Word</Text>
                        </View>
                        <Text style={styles.cvPickArrow}>↑</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Save button at bottom */}
              <TouchableOpacity onPress={saveEdit} activeOpacity={0.85} style={{ marginTop: 8 }}>
                <LinearGradient colors={['#FF6B2C', '#FF9A62']} style={styles.saveCta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.saveCtaText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CV Changes Review Modal ── */}
      <Modal visible={showCvReview} transparent animationType="none" statusBarTranslucent={true}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeCvReview}>
          <Animated.View style={[styles.sheetBg, reviewBgStyle]} />
        </Pressable>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.reviewSheet, reviewSheetStyle]}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.reviewHeader}>
              <View style={styles.reviewHeaderLeft}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,107,44,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="star" size={18} color={C.orange} />
                </View>
                <View>
                  <Text style={styles.reviewTitle}>Profile Update</Text>
                  <Text style={styles.reviewSub}>Genie extracted these from your CV</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeCvReview}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.muted }}>Skip</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {cvChanges && [
                { key: 'name', label: 'Full Name', icon: 'user', current: profile.name, suggested: cvChanges.name },
                { key: 'role', label: 'Professional Title', icon: 'briefcase', current: profile.role, suggested: cvChanges.role },
                { key: 'about', label: 'About You', icon: 'file-text', current: profile.about, suggested: cvChanges.about },
                { key: 'category', label: 'Category', icon: 'tag', current: profile.category, suggested: cvChanges.category },
                { key: 'skills', label: 'Skills', icon: 'zap', current: profile.skills?.join(', '), suggested: cvChanges.skills?.join(', ') },
              ].filter(f => f.suggested && f.suggested !== f.current).map((field, idx) => {
                const accepted = acceptedFields[field.key];
                const hasChanged = field.suggested !== field.current;
                return (
                  <TouchableOpacity
                    key={field.key}
                    activeOpacity={0.85}
                    onPress={() => toggleField(field.key)}
                    style={[
                      styles.reviewCard,
                      accepted && styles.reviewCardActive,
                      !hasChanged && { opacity: 0.5 },
                    ]}
                  >
                    {/* Toggle indicator */}
                    <View style={[styles.reviewToggle, accepted && styles.reviewToggleActive]}>
                      {accepted && <Feather name="check" size={12} color="#fff" />}
                    </View>

                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name={field.icon} size={14} color={C.muted} />
                        <Text style={styles.reviewFieldLabel}>{field.label}</Text>
                      </View>

                      {/* Current value (strikethrough) */}
                      {field.current ? (
                        <Text style={styles.reviewOldValue} numberOfLines={2}>
                          {field.current}
                        </Text>
                      ) : null}

                      {/* New value (highlighted) */}
                      <Text style={[
                        styles.reviewNewValue,
                        accepted && { color: '#06b6d4' },
                      ]} numberOfLines={field.key === 'about' ? 4 : 2}>
                        {field.suggested}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Action buttons */}
              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity onPress={applyCvChanges} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#06b6d4', '#0891b2']}
                    style={styles.reviewAcceptBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.reviewAcceptText}>Accept Selected Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    // Apply to draft only and open edit modal
                    if (cvChanges) {
                      setDraft(prev => ({
                        ...prev,
                        ...(acceptedFields.name && cvChanges.name ? { name: cvChanges.name } : {}),
                        ...(acceptedFields.role && cvChanges.role ? { role: cvChanges.role } : {}),
                        ...(acceptedFields.about && cvChanges.about ? { about: cvChanges.about } : {}),
                        ...(acceptedFields.skills && cvChanges.skills ? { skills: cvChanges.skills } : {}),
                        ...(acceptedFields.category && cvChanges.category ? { category: cvChanges.category } : {}),
                      }));
                    }
                    closeCvReview();
                    setTimeout(() => setEditing(true), 400);
                  }}
                  activeOpacity={0.85}
                  style={styles.reviewEditBtn}
                >
                  <Feather name="edit-2" size={14} color="#0891b2" />
                  <Text style={styles.reviewEditText}>Review & Edit Manually</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: C.night, textAlign: 'center', flex: 1 },
  editBtn: {
    width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  editIcon: { fontSize: 18, color: C.night },
  scroll: { paddingHorizontal: 24, paddingBottom: 120, gap: 14 },

  // Profile card
  profileCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: C.orange,
  },
  avatarInitials: { fontSize: 30, fontWeight: '900', color: '#fff' },
  pName: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  pRole: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textAlign: 'center' },
  pBio: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4, paddingHorizontal: 10, lineHeight: 18 },

  // Stats cards
  statsCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.015)',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCardVal: {
    fontSize: 18,
    fontWeight: '800',
    color: C.night,
  },
  statCardLbl: {
    fontSize: 10,
    color: C.muted,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)' },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, color: C.orange, marginBottom: 12 },
  emptyHint: { fontSize: 13, color: C.hint, fontStyle: 'italic' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { 
    backgroundColor: 'rgba(255,107,44,0.08)', 
    borderRadius: 20, 
    paddingHorizontal: 14, 
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,107,44,0.15)',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: C.orange },

  prefRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.04)' 
  },
  prefLabel: { fontSize: 13, fontWeight: '500', color: C.muted },
  prefVal: { fontSize: 13, fontWeight: '700', color: C.night },

  logoutBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  logoutText: { color: '#FF4757', fontSize: 14, fontWeight: '700' },

  // Edit modal
  modalScroll: { paddingHorizontal: 24, paddingBottom: 48, gap: 22 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  modalCancel: { fontSize: 15, fontWeight: '600', color: C.muted },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: C.night },
  modalSave:   { fontSize: 15, fontWeight: '700', color: C.orange },

  group: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', letterSpacing: 0.8 },
  fieldInput: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 15, color: '#1A1A1A',
    shadowColor: C.night, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  textArea: { height: 110, textAlignVertical: 'top', paddingTop: 14 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 40,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#fff',
  },
  typePillActive: { backgroundColor: C.orange, borderColor: C.orange },
  typePillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  typePillActiveText: { color: '#fff' },

  skillPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 40, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#fff',
  },
  skillPillActive: { backgroundColor: 'rgba(255,107,44,0.1)', borderColor: C.orange },
  skillCheck: { fontSize: 11, color: C.orange, fontWeight: '800' },
  skillPillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  skillPillActiveText: { color: C.orange },

  // Professional Category selection
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255,107,44,0.08)',
    borderColor: C.orange,
  },
  categoryEmoji: { fontSize: 15 },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.muted },
  categoryTextActive: { color: C.orange, fontWeight: '700' },

  // Skill Input & Dynamic Tag Cloud
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  skillTextInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#1A1A1A',
  },
  addSkillBtn: {
    backgroundColor: C.orange,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addSkillBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,44,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,44,0.15)',
  },
  skillTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.orange,
  },
  skillTagDelete: {
    fontSize: 11,
    fontWeight: '700',
    color: C.orange,
    paddingLeft: 2,
  },

  saveCta: { borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  saveCtaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // CV — profile view card
  cvRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  cvIcon:     { fontSize: 20 },
  cvFileName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46' },
  cvDeleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  cvDeleteText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  cvUploadBox: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 18, paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  cvBoxIcon: { fontSize: 24 },
  cvBoxText: { fontSize: 13, fontWeight: '700', color: C.night },
  cvBoxSub:  { fontSize: 11, color: C.hint, textAlign: 'center' },

  // CV — edit modal
  cvEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  cvReplaceBtn: {
    backgroundColor: '#FFF0E8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  cvReplaceText: { fontSize: 12, fontWeight: '700', color: C.orange },
  cvDeleteBtnEdit: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  cvPickBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed', paddingHorizontal: 18, paddingVertical: 16,
  },
  cvPickIcon:  { fontSize: 22 },
  cvPickText:  { fontSize: 14, fontWeight: '600', color: C.night },
  cvPickSub:   { fontSize: 11, color: C.hint, marginTop: 2 },
  cvPickArrow: { fontSize: 18, fontWeight: '700', color: C.orange },

  // Bottom sheet modal container styles
  sheetBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_H * 0.85,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },

  // CV Review Modal
  reviewSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_H * 0.88,
    shadowColor: C.night,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewEmoji: { fontSize: 28 },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: C.night, letterSpacing: -0.3 },
  reviewSub: { fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 1 },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FFFE',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  reviewCardActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#F0FDFA',
  },
  reviewToggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reviewToggleActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  reviewFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewOldValue: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontStyle: 'italic',
  },
  reviewNewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.night,
    lineHeight: 20,
  },
  reviewAcceptBtn: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
  },
  reviewAcceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewEditBtn: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.2)',
  },
  reviewEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06b6d4',
  },
});
