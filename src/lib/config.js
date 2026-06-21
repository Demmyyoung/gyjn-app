/**
 * ─── Jinni App Config ────────────────────────────────────────────────────────
 *
 * Shared configuration utilities. Extracted from duplicated code across
 * SwipeScreen, LoginScreen, ProfileScreen, and EmployerScreen.
 */

import { Platform, NativeModules } from 'react-native';

/**
 * Resolves the backend URL for API calls.
 *
 * Priority:
 *  1. EXPO_PUBLIC_BACKEND_URL env var (production / staging)
 *  2. Metro bundler host IP (physical device on same Wi-Fi)
 *  3. Android emulator fallback (10.0.2.2)
 *  4. localhost fallback (iOS simulator)
 */
export function getBackendUrl() {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Dynamically resolve your computer's local IP from the Metro bundler URL.
  // This ensures physical devices on the same Wi-Fi can connect.
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

  // Emulators / Simulators fallbacks
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}
