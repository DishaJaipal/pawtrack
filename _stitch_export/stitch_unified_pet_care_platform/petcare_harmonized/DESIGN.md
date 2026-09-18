---
name: PetCare Harmonized
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece8'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#eae1dc'
  on-surface: '#1f1b18'
  on-surface-variant: '#56423b'
  inverse-surface: '#34302d'
  inverse-on-surface: '#f8efea'
  outline: '#8a726a'
  outline-variant: '#ddc1b7'
  surface-tint: '#9f4118'
  primary: '#9f4118'
  on-primary: '#ffffff'
  primary-container: '#ff8a5b'
  on-primary-container: '#722500'
  inverse-primary: '#ffb599'
  secondary: '#006971'
  on-secondary: '#ffffff'
  secondary-container: '#93eef9'
  on-secondary-container: '#006d76'
  tertiary: '#5f5e59'
  on-tertiary: '#ffffff'
  tertiary-container: '#acaaa4'
  on-tertiary-container: '#3f3f3a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b01'
  secondary-fixed: '#96f1fc'
  secondary-fixed-dim: '#79d4df'
  on-secondary-fixed: '#001f23'
  on-secondary-fixed-variant: '#004f55'
  tertiary-fixed: '#e5e2db'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#fff8f5'
  on-background: '#1f1b18'
  surface-variant: '#eae1dc'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Be Vietnam Pro
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
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 48px
  gutter: 16px
  section-gap: 40px
---

## Brand & Style
The design system is built on a foundation of empathy and clinical reliability. It targets two distinct personas: the "Pet Parent," who requires a warm, supportive mobile experience, and the "Service Provider," who needs a high-density, professional dashboard. 

The aesthetic blends **Modern Corporate** structure with **Soft Minimalist** elements. By utilizing generous whitespace and a "soft-touch" interface, the system avoids the coldness of traditional medical software while maintaining the authority of a professional veterinary platform. The interface should feel approachable but never juvenile, ensuring users feel their pets are in capable, expert hands.

## Colors
The palette is rooted in "Natural Vitality." 
- **Primary (Sunset Orange):** Used for key actions (CTAs), health alerts, and active states. It represents energy and the bond between owner and pet.
- **Secondary (Deep Teal):** Provides a professional, calming counter-balance. Used for medical records, veterinary confirmations, and navigation icons to signify trust.
- **Tertiary (Canvas):** A warm, off-white neutral used for card backgrounds and page sections to reduce eye strain compared to pure white.
- **Success/Warning:** Use soft-tinted greens and ambers that harmonize with the teal and orange, avoiding harsh neon tones.

## Typography
We use a dual-font approach to balance personality and utility. **Plus Jakarta Sans** provides a friendly, geometric roundness for headlines that immediately establishes the "playful" brand pillar. **Be Vietnam Pro** is used for all functional text and body copy; its contemporary grotesque structure ensures high legibility for complex medical instructions or service schedules. 

For the mobile-first Pet Parent view, prioritize `headline-lg-mobile` to ensure headers don't wrap awkwardly. For the desktop Service Provider view, use `label-md` for table headers and navigation links to maintain a disciplined, organized feel.

## Layout & Spacing
This design system utilizes a **Hybrid Grid** model:
- **Pet Parent (Mobile-first PWA):** A fluid 1-column layout with a bottom-docked navigation bar. Use `container-padding-mobile` for side margins to ensure touch targets don't hit screen edges.
- **Service Provider (Desktop-first):** A 12-column fixed-width grid (max-width 1440px) with a persistent left-hand sidebar for navigation. 

Spacing follows an 8px linear scale. For "Pet Parent" views, use increased vertical padding between cards (24px) to create an airy, stress-free flow. For "Service Provider" views, tighten the vertical rhythm to 12px or 16px to maximize information density on schedules and patient lists.

## Elevation & Depth
The system uses **Tonal Layering** combined with **Ambient Shadows**. 
- **Level 0 (Surface):** The Tertiary "Canvas" color (#F4F1EA).
- **Level 1 (Cards/Elements):** Pure White (#FFFFFF) with a very soft, diffused shadow: `0px 4px 20px rgba(74, 69, 66, 0.06)`. This creates a subtle "lift" that feels tactile and safe.
- **Level 2 (Modals/Popovers):** Deeper shadow with more spread: `0px 12px 32px rgba(74, 69, 66, 0.12)`.

Avoid high-contrast borders. Instead, use a 1px stroke in a slightly darker version of the Tertiary color to define boundaries where shadows aren't appropriate.

## Shapes
In line with the "friendly" brand pillar, the design system utilizes high corner radii. 
- **Standard Components:** 16px radius for buttons, input fields, and small cards.
- **Large Containers:** 24px or 32px radius for primary dashboard cards and bottom sheets on mobile.
- **Icons:** Use "Iconly" or similar rounded-cap styles to match the typography.
- **Avatars:** Pet photos should always be contained in a "Squircle" (super-ellipse) rather than a perfect circle to maintain a modern, custom feel.

## Components
- **Buttons:** Primary buttons use the Orange hex with white text and 16px rounded corners. Use a subtle inner-glow on hover for a tactile, "squishy" feel.
- **Cards:** White backgrounds, 24px padding, and 16px-24px rounded corners. Service Provider cards should include a subtle 1px border.
- **Chips:** Used for pet traits (e.g., "Vaccinated," "Friendly"). Use the Secondary Teal at 10% opacity with 100% opacity text.
- **Tab Navigation:** 
    - *Mobile:* Bottom bar with icons and labels. Use a Secondary Teal "indicator dot" above the active icon.
    - *Desktop:* Segmented controls with a sliding white pill background over a Tertiary grey track.
- **Input Fields:** Large tap targets (min 48px height) with 12px padding. The border should turn Secondary Teal on focus to signal a "professional" state.
- **Pet Progress Bar:** A custom component using a paw-print icon as the progress indicator on a soft orange track.