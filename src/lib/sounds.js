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

import { Audio } from 'expo-av';

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
  try {
    // Configure audio mode to play alongside other audio and respect silent mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // Respect silent switch
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    for (const [name, source] of Object.entries(SOUND_FILES)) {
      if (source) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume: 0.5,
          });
          soundCache[name] = sound;
        } catch (err) {
          console.warn(`[Sounds] Failed to preload "${name}":`, err.message);
        }
      }
    }
  } catch (err) {
    console.warn('[Sounds] Audio setup failed:', err.message);
  }
}

/**
 * Play a named sound effect.
 * Silently does nothing if the sound hasn't been loaded.
 *
 * @param {'apply' | 'match' | 'send' | 'notification' | 'error'} name
 */
export async function playSound(name) {
  const sound = soundCache[name];
  if (!sound) return; // Sound not loaded or file missing — fail silently

  try {
    await sound.setPositionAsync(0); // Rewind to start
    await sound.playAsync();
  } catch (err) {
    // Don't let sound errors crash the app
    console.warn(`[Sounds] Failed to play "${name}":`, err.message);
  }
}

/**
 * Unload all sounds from memory.
 * Call on app teardown if needed.
 */
export async function unloadSounds() {
  for (const sound of Object.values(soundCache)) {
    try {
      await sound.unloadAsync();
    } catch (_) {
      // Ignore unload errors
    }
  }
}
