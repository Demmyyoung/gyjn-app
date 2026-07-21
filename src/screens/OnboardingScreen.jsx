import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withSpring, SlideInRight, SlideOutLeft, FadeIn, FadeOut
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { makeRedirectUri } from 'expo-auth-session';
import * as Sentry from '@sentry/react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeProvider';
import { springs, timings } from '../lib/animations';
import StaggeredList from '../components/StaggeredList';
import BounceButton from '../components/BounceButton';
import AnimatedInput from '../components/AnimatedInput';

WebBrowser.maybeCompleteAuthSession();

// --- Reusable Components ---
function SelectionCard({ emoji, label, desc, onPress, colorTheme }) {
  const { colors, typography, radii, shadows } = useTheme();
  const isHovered = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: isHovered.value ? colors.brand.orange : colors.border.light,
    backgroundColor: colors.bg.card,
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(isHovered.value ? 5 : 0, springs.snappy) }]
  }));

  return (
    <BounceButton
      onPress={onPress}
      onPressIn={() => (isHovered.value = true)}
      onPressOut={() => (isHovered.value = false)}
      activeScale={0.97}
      style={{ marginBottom: 16 }}
    >
      <Animated.View style={[styles.card, { borderRadius: radii['2xl'] }, shadows.sm, animatedStyle]}>
        <View style={styles.cardLeft}>
          <View style={[styles.emojiBox, { backgroundColor: colorTheme, borderRadius: radii.lg }]}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={[typography.title, { color: colors.text.primary }]}>{label}</Text>
            <Text style={[typography.label, { color: colors.text.secondary }]}>{desc}</Text>
          </View>
        </View>
        <Animated.View style={[styles.arrowContainer, arrowStyle]}>
          <LinearGradient
            colors={[colors.brand.orange, colors.brand.mango]}
            style={[styles.arrowGradient, { borderRadius: radii.circle }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardArrow}>➔</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </BounceButton>
  );
}

// --- Main Wizard Screen ---
export default function OnboardingScreen({ navigation }) {
  const { colors, typography, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  // Navigation / Wizard State
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);

  // Auth State
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile Generation State
  const [cvLoading, setCvLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    user_name: '',
    job_type: '',
    skills: [],
    experience_level: '',
    about_me: '',
    location: '',
  });
  const isNavigating = useRef(false);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 4.5) setStep(4);
    else if (step > 1) setStep(step - 1);
    else if (step === 1 && navigation.canGoBack()) navigation.goBack();
  };

  // Visuals
  const rocketOffset = useSharedValue(0);
  useEffect(() => {
    rocketOffset.value = withRepeat(
      withSequence(withTiming(-5, timings.slow), withTiming(0, timings.slow)),
      -1, true
    );
  }, []);
  const rocketStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rocketOffset.value }] }));

  // Progress Bar
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withSpring((step / 6) * 100, springs.snappy);
  }, [step]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  // ==========================================
  // Auth Helpers
  // ==========================================
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = typeof event === 'string' ? event : event?.url;
      if (url && (url.includes('google-auth') || url.includes('linkedin-auth') || url.includes('jinni://'))) {
        parseAndSetSession(url);
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    return () => subscription.remove();
  }, []);

  const parseAndSetSession = async (url) => {
    try {
      const accessTokenMatch = url.match(/[#?&]access_token=([^&]+)/);
      const refreshTokenMatch = url.match(/[#?&]refresh_token=([^&]+)/);
      if (accessTokenMatch && refreshTokenMatch) {
        const { data, error } = await supabase.auth.setSession({
          access_token: decodeURIComponent(accessTokenMatch[1]),
          refresh_token: decodeURIComponent(refreshTokenMatch[1])
        });
        if (error) throw error;
        if (data?.session) await handleAuthSuccess(data.session.user, data.session.access_token);
        return;
      }
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
        if (error) throw error;
        if (data?.session) await handleAuthSuccess(data.session.user, data.session.access_token);
      }
    } catch (err) {
      Alert.alert('Sign-In Error', err.message);
      setGoogleLoading(false);
    }
  };

  const handleAuthSuccess = async (user, accessToken) => {
    if (isNavigating.current) return;
    setGoogleLoading(false);
    setAuthLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Proceed to CV branch
    setStep(4);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await AsyncStorage.setItem('lastLoginMethod', 'google');
    const redirectUrl = makeRedirectUri({ path: 'google-auth' });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        await parseAndSetSession(result.url);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await handleAuthSuccess(session.user, session.access_token);
      }
    } catch (err) {
      Alert.alert('Google Sign-In Failed', err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return Alert.alert('Validation', 'Enter email and password');
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim() });
    if (error && error.message.includes('already registered')) {
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
      if (signInError) Alert.alert('Login Error', signInError.message);
      else if (signInData?.session) await handleAuthSuccess(signInData.session.user, signInData.session.access_token);
    } else if (data?.session) {
      await handleAuthSuccess(data.session.user, data.session.access_token);
    } else if (error) {
      Alert.alert('Sign Up Error', error.message);
    }
    setAuthLoading(false);
  };

  // ==========================================
  // CV & Profile Handlers
  // ==========================================
  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!res.canceled) {
        setCvLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
          const base64Data = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
          
          const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

          const requestBody = {
            contents: [{
              parts: [
                { text: "Please parse this CV and extract the requested fields. Ensure skills is an array of strings." },
                { inline_data: { mime_type: "application/pdf", data: base64Data } }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  user_name: { type: "STRING", description: "The candidate full name." },
                  job_type: { type: "STRING", description: "A suitable professional role." },
                  about_me: { type: "STRING", description: "A short 2 sentence bio." },
                  experience_level: { type: "STRING", description: "Experience level (e.g. Junior, Mid-Level (3-5 yrs))." },
                  skills: { type: "ARRAY", items: { type: "STRING" }, description: "Top 3-5 technical or professional skills." }
                },
                required: ["user_name", "job_type", "about_me", "experience_level", "skills"]
              }
            }
          };

          const apiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!apiRes.ok) throw new Error(`Gemini API Error: ${apiRes.statusText}`);
          const data = await apiRes.json();
          
          const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textResponse) throw new Error("Invalid response structure from Gemini API");

          const parsed = JSON.parse(textResponse);

          setProfileData({
            user_name: parsed.user_name || '',
            job_type: parsed.job_type || '',
            skills: parsed.skills || [],
            experience_level: parsed.experience_level || '',
            about_me: parsed.about_me || '',
            location: 'Remote',
          });

          setCvLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep(5); // Go to Validation
        } catch (apiError) {
          console.error("Gemini Parse Error:", apiError);
          Sentry.captureException(apiError);
          setCvLoading(false);
          Alert.alert('AI Parsing Failed', `Error: ${apiError.message || JSON.stringify(apiError)}`);
          setStep(4.5); // Fallback to guided form
        }
      }
    } catch (e) {
      console.error("Upload Error:", e);
      Sentry.captureException(e);
      setCvLoading(false);
      Alert.alert('Upload Error', 'Could not process PDF.');
    }
  };

  const handleGuidedFormSubmit = () => {
    if (!profileData.user_name || !profileData.job_type) return Alert.alert('Required', 'Please enter your name and target role.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(5); // Go to validation
  };

  const saveProfileAndLaunch = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    isNavigating.current = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('seeker_profiles').upsert({ 
          id: session.user.id, 
          user_name: profileData.user_name,
          user_role: profileData.job_type,
          about_me: profileData.about_me,
          skills: profileData.skills,
          experience_level: profileData.experience_level
        });
      }
    } catch (e) {
      console.warn("Could not save to supabase:", e);
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { 
        userType: 'seeker', 
        userName: profileData.user_name,
        userRole: profileData.job_type,
        aboutMe: profileData.about_me,
        skills: profileData.skills
      } }],
    });
  };

  // ==========================================
  // Render Steps
  // ==========================================

  // Step 1: Role Select
  const renderStep1 = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[typography.display, { color: colors.text.primary }]}>You're almost{'\n'}in. </Text>
          <Animated.Text style={[styles.rocket, rocketStyle]}>🚀</Animated.Text>
        </View>
        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 8 }]}>Tell us who you are so we can{'\n'}personalise your experience.</Text>
      </View>
      <StaggeredList baseDelay={100} style={styles.cards}>
        <SelectionCard
          emoji="🧑‍💻" label="Job Seeker" desc="Swipe on jobs, get matched, land interviews" colorTheme="rgba(255, 107, 44, 0.08)"
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRole('seeker'); setStep(2); }}
        />
        <SelectionCard
          emoji="🏢" label="Employer" desc="Post roles, discover talent, hire fast" colorTheme="rgba(123, 79, 233, 0.08)"
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Auth', { role: 'employer' }); }}
        />
      </StaggeredList>
    </Animated.View>
  );

  // Step 2: Hype Screen
  const renderStep2 = () => (
    <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} style={styles.stepContainer}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text style={[typography.display, { color: colors.text.primary }]}>Nice! Let's get you matched with real jobs.</Text>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconPill, { backgroundColor: 'rgba(255,107,44,0.1)' }]}><Text>⚡</Text></View>
            <Text style={[typography.body, { color: colors.text.primary, flex: 1 }]}>Instant AI Matching based on your top skills.</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconPill, { backgroundColor: 'rgba(255,107,44,0.1)' }]}><Text>📄</Text></View>
            <Text style={[typography.body, { color: colors.text.primary, flex: 1 }]}>Zero-effort profile generation.</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconPill, { backgroundColor: 'rgba(255,107,44,0.1)' }]}><Text>💬</Text></View>
            <Text style={[typography.body, { color: colors.text.primary, flex: 1 }]}>Direct chat with hiring managers.</Text>
          </View>
        </View>
      </View>
      <BounceButton onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(3); }}>
        <LinearGradient colors={[colors.brand.orange, colors.brand.mango]} style={styles.primaryBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
          <Text style={[typography.button, { color: '#fff' }]}>Let's Go 🚀</Text>
        </LinearGradient>
      </BounceButton>
    </Animated.View>
  );

  // Step 3: Social-First Auth
  const renderStep3 = () => (
    <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} style={styles.stepContainer}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
        <Text style={[typography.hero, { color: colors.text.primary, textAlign: 'center', marginBottom: 20 }]}>Create Account</Text>
        
        {/* Google Primary */}
        <BounceButton onPress={handleGoogleSignIn} disabled={googleLoading}>
          <View style={[styles.socialBtn, { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1.5 }, shadows.sm]}>
            {googleLoading ? <ActivityIndicator color="#000" /> : (
              <>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A' }}>G</Text>
                <Text style={[typography.button, { color: '#1A1A1A' }]}>Continue with Google</Text>
              </>
            )}
          </View>
        </BounceButton>

        {/* Apple Secondary */}
        <BounceButton onPress={() => Alert.alert('Coming Soon', 'Apple Sign In in development')} disabled={appleLoading}>
          <View style={[styles.socialBtn, { backgroundColor: '#000' }]}>
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={[typography.button, { color: '#fff' }]}>Continue with Apple</Text>
          </View>
        </BounceButton>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Secondary */}
        {showEmailForm ? (
          <Animated.View entering={FadeIn} style={{ gap: 12 }}>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <BounceButton onPress={handleEmailAuth} disabled={authLoading}>
              <View style={[styles.socialBtn, { backgroundColor: colors.bg.secondary }]}>
                {authLoading ? <ActivityIndicator color={colors.text.primary} /> : <Text style={[typography.button, { color: colors.text.primary }]}>Sign In with Email</Text>}
              </View>
            </BounceButton>
          </Animated.View>
        ) : (
          <TouchableOpacity onPress={() => setShowEmailForm(true)} style={{ paddingVertical: 10 }}>
            <Text style={[typography.label, { color: colors.text.hint, textAlign: 'center' }]}>Prefer email and password?</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  // Step 4: CV Branch
  const renderStep4 = () => {
    if (cvLoading) {
      return (
        <Animated.View entering={FadeIn} style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
          <ActivityIndicator size="large" color={colors.brand.orange} />
          <Text style={[typography.title, { color: colors.text.primary }]}>Gemini AI is parsing your CV...</Text>
          <Text style={[typography.label, { color: colors.text.secondary, textAlign: 'center' }]}>Extracting your top skills, experience,{'\n'}and ideal target roles.</Text>
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} style={styles.stepContainer}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          <Text style={[typography.display, { color: colors.text.primary }]}>Do you have a CV ready?</Text>
          <Text style={[typography.body, { color: colors.text.secondary }]}>Upload it to let our AI build your profile instantly. Otherwise, we can guide you through it.</Text>
          
          <StaggeredList baseDelay={100} style={{ gap: 16 }}>
            <SelectionCard emoji="📄" label="Yes, upload CV" desc="PDF or Word. Auto-extracts profile." colorTheme="rgba(255, 107, 44, 0.08)" onPress={handleFileUpload} />
            <SelectionCard emoji="✏️" label="No, build it now" desc="Quick 3-step guided form." colorTheme="rgba(123, 79, 233, 0.08)" onPress={() => setStep(4.5)} />
          </StaggeredList>
        </View>
      </Animated.View>
    );
  };

  // Step 4.5: Guided Form
  const renderStep5 = () => (
    <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} style={styles.stepContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={[typography.display, { color: colors.text.primary }]}>Let's build your profile.</Text>
          
          <AnimatedInput label="Full Name" placeholder="e.g. Alex Smith" value={profileData.user_name} onChangeText={(text) => setProfileData(prev => ({...prev, user_name: text}))} />
          <AnimatedInput label="Target Role" placeholder="e.g. Frontend Engineer" value={profileData.job_type} onChangeText={(text) => setProfileData(prev => ({...prev, job_type: text}))} />
          <AnimatedInput label="Experience Level" placeholder="e.g. Mid-Level (3-5 years)" value={profileData.experience_level} onChangeText={(text) => setProfileData(prev => ({...prev, experience_level: text}))} />
          
          <BounceButton onPress={handleGuidedFormSubmit}>
            <LinearGradient colors={[colors.brand.orange, colors.brand.mango]} style={styles.primaryBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={[typography.button, { color: '#fff' }]}>Generate Profile ✨</Text>
            </LinearGradient>
          </BounceButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  // Step 5: Profile Validation
  const renderStep6 = () => (
    <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} style={styles.stepContainer}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.display, { color: colors.text.primary }]}>Here's what we got.</Text>
        <Text style={[typography.body, { color: colors.text.secondary }]}>Review your profile before launching.</Text>
        
        <View style={[styles.profileCard, shadows.sm, { backgroundColor: colors.bg.card, borderRadius: radii['2xl'], borderColor: colors.border.light }]}>
          <TextInput style={[typography.title, { color: colors.text.primary, marginBottom: 8 }]} value={profileData.user_name} onChangeText={(text) => setProfileData(prev => ({...prev, user_name: text}))} placeholder="Your Name" />
          <TextInput style={[typography.body, { color: colors.brand.orange, fontWeight: '600', marginBottom: 16 }]} value={profileData.job_type} onChangeText={(text) => setProfileData(prev => ({...prev, job_type: text}))} placeholder="Target Role" />
          
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 8 }]}>EXPERIENCE</Text>
          <TextInput style={[typography.body, { color: colors.text.primary, marginBottom: 16 }]} value={profileData.experience_level} onChangeText={(text) => setProfileData(prev => ({...prev, experience_level: text}))} placeholder="Experience Level" />
          
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 8 }]}>BIO</Text>
          <TextInput style={[typography.body, { color: colors.text.primary, marginBottom: 16, minHeight: 60 }]} value={profileData.about_me} onChangeText={(text) => setProfileData(prev => ({...prev, about_me: text}))} placeholder="Short bio about yourself..." multiline />
          
          <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 8 }]}>TOP SKILLS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {profileData.skills.length > 0 ? profileData.skills.map((skill, idx) => (
              <View key={idx} style={[styles.skillChip, { backgroundColor: colors.bg.secondary, borderRadius: radii.full }]}>
                <Text style={[typography.label, { color: colors.text.primary }]}>{skill}</Text>
              </View>
            )) : <Text style={[typography.label, { color: colors.text.hint }]}>Add skills above</Text>}
          </View>
        </View>

        <BounceButton onPress={saveProfileAndLaunch}>
          <LinearGradient colors={[colors.brand.orange, colors.brand.mango]} style={[styles.primaryBtn, shadows.md]} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Text style={[typography.button, { color: '#fff' }]}>Confirm & Launch Profile 🚀</Text>
          </LinearGradient>
        </BounceButton>
      </ScrollView>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header & Progress Indicator */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginLeft: -8 }}>
              <Feather name="arrow-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ height: 40 }} />
          )}
        </View>
        <View style={{ height: 4, backgroundColor: colors.border.light, borderRadius: radii.full, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', backgroundColor: colors.brand.orange, borderRadius: radii.full }, progressStyle]} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 4.5 && renderStep5()}
        {step === 5 && renderStep6()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContainer: { flex: 1, paddingHorizontal: 20 },
  header: { gap: 10, marginTop: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  rocket: { fontSize: 34, lineHeight: 42, marginLeft: 4 },
  cards: { marginTop: 32 },
  card: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  emojiBox: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 30 },
  cardTextContainer: { flex: 1, gap: 2 },
  arrowContainer: { paddingLeft: 8 },
  arrowGradient: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cardArrow: { fontSize: 16, color: '#fff', fontWeight: '800' },
  iconPill: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  socialBtn: { paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  dividerText: { fontSize: 12, color: 'gray', fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  profileCard: { padding: 24, borderWidth: 1 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6 },
});
