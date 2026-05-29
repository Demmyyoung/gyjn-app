import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
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

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Parse deep link url and set session
  const parseAndSetSession = async (url) => {
    try {
      const hash = url.split('#')[1];
      if (!hash) return;
      
      const params = {};
      hash.split('&').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to parse redirected session:', err);
    }
  };

  const handleAuthSuccess = async (user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && data.user_name) {
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Main',
            params: {
              userName:    data.user_name,
              userRole:    data.user_role,
              jobType:     data.job_type,
              aboutMe:     data.about_me,
              searchTarget: data.search_target,
              userType:    data.user_type,
              skills:      data.skills || [],
              cvUrl:       data.cv_url,
              category:    data.category,
            }
          }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (err) {
      // If error (e.g. profile doesn't exist), route to Onboarding
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  };

  // For handling the deep link redirect in expo-web-browser manually
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      if (url && url.includes('jinni://')) {
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

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
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
      const redirectUrl = Linking.createURL('google-auth', { scheme: 'jinni' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          await parseAndSetSession(result.url);
        }
      }
    } catch (err) {
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
              {isSignUp ? 'Create your account' : 'Welcome back'}
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
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={C.hint}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
              />
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
