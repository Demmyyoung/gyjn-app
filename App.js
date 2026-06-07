import "react-native-gesture-handler";
import React from "react";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text, View } from "react-native";

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

// Custom tab bar icon component
function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
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
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FF6B2C",
        tabBarInactiveTintColor: "#ABABAB",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
          paddingTop: 6,
          paddingBottom: 4,
        },
        // Freeze off-screen tabs to preserve memory (Constraint 4)
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={isEmployer ? EmployerScreen : SwipeScreen}
        initialParams={params}
        options={{
          tabBarIcon: () => <TabIcon emoji="💼" />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        initialParams={params}
        options={{
          title: isEmployer ? "Applicants" : "Applied",
          tabBarIcon: () => <TabIcon emoji="💬" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={params}
        options={{
          tabBarIcon: () => <TabIcon emoji="👤" />,
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
