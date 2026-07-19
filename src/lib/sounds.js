/**
 * ─── Jinni Design System — Sound Effects ─────────────────────────────────────
 *
 * Preloads and plays royalty-free audio cues at key moments.
 * Sounds respect the device's silent/vibration mode automatically.
 *
 * Usage:
 *   import { preloadSounds, playSound } from '../lib/sounds';
 *
 *   // Call once in App.js after fonts load:
 *   await preloadSounds();
 *
 *   // Play at the right moment:
 *   playSound('apply');
 *   playSound('match');
 *   playSound('send');
 */

// Sound file references — these will be loaded when the actual
// sound assets are added to assets/sounds/.
// For now, we define the structure and gracefully handle missing files.
const SOUND_FILES = {
  apply:        null, // Will be: require('../../assets/sounds/apply_whoosh.mp3')
  match:        null, // Will be: require('../../assets/sounds/match_shimmer.mp3')
  send:         null, // Will be: require('../../assets/sounds/send_pop.mp3')
  notification: null, // Will be: require('../../assets/sounds/notification_bell.mp3')
  error:        null, // Will be: require('../../assets/sounds/error_thud.mp3')
};

// Cache loaded Sound objects to avoid reloading on every play
const soundCache = {};

/**
 * Preload all sound effects into memory.
 * Call once during app startup (after fonts are loaded).
 * Gracefully handles missing files — sounds are optional.
 */
export async function preloadSounds() {
  // TODO: Migrate to expo-audio when sound files are added
  console.log('[Sounds] Audio preload skipped (expo-av removed to fix JSI crash)');
}

/**
 * Play a named sound effect.
 * Silently does nothing if the sound hasn't been loaded.
 *
 * @param {'apply' | 'match' | 'send' | 'notification' | 'error'} name
 */
export async function playSound(name) {
  // TODO: Migrate to expo-audio when sound files are added
  return;
}

/**
 * Unload all sounds from memory.
 * Call on app teardown if needed.
 */
export async function unloadSounds() {
  return;
}
