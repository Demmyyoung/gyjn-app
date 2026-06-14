import "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text, View, Pressable, Dimensions, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { BlurView } from 'expo-blur';
import BounceButton from './src/components/BounceButton';

import SplashScreen    from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import AuthScreen       from "./src/screens/AuthScreen";
import LoginScreen     from "./src/screens/LoginScreen";
import SwipeScreen     from "./src/screens/SwipeScreen";
import MatchesScreen   from "./src/screens/MatchesScreen";
import ProfileScreen   from "./src/screens/ProfileScreen";
import EmployerScreen  from "./src/screens/EmployerScreen";
import ChatScreen      from "./src/screens/ChatScreen";

// ── React Query client ────────────────────────────────────────────────────────
// Single instance for the app lifetime. Provides caching for SwipeScreen jobs
// and MatchesScreen matches — no redundant fetches when switching tabs.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 s — cached between tab switches
      gcTime:    5 * 60 * 1000, // 5 min — keep unused data in memory
      retry:     1,
    },
  },
});

// ── Tab Navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

import { Feather } from '@expo/vector-icons';

// Custom tab bar icon component
function TabIcon({ name, focused }) {
  return <Feather name={name} size={22} color={focused ? '#FF6B2C' : '#ABABAB'} />;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  
  const totalTabs = state.routes.length;
  const containerWidth = SCREEN_WIDTH;
  const tabWidth = containerWidth / totalTabs;

  const translateX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    translateX.value = withTiming(state.index * tabWidth, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  }, [state.index]);

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const GlassBackground = Platform.OS === 'ios' ? BlurView : View;

  return (
    <GlassBackground 
      intensity={80} 
      tint="light"
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.6)' : '#ffffff',
        borderTopWidth: 1,
        borderTopColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.06)',
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{
        height: 58,
        flexDirection: 'row',
        position: 'relative',
        alignItems: 'center',
      }}>
        {/* Sliding Background Pill */}
        <Animated.View style={[
          {
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 6,
            width: tabWidth - 12,
            backgroundColor: 'rgba(255, 107, 44, 0.08)',
            borderRadius: 12,
          },
          animatedPillStyle
        ]} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : null;

          return (
            <BounceButton
              key={route.key}
              onPress={onPress}
              activeScale={0.85}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 1,
              }}
            >
              {icon}
              <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: isFocused ? '#FF6B2C' : '#ABABAB',
              }}>
                {label}
              </Text>
            </BounceButton>
          );
        })}
      </View>
    </GlassBackground>
  );
}

/**
 * MainTabs replaces MainPager. It reads the user params injected by LoginScreen
 * via the parent Stack screen's params, then passes them as initialParams to each
 * tab. Screens read their own data via useQuery — params are only used for
 * immutable onboarding-time values (name, skills, cvUrl, etc.).
 */
function MainTabs() {
  const route = useRoute();
  const params = route.params || {};
  const isEmployer = params.userType === "employer";

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Freeze off-screen tabs to preserve memory (Constraint 4)
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={isEmployer ? EmployerScreen : SwipeScreen}
        initialParams={params}
        options={{
          title: isEmployer ? "Roles" : "Discover",
          tabBarIcon: ({ focused }) => <TabIcon name="compass" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={params}
        options={{
          title: isEmployer ? "Applicants" : "Applied",
          tabBarIcon: ({ focused }) => <TabIcon name="message-circle" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={params}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack ────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
        options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
      >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false, animation: "fade" }}
              >
                <Stack.Screen name="Splash"      component={SplashScreen} />
                <Stack.Screen name="Auth"        component={AuthScreen} />
                <Stack.Screen name="Onboarding"  component={OnboardingScreen} />
                <Stack.Screen name="Login"       component={LoginScreen} />
                <Stack.Screen
                  name="Main"
                  component={MainTabs}
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="Chat"
                  component={ChatScreen}
                  options={{ animation: "slide_from_right" }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
      </PostHogProvider>
  );
}
