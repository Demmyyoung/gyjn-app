/**
 * ─── Jinni Design System — Design Tokens ─────────────────────────────────────
 *
 * Single source of truth for all visual tokens.
 * Every screen imports from here — no more local `const C = {...}`.
 *
 * Structure:
 *   colors.light / colors.dark  — Full palette with semantic naming
 *   typography                  — Inter font sizes, weights, line heights
 *   spacing                     — 4px grid system
 *   radii                       — Border radius scale
 *   shadows.light / shadows.dark — Elevation system (5 levels)
 *   layout                      — Screen padding, card dimensions
 */

// ─── Color Palettes ──────────────────────────────────────────────────────────

const brand = {
  orange: '#FF6B2C',
  mango:  '#FF9A62',
  peach:  '#FFE0CC',
  cream:  '#FFF5EE',
  purple: '#7B4FE9',
  gold:   '#FFD23F',
};

const brandDark = {
  orange: '#FF7A3D',
  mango:  '#FFAB78',
  peach:  'rgba(255,107,44,0.15)',
  cream:  '#0D0D14',
  purple: '#9B73FF',
  gold:   '#FFD84D',
};

export const colors = {
  light: {
    brand: { ...brand },

    // Backgrounds
    bg: {
      primary:   brand.cream,   // Screen backgrounds
      card:      '#FFFFFF',     // Card surfaces
      elevated:  '#FFFFFF',     // Modals, bottom sheets
      secondary: '#F7F7FA',     // Skeleton, subtle bg
      sand:      '#F2EDE8',     // Secondary card fill
    },

    // Text
    text: {
      primary:   '#1A1A2E',     // Headings, dark text ("night")
      secondary: '#5A5A7A',     // Body copy ("muted")
      hint:      '#BEBEBE',     // Placeholders, disabled
      inverse:   '#FFFFFF',     // Text on dark/colored backgrounds
    },

    // Borders
    border: {
      light:  'rgba(0,0,0,0.06)',         // Card/input borders
      medium: 'rgba(0,0,0,0.1)',          // Slightly stronger
      active: 'rgba(255,107,44,0.4)',     // Focused input borders
    },

    // Status
    status: {
      success:    '#00C896',    // Apply overlay, hired
      error:      '#FF4757',    // Skip overlay, destructive
      warning:    '#D97706',    // Interviewing
      successBg:  'rgba(0,200,150,0.12)',
      errorBg:    'rgba(255,71,87,0.12)',
      warningBg:  'rgba(217,119,6,0.12)',
    },

    // Overlays
    overlay: {
      light:  'rgba(255,255,255,0.6)',
      medium: 'rgba(0,0,0,0.3)',
      heavy:  'rgba(0,0,0,0.5)',
    },
  },

  dark: {
    brand: { ...brandDark },

    bg: {
      primary:   '#0D0D14',
      card:      '#1A1A2E',
      elevated:  '#222240',
      secondary: '#15152A',
      sand:      '#1E1E38',
    },

    text: {
      primary:   '#F0F0F5',
      secondary: '#9595B0',
      hint:      '#555570',
      inverse:   '#0D0D14',
    },

    border: {
      light:  'rgba(255,255,255,0.08)',
      medium: 'rgba(255,255,255,0.12)',
      active: 'rgba(255,107,44,0.5)',
    },

    status: {
      success:    '#00D9A3',
      error:      '#FF5C6A',
      warning:    '#E68A17',
      successBg:  'rgba(0,217,163,0.15)',
      errorBg:    'rgba(255,92,106,0.15)',
      warningBg:  'rgba(230,138,23,0.15)',
    },

    overlay: {
      light:  'rgba(13,13,20,0.6)',
      medium: 'rgba(0,0,0,0.5)',
      heavy:  'rgba(0,0,0,0.7)',
    },
  },
};

// ─── Typography ──────────────────────────────────────────────────────────────
// Uses Inter font family. Weights map to specific font files.

export const fonts = {
  family: {
    regular:   'Inter_400Regular',
    medium:    'Inter_500Medium',
    semiBold:  'Inter_600SemiBold',
    bold:      'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
    black:     'Inter_900Black',
  },
};

export const typography = {
  hero: {
    fontSize: 46,
    fontFamily: fonts.family.black,
    letterSpacing: -1,
    lineHeight: 52,
  },
  display: {
    fontSize: 34,
    fontFamily: fonts.family.extraBold,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  heading: {
    fontSize: 26,
    fontFamily: fonts.family.black,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.family.extraBold,
    letterSpacing: 0,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.family.medium,
    letterSpacing: 0,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.family.semiBold,
    letterSpacing: 0,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  micro: {
    fontSize: 10,
    fontFamily: fonts.family.bold,
    letterSpacing: 0,
    lineHeight: 13,
  },
};

// ─── Spacing (4px grid) ──────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 40,
};

// ─── Border Radii ────────────────────────────────────────────────────────────

export const radii = {
  sm:     8,
  md:     12,
  lg:     16,
  xl:     20,
  '2xl':  24,
  pill:   40,
  circle: 999,
};

// ─── Shadows (platform-aware) ────────────────────────────────────────────────

export const shadows = {
  light: {
    sm: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
    xl: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    glow: {
      shadowColor: '#FF6B2C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 6,
    },
    glow: {
      shadowColor: '#FF7A3D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 4,
    },
  },
};

// ─── Layout Constants ────────────────────────────────────────────────────────

export const layout = {
  screenPaddingH: spacing.xl,       // 20 — horizontal screen padding
  contentPaddingH: spacing['3xl'],  // 28 — content padding (forms, auth)
  cardBorderWidth: 1.5,
  tabBarHeight: 58,
  inputHeight: 48,
  buttonHeight: 52,
};

// ─── Gradient Presets ────────────────────────────────────────────────────────

export const gradients = {
  // Primary CTA gradient (orange → mango)
  primary: (isDark) => [
    isDark ? brandDark.orange : brand.orange,
    isDark ? brandDark.mango  : brand.mango,
  ],
  // Profile card (night → purple-night)
  profileCard: ['#1A1A2E', '#2A2A4E'],
  // Job card color schemes
  jobCards: [
    ['#FF6B2C', '#FFE0CC'],  // Jinni Orange
    ['#7B4FE9', '#EBE5FC'],  // Jinni Purple
    ['#00C896', '#E6FAF5'],  // Jinni Green
    ['#3B82F6', '#DBEAFE'],  // Jinni Blue
  ],
};

// ─── Backward-Compatible Token Map ───────────────────────────────────────────
// Maps the old `const C = { orange, night, ... }` names to the new token structure.
// Use this in StyleSheet.create() (which runs at module level, outside React).
// For dynamic dark-mode colors in JSX, use `useTheme()` from ThemeProvider instead.
//
// Usage:
//   import { C } from '../lib/theme';
//   const styles = StyleSheet.create({ title: { color: C.night } });

export const C = {
  // Brand colors
  orange:    brand.orange,
  mango:     brand.mango,
  peach:     brand.peach,
  cream:     brand.cream,
  purple:    brand.purple,
  gold:      brand.gold,

  // Text (old names)
  night:     colors.light.text.primary,    // '#1A1A2E'
  muted:     colors.light.text.secondary,  // '#5A5A7A'
  hint:      colors.light.text.hint,       // '#BEBEBE'

  // Surfaces
  card:      colors.light.bg.card,         // '#FFFFFF'
  lightGray: colors.light.bg.secondary,    // '#F7F7FA'

  // Borders
  border:    colors.light.border.light,    // 'rgba(0,0,0,0.06)'
  shadow:    'rgba(26, 26, 46, 0.05)',

  // Status
  green:     colors.light.status.success,  // '#00C896'
  red:       colors.light.status.error,    // '#FF4757'
  warning:   colors.light.status.warning,  // '#D97706'
};
