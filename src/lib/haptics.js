/**
 * ─── Jinni Design System — Haptic Feedback ───────────────────────────────────
 *
 * Named haptic triggers mapped to specific interaction types.
 * Creates a subconscious vocabulary — users *feel* what's happening.
 *
 * Usage:
 *   import { haptic } from '../lib/haptics';
 *
 *   haptic.press();      // Light tap on button press
 *   haptic.success();    // Celebratory buzz on apply/submit
 *   haptic.error();      // Warning buzz on validation failure
 */

import * as Haptics from 'expo-haptics';

export const haptic = {
  /** Light tap — button presses, tab switches, minor touches */
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium tap — card swipe threshold, delete confirm, pull-to-refresh */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Heavy tap — long press menu open */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /** Success notification — apply/submit, match celebration, hired */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Error notification — validation failure, network error */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Warning notification — destructive action warning */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  /** Selection change — picker, date selection, toggle */
  selection: () => Haptics.selectionAsync(),
};
