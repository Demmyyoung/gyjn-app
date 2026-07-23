---
name: Jinni Design System
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#594139'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3500'
  primary: '#ab3500'
  on-primary: '#ffffff'
  primary-container: '#ff6b35'
  on-primary-container: '#5f1900'
  inverse-primary: '#ffb59d'
  secondary: '#605f54'
  on-secondary: '#ffffff'
  secondary-container: '#e3e0d2'
  on-secondary-container: '#656358'
  tertiary: '#6d5b4d'
  on-tertiary: '#ffffff'
  tertiary-container: '#ab9686'
  on-tertiary-container: '#3e2f23'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832600'
  secondary-fixed: '#e6e2d5'
  secondary-fixed-dim: '#cac7b9'
  on-secondary-fixed: '#1c1c14'
  on-secondary-fixed-variant: '#48473d'
  tertiary-fixed: '#f7decc'
  tertiary-fixed-dim: '#dac2b1'
  on-tertiary-fixed: '#25190e'
  on-tertiary-fixed-variant: '#544437'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 1.25rem
  margin-desktop: 2.5rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

This design system is built for a swipe-based job matching experience that balances high-energy optimism with professional reliability. The brand personality is "The Helpful Connector"—approachable, modern, and efficient. 

The visual style is a blend of **Modern Corporate** and **Soft Minimalism**. It utilizes a warm, inviting canvas to reduce the stress associated with job hunting, while using high-energy primary accents to drive action. The interface relies on generous whitespace, high-quality typography, and tactile card-based metaphors to make the "swipe" interaction feel physical and rewarding.

**Emotional Response:**
- **Encouragement:** The vibrant orange evokes energy and a "can-do" attitude.
- **Trust:** The clean, structured typography and soft charcoal tones ensure the platform feels stable and professional.
- **Ease:** The warm cream background and rounded shapes minimize visual friction, making the application process feel less like a chore.

## Colors

The palette is anchored by a high-contrast relationship between the warm background and the energetic primary action color.

- **Primary (Vibrant Orange):** Used exclusively for call-to-actions, progress indicators, and active states. It signifies momentum.
- **Secondary (Warm Cream):** The global background color. It provides a softer, more premium feel than pure white, reducing eye strain.
- **Tertiary (Peach Tint):** A desaturated version of the primary used for secondary buttons, chips, and subtle container fills.
- **Neutral (Soft Charcoal):** Used for primary headings and body text to ensure high legibility without the harshness of pure black.
- **Muted Neutral (#666666):** Reserved for captions, placeholders, and secondary metadata.

## Typography

The system utilizes **Plus Jakarta Sans** (as a high-quality web-safe alternative to SF Pro) to maintain a modern, geometric, and friendly aesthetic. 

- **Headlines:** Use Bold (700) or Semibold (600) weights with slight negative letter spacing to create a tight, impactful presence.
- **Body:** Regular (400) weight is used for standard reading. Medium (500) is used for emphasized body text or CV content.
- **Labels:** Used for buttons and chips. These are always Semibold (600) to stand out against UI elements.
- **Mobile Scaling:** Headlines above 24px should scale down by 15% on small devices (e.g., 32px becomes 28px) to prevent awkward line breaks in job titles.

## Layout & Spacing

This design system uses a **Fluid Grid** model optimized for vertical mobile interactions.

- **Grid:** A 4-column grid for mobile and a 12-column grid for desktop.
- **Safe Zones:** A 20px (1.25rem) side margin is maintained across all mobile screens to ensure tap targets for swiping are not hindered by device edges.
- **Vertical Rhythm:** Content follows an 8px base unit. Stack spacing (the distance between elements like a title and a description) should strictly follow the `stack` tokens to maintain visual consistency.
- **Swipe Cards:** Cards should occupy roughly 80-85% of the viewport height to ensure the "Next" action or navigation remains visible at the bottom.

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Base):** The Warm Cream background (#F9F5E7).
- **Level 1 (Cards/Inputs):** Pure White (#FFFFFF) surfaces. These use a very soft, diffused shadow: `0px 4px 20px rgba(51, 51, 51, 0.08)`.
- **Level 2 (Active/Floating):** Used for the card being currently swiped. Increase shadow spread and opacity to `0px 12px 30px rgba(51, 51, 51, 0.12)` to simulate physical lift.
- **Interaction:** No heavy borders. Depth is communicated via the contrast between the cream background and the white containers.

## Shapes

The shape language is rounded and friendly, avoiding sharp corners to maintain an approachable "Jinni" persona.

- **Primary Containers:** 1rem (16px) corner radius for job cards and onboarding modals.
- **Buttons & Chips:** Full pill-shaped (100px) radius to signify interactability and "softness."
- **Inputs:** 0.75rem (12px) radius to distinguish them slightly from primary buttons while remaining within the rounded family.

## Components

### Buttons
- **Primary:** Vibrant Orange background with White text. Pill-shaped. Height: 56px for main actions.
- **Secondary:** Peach Tint (#FFE6D4) background with Vibrant Orange text. Pill-shaped. Used for "Skip" or "Fill Manually."
- **Ghost:** No background, Vibrant Orange border (2px) or just text. Used for less frequent actions.

### Progress Bar
- **Track:** Muted Charcoal at 10% opacity. 
- **Indicator:** Vibrant Orange. 
- **Style:** Segmented blocks (e.g., 5 segments for 5 steps) with 4px gaps to clearly communicate the journey length.

### Input Fields
- **Default:** White background, 1px border (#E0DBCB), 12px rounded corners.
- **Active/Focus:** 2px Vibrant Orange border.
- **Search:** Includes a Soft Charcoal magnifying glass icon (20px) on the left.

### Chips & Roles
- **Style:** Pill-shaped, Peach Tint background, Soft Charcoal text.
- **Selected State:** Vibrant Orange background, White text.
- **Usage:** For selecting skills, roles, or job preferences in a wrap-layout.

### Cards (Job/Profile)
- White background, 16px radius, soft ambient shadow. 
- Content inside follows the `stack` spacing units, with a 24px internal padding.