# Fynd App

> AI-assisted travel discovery · React Native (Expo) · Firebase · Google Places · OpenAI
>
> **Active branch:** `fynd-V1-web` — Production web deployment on Cloudflare Pages

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Branch Map](#branch-map)
5. [Environment Setup](#environment-setup)
6. [Running the App](#running-the-app)
7. [Web Deployment](#web-deployment)
8. [Screen Inventory](#screen-inventory)
9. [Data Architecture](#data-architecture)
10. [Completed Work](#completed-work)
11. [Known Issues & Remaining Work](#known-issues--remaining-work)
12. [Commit History (fynd-V1-web)](#commit-history-fynd-v1-web)

---

## Project Overview

**Fynd** helps travellers plan spontaneous trips by:

- Setting a starting location (GPS or manual entry)
- Choosing exploration parameters (hours, distance, time of day)
- Selecting "vibes" (arts, food, nightlife, nature, etc.)
- Receiving AI-curated place suggestions via Google Places + OpenAI
- Building a sorted itinerary and navigating it on a live map
- Accessing nearby essential services (Medical, Currency, Transport)
- Saving places and itineraries to their profile
- Upgrading to **Fynd Plus** for unlimited access

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native (Expo) | SDK 55 / RN 0.83.2 |
| Language | TypeScript | 5.9 |
| UI | React Native StyleSheet | — |
| Navigation | React Navigation | 7 (Stack + Bottom Tabs) |
| State | Zustand | 5 |
| Auth & DB | Firebase (Auth + Firestore) | 12 |
| Maps | react-native-maps + Google Maps SDK | — |
| Places | Google Places API | Text + Nearby Search |
| AI | OpenAI API (GPT-4o) | via proxy |
| Payments | Stripe React Native SDK | installed, not active |
| Animation | Lottie React Native | — |
| Location | expo-location | 55.1.2 |
| Error tracking | Sentry | @sentry/react-native 7.11 |
| Web host | Cloudflare Pages | — |
| API proxy | Cloudflare Worker | `/server/worker.js` |
| Safe areas | react-native-safe-area-context | 5.6.2 |
| Fonts | @expo-google-fonts/inter | 0.4.2 |

---

## Repository Structure

```
fynd-app/
├── App.tsx                   # Root — font loading, Sentry init, providers
├── index.ts                  # Expo entry point
├── app.json                  # Expo config (scheme, web, icons)
├── eas.json                  # EAS Build config
├── metro.config.js           # Metro bundler config
├── tsconfig.json
├── package.json
│
├── assets/                   # Lottie + static assets
├── public/                   # Web-only: _redirects (Cloudflare SPA routing)
├── feedback/                 # Privacy policy + Terms HTML (served statically)
│
├── server/
│   ├── worker.js             # Cloudflare Worker — proxies Google Places & OpenAI
│   ├── wrangler.toml         # Worker deployment config
│   └── index.js              # Local dev server
│
├── android/                  # Android native project
│
└── src/
    ├── components/           # Shared UI components
    ├── constants/            # config.ts, layout.ts
    ├── hooks/                # (placeholder)
    ├── navigation/
    │   └── AppNavigator.tsx  # Stack + Tab navigator
    ├── screens/              # All app screens (see inventory below)
    ├── services/             # Firebase, Firestore, Google Places, OpenAI, Auth
    ├── store/                # Zustand stores (useAuthStore, useTripStore)
    ├── theme/                # fonts.ts
    ├── types/                # Shared TypeScript types
    └── web/
        └── WebAppViewport.tsx  # 440px centered shell for desktop browsers
```

---

## Branch Map

| Branch | Purpose | Status |
|--------|---------|--------|
| `fynd-V1-web` | **Active** — web-deployed production branch | ✅ Current |
| `fynd-App-version-1` | Native-first pre-web baseline | Stable / archived |
| `master` | Original init commit | Inactive |
| `main` | Remote default | Mirrors master |
| `fix/sentry-REACT-NATIVE-6-*` | Sentry bugfix branch (merged) | Archived |
| `seer/feat/map-screen-web-geolocation` | Map geolocation exploration (merged) | Archived |

---

## Environment Setup

Create a `.env` file in the project root (never commit this):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_OPENAI_PROXY=https://fynd-api.jallohosmanamadu311.workers.dev
```

> On web production, all Places and OpenAI calls are routed through the Cloudflare Worker proxy to avoid CORS and protect API keys.

---

## Running the App

```bash
# Install dependencies
npm install

# Start Expo dev server (native)
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Run in web browser (development)
npx expo start --web
```

### Web Build

```bash
npm run build:web
```

> This runs `npx expo export --platform web` then copies Inter font files and Ionicons to `dist/fonts/` so Cloudflare Pages can serve them from clean `/fonts/*.ttf` paths (avoiding `@`-scoped URL routing conflicts with the SPA `_redirects` rule).

---

## Web Deployment

- **Platform:** Cloudflare Pages (`fynd-v1-web` project)
- **Live URL:** `https://fynd-app-v1.pages.dev`
- **Branch tracked:** `fynd-V1-web`

**Deploy manually:**

```bash
npm run build:web
npx wrangler pages deploy dist --project-name fynd-v1-web
```

**Worker proxy** (handles Google Places + OpenAI on web):

```bash
cd server
npx wrangler deploy
```

---

## Screen Inventory

### Auth & Onboarding

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Logo | `LogoScreen.tsx` | ✅ Complete | Splash / brand entry point |
| Splash | `SplashScreen.tsx` | ✅ Complete | Auth-aware routing — returns users skip onboarding |
| Onboarding 1–4 | `Onboarding[1-4]Screen.tsx` | ✅ Complete | Responsive via `useWindowDimensions` |
| Register | `RegisterScreen.tsx` | ✅ Complete | Email/password, creates Firestore user + subscription doc |
| Login | `LoginScreen.tsx` | ✅ Complete | Email/password + password reset |
| Google Sign-In | — | ⚠️ Partial | SDK installed, disabled due to native module conflict |

### Core App (Bottom Tabs)

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Create Trip | `CreateTripScreen.tsx` | ✅ Complete | 2-step wizard: GPS or manual location → vibe selection → Processing |
| Map | `MapScreen.tsx` | ⚠️ Partial | Google Maps, markers, place carousel, geolocation hardened. Search bar UI-only |
| Feedback | `SupportFeedbackScreen.tsx` | ✅ Complete | Bug / feature / feedback form, saves to Firestore |

### Trip Flow (Stack)

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Processing | `ProcessingScreen.tsx` | ✅ Complete | Lottie animation, retries, advances to SuggestedPlaces |
| Suggested Places | `SuggestedPlacesScreen.tsx` | ✅ Complete | Places from API, add to itinerary CTA, upgrade gate. Passes GPS coords to Itinerary |
| Itinerary | `ItineraryScreen.tsx` | ✅ Complete | **Sorted nearest → farthest via Haversine formula**. Remove place, Open in Maps modal |
| Trip Map | `MapScreen.tsx` | ⚠️ Partial | Reused for stop-by-stop nav; hardcoded fallback coords remain |

### Profile & Settings (Stack)

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Profile | `ProfileScreen.tsx` | ✅ Complete | User info, avatar, settings nav |
| Account Settings | `AccountSettingsScreen.tsx` | ✅ Complete | Name, home city; avatar upload placeholder |
| Travel Preferences | `TravelPreferenceScreen.tsx` | ✅ Complete | Multi-select vibes, saves to Firestore, safe-area footer |
| Subscription | `SubscriptionScreen.tsx` | ✅ UI Only | Free vs Fynd Plus cards; Stripe not wired |
| Legal | `LegalScreen.tsx` | ✅ Complete | ToS, Privacy, Cookie list |
| Legal Detail | `LegalDetailScreen.tsx` | ✅ Complete | Renders any legal doc |
| Support / Feedback | `SupportFeedbackScreen.tsx` | ✅ Complete | Saves to Firestore |
| Delete Account | `DeleteAccountScreen.tsx` | ⚠️ UI Only | Modal confirms but does not delete Firestore data or Firebase user |

### Monetisation

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Spotlight | `SpotlightScreen.tsx` | ✅ UI Complete | Travel deals grid, category filter, partner links. Not personalised to vibes yet |
| Service Hub | `ServiceHubScreen.tsx` | ✅ Complete | GPS-based Medical / Currency / Transport / Bathrooms nearby. Premium-only gate |

---

## Data Architecture

### Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users/{uid}` | Profile, home city, travel preferences |
| `subscriptions/{uid}` | Plan type, `isPremium`, usage counters |
| `trips/{tripId}` | Created trip metadata |
| `itineraries/{id}` | Generated itinerary, list of stops |
| `savedPlaces/{id}` | User-saved places |
| `feedback/{id}` | User-submitted feedback / bug reports |

### State (Zustand)

| Store | File | Holds |
|-------|------|-------|
| `useAuthStore` | `store/useAuthStore.ts` | Firebase user, Firestore profile, `isPremium`, usage counters |
| `useTripStore` | `store/useTripStore.ts` | Active trip session: destination, lat/lng, vibes, selected places |

### Free Tier Gate Limits

| Resource | Free Limit |
|---------|-----------|
| Trips / month | 3 |
| Itineraries | 1 |
| Saved places | 5 |
| Places per trip | 5 |

---

## Completed Work

### Session — Sentry Bug Fixes (commit `b44eb7f`)

- **Font loading**: All Inter (400/500/600/700) and Ionicons fonts now load from clean `/fonts/*.ttf` URI paths on web production, bypassing Cloudflare SPA `_redirects` routing that was blocking `@`-scoped asset URLs
- **`package.json build:web`**: Extended to copy all 4 Inter weights + Ionicons to `dist/fonts/` post-build
- **Geolocation hardening** (`MapScreen.tsx`): Wrapped in `typeof navigator !== 'undefined'` and `typeof geo.getCurrentPosition === 'function'` — prevents crashes where `navigator.geolocation` is absent

### Session — Cross-Device UI Fixes (commit `ccb1c9e`)

- **`TravelPreferenceScreen`**: Converted absolute-positioned bottom bar to flow layout with `useSafeAreaInsets`; no more overlap on small phones with browser toolbar
- **Onboarding 1–4**: Replaced static `Dimensions.get('window')` with `useWindowDimensions()` hook inside each component — correctly responds to orientation changes and web viewport resizes. Image and button sizes clamped with `Math.min / Math.max`.

### Session — Bottom Navbar + Itinerary Sorting (commit `29b3ad1`)

- **Bottom tab bar** (`AppNavigator.tsx`): Replaced heuristic `72 + 30 = 102px` bottom offset with `bottom: 0` pinning. Height is `56 + safeBottom`, `paddingBottom` absorbs `insets.bottom` (iOS home indicator). Behaviour is now consistent across iPhone Safari, Chrome Android, Samsung Internet, and small screens
- **GPS coordinate flow** (`SuggestedPlacesScreen.tsx`): User `latitude`/`longitude` from `route.params` now forwarded to `ItineraryScreen` via `navigation.navigate`
- **Haversine sort** (`ItineraryScreen.tsx`): Added `haversineKm(lat1, lon1, lat2, lon2)` function. Itinerary stops are sorted nearest → farthest from the user's GPS reference point at init time. Gracefully falls back to original order when no coordinates are available

---

## Known Issues & Remaining Work

### High Priority

| # | Issue | File | Detail |
|---|-------|------|--------|
| 1 | Map search bar non-functional | `MapScreen.tsx` | UI rendered but query not wired to Google Places |
| 2 | "Ignore Itinerary" button no-op | `ItineraryScreen.tsx` | Should call `updateItineraryStatus(id, 'ignored')` in Firestore |
| 3 | Delete Account — data not deleted | `DeleteAccountScreen.tsx` | Must delete `users`, `subscriptions`, `trips`, `itineraries`, `savedPlaces` docs and call `auth.currentUser.delete()` |
| 4 | Map fallback coordinates | `MapScreen.tsx` | NYC hardcoded coords still used when no real trip stops are passed |

### Medium Priority

| # | Feature | Detail |
|---|---------|--------|
| 5 | Stripe payment flow | Wire `SubscriptionScreen` CTA to Stripe Checkout; Worker handles webhook to flip `isPremium` in Firestore |
| 6 | Profile photo upload | `expo-image-picker` → Firebase Storage → Firestore + Zustand update |
| 7 | Google Sign-In | Resolve native module conflict or switch to Expo AuthSession OAuth |
| 8 | Spotlight personalisation | Sort/filter deals by user's saved vibes |
| 9 | "Book Now" links | Populate from Google Places `website` field |
| 10 | OpenAI itinerary scheduling | Use GPT to order stops by time-of-day and exploration hours |

### Lower Priority

| # | Feature | Detail |
|---|---------|--------|
| 11 | Push notifications | Trip reminders via Expo Notifications + FCM |
| 12 | Offline support | AsyncStorage cache for recent itineraries |
| 13 | App Store / Play Store submission | EAS production builds, signing, submission |
| 14 | Unit & integration tests | Auth flow, trip creation, gate logic — zero tests written |
| 15 | Move API keys server-side | Currently in client-side env vars; should be proxied exclusively |
| 16 | `firebase.ts` circular import | `firebase.ts → authService.ts → database.ts → firebase.ts` — causes Metro warnings |

---

## Commit History (fynd-V1-web)

| Commit | Message |
|--------|---------|
| `29b3ad1` | fix: pin bottom navbar to viewport bottom; sort itinerary by distance from user GPS |
| `ccb1c9e` | fix(ui): responsive onboarding sizing and safe-area travel preference footer |
| `b44eb7f` | fix(sentry): stabilize web font loading and harden map geolocation path |
| `0d79eaf` | fix: map bottom-bar visibility + strict preference filtering |
| `bf8f6d4` | perf+security: logs, maps proxy, retries, sentry timings |
| `cbe56f7` | fix: remove dynamic viewport reflow on mobile web |
| `5966f08` | fix: hard fallback mobile web scrolling + splash stability |
| `6ff5c5b` | fix: phone scrolling regression + splash stretch |
| `3a76a7f` | fix: Suggested Places web scrolling on Safari/Chrome |
| `8d32df3` | fix: persistent web viewport + splash + phone scrolling |
| `31fbf59` | fix: splash scaling + iOS scroll root cause fixes |
| `fada7dd` | feat: mobile app web container architecture |
| `d9379a4` | fix: web compat + analytics — 5 screens |
| `f17f3ee` | fix(auth): update Google OAuth web client ID for fynd-V1-web deployment |
| `a48ac14` | fix(map): fix all web buttons — pointerEvents, zIndex, window.confirm/open |
| `56fcc1f` | chore: add preview and worker:dev scripts for local testing |
| `b43bee2` | feat(web): production web build — 440px container, map iframe, PWA, scroll, CTA |
| `43ad91a` | fix(icons): serve Ionicons from /fonts/Ionicons.ttf — bypass Cloudflare @-path issue |

---

## Key Architecture Decisions

### Web — 440px Mobile Shell

`src/web/WebAppViewport.tsx` wraps the entire app in a `maxWidth: 440` centred container using `height: 100dvh` (dynamic viewport height). This ensures the app renders as a mobile-phone-sized UI on all screen sizes without a native build, and the dynamic viewport unit means the bottom navbar never hides behind the browser address bar.

### Web Font Loading

On production web, fonts are served from `/fonts/*.ttf` (copied at build time). This sidesteps the Cloudflare SPA `_redirects` catch-all rule that was intercepting `@expo-google-fonts/inter`-scoped asset URLs and returning `200 index.html` instead of the actual font binary.

### Bottom Tab Bar

`position: absolute; bottom: 0` with `paddingBottom: insets.bottom` (from `useSafeAreaInsets`). Height expands by `insets.bottom` so the visible content area stays 56px and the bar background fills the safe-area zone. No hardcoded pixel offsets.

### Itinerary Sorting

Haversine formula calculates straight-line distance in km between user GPS coordinates and each place's coordinates. Sort runs once at component initialisation — zero overhead at render time.

### API Proxy Architecture

All Google Places and OpenAI requests from the web app go through a Cloudflare Worker (`server/worker.js`). This keeps API keys off the client bundle, adds basic rate-limit logging, and avoids CORS preflight issues.
