import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const C = {
  orange:  '#FF6B2C',
  mango:   '#FF9A62',
  peach:   '#FFE0CC',
  cream:   '#FFF5EE',
  night:   '#1A1A2E',
  muted:   '#5A5A7A',
  hint:    '#BEBEBE',
};

export default function AuthScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Extract the auth code from the redirect URL and exchange it for a session.
  // Supabase stores the PKCE code_verifier internally when signInWithOAuth is called,
  // so we just need to pass the raw code back and it handles the rest.
  const parseAndSetSession = async (url) => {
    console.log('Parsing redirect URL:', url);
    try {
      // Try code (PKCE flow) - this is what Supabase uses by default
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        const code = decodeURIComponent(codeMatch[1]);
        console.log('Found auth code, exchanging for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('exchangeCodeForSession error:', error.message);
          // Fallback: manually refresh session in case verifier state was lost
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            console.log('Session recovered from storage!');
          }
        } else {
          console.log('PKCE session set successfully for:', data?.user?.email);
        }
        return;
      }

      // Fallback: implicit flow (access_token in hash)
      const hashMatch = url.match(/#access_token=([^&]+).*&refresh_token=([^&]+)/);
      if (hashMatch) {
        console.log('Setting implicit session...');
        const { error } = await supabase.auth.setSession({
          access_token: decodeURIComponent(hashMatch[1]),
          refresh_token: decodeURIComponent(hashMatch[2]),
        });
        if (error) throw error;
        console.log('Implicit session set successfully!');
      }
    } catch (err) {
      console.error('Failed to parse redirected session:', err.message);
    }
  };

  const handleAuthSuccess = async (user) => {
    try {
      // Check employer profile first
      let { data: empData } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (empData && empData.user_name) {
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Main',
            params: {
              userName:    empData.user_name,
              userRole:    empData.user_role || empData.job_type,
              jobType:     empData.job_type,
              aboutMe:     empData.about_me,
              searchTarget: empData.search_target,
              userType:    'employer',
              skills:      empData.skills || [],
              cvUrl:       empData.cv_url,
              category:    empData.category,
            }
          }],
        });
        return;
      }

      // Check seeker profile
      let { data: seekerData } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (seekerData && seekerData.user_name) {
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Main',
            params: {
              userName:    seekerData.user_name,
              userRole:    seekerData.user_role || seekerData.job_type,
              jobType:     seekerData.job_type,
              aboutMe:     seekerData.about_me,
              searchTarget: seekerData.search_target,
              userType:    'seeker',
              skills:      seekerData.skills || [],
              cvUrl:       seekerData.cv_url,
              category:    seekerData.category,
            }
          }],
        });
        return;
      }

      // No completed profile found. Route to forms (LoginScreen)
      // Pass the role they selected during onboarding so LoginScreen knows what forms to show.
      const currentRole = route?.params?.role || 'seeker';
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { role: currentRole } }],
      });
    } catch (err) {
      const currentRole = route?.params?.role || 'seeker';
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { role: currentRole } }],
      });
    }
  };

  // For handling the deep link redirect in expo-web-browser manually
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      console.log('Intercepted deep link event URL:', url);
      if (url && (url.includes('jinni://') || url.includes('google-auth') || url.includes('--/google-auth'))) {
        parseAndSetSession(url);
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  // Listen for auth state changes to route user
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleAuthSuccess(session.user);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleForgotPassword = async () => {
    const emailRegex = /.+@.+\..+/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        Alert.alert('Reset Password Error', error.message);
      } else {
        Alert.alert('Password Reset', 'If this email is registered, you will receive a reset link shortly.');
      }
    } catch (err) {
      Alert.alert('Reset Password Error', err.message);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        Alert.alert('Sign Up Error', error.message);
      } else {
        if (data?.session) {
          // Signed in immediately! Auth listener handles routing.
        } else {
          Alert.alert('Sign Up Successful!', 'Check your email inbox to verify your account if email confirmation is enabled.');
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        Alert.alert('Login Error', error.message);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Always use the custom scheme so the app can catch the redirect
      const redirectUrl = 'jinni://google-auth';
      console.log('[GoogleAuth] Using redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      console.log('[GoogleAuth] Opening browser...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log('[GoogleAuth] Browser result type:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[GoogleAuth] Got redirect back:', result.url.substring(0, 80) + '...');
        await parseAndSetSession(result.url);
      } else if (result.type === 'cancel') {
        console.log('[GoogleAuth] User cancelled sign-in');
      } else {
        console.log('[GoogleAuth] Unexpected result:', result.type);
      }
    } catch (err) {
      console.error('[GoogleAuth] Error:', err.message);
      Alert.alert('Google Sign-In Failed', err.message || JSON.stringify(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Logo / Branding */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[C.orange, C.mango]}
              style={styles.logoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoEmoji}>🧞‍♂️</Text>
            </LinearGradient>
            <Text style={styles.logoText}>Jinni</Text>
            <Text style={styles.logoTagline}>Where job wishes come true</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isSignUp 
                ? `Create ${route?.params?.role === 'employer' ? 'Employer ' : ''}account` 
                : 'Welcome back'}
            </Text>

            <View style={styles.group}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. you@example.com"
                placeholderTextColor={C.hint}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={C.hint}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIconContainer}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={C.hint} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Email Button */}
            <TouchableOpacity onPress={handleEmailAuth} activeOpacity={0.85} disabled={loading}>
              <LinearGradient colors={[C.orange, C.mango]} style={styles.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} activeOpacity={0.8} disabled={googleLoading}>
              {googleLoading ? (
                <ActivityIndicator color={C.night} size="small" />
              ) : (
                <>
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={styles.socialText}>Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 40 },
  logoContainer: { alignItems: 'center', gap: 8 },
  logoBadge: {
    width: 72, height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: { fontSize: 36 },
  logoText: { fontSize: 32, fontWeight: '900', color: C.night },
  logoTagline: { fontSize: 14, color: C.muted, fontWeight: '500' },

  form: { gap: 20 },
  formTitle: { fontSize: 20, fontWeight: '800', color: C.night, textAlign: 'center', marginBottom: 10 },
  group: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.8 },
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  eyeIconContainer: {
    padding: 14,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '600',
  },
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  dividerText: { fontSize: 12, color: C.hint, fontWeight: '600' },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 14,
    gap: 12,
  },
  socialIcon: { fontSize: 18, fontWeight: '800', color: C.night },
  socialText: { fontSize: 15, fontWeight: '700', color: C.night },

  toggleBtn: { paddingVertical: 10 },
  toggleText: { fontSize: 14, color: C.orange, fontWeight: '600', textAlign: 'center' },
});
