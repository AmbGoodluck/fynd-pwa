# Fynd App — Build Progress

> Last updated: Day 19 (March 2026)
> Platform: React Native (Expo) · Firebase · Google Places API · OpenAI

---

## App Vision

**Fynd** is an AI-assisted travel discovery app that helps travellers:
- Create personalised trip plans based on their vibe (arts, food, nightlife, etc.)
- Discover and save nearby places using Google Places
- Generate and review itineraries, then navigate them on a live map
- Access essential travel services (medical, transport, currency) wherever they are
- Book hotels, flights and experiences through integrated partner deals
- Manage their account, preferences and a subscription (Fynd Plus)

---

## What Has Been Built

### Foundation & Infrastructure
| Item | Status |
|------|--------|
| Expo + React Native 0.83 project setup | Done |
| TypeScript configured | Done |
| React Navigation (Stack + Bottom Tabs) | Done |
| Zustand global auth store | Done |
| Firebase (Auth + Firestore) fully wired | Done |
| Environment variables via `.env` | Done |
| Lottie animation support | Done |
| Google Maps SDK (`react-native-maps`) | Done |
| Stripe React Native SDK installed | Done (not connected) |
| OpenAI service integrated | Done |
| Google Places API service layer | Done |
| expo-location (GPS) | Done |
| expo-image-picker (installed) | Done (not wired) |

---

### Screen-by-Screen Progress

#### Auth & Onboarding
| Screen | Status | Notes |
|--------|--------|-------|
| `SplashScreen` | Complete | Auth-aware routing — skips onboarding for returning users |
| `Onboarding1Screen` | Complete | Value proposition slide 1 |
| `Onboarding2Screen` | Complete | Value proposition slide 2 |
| `Onboarding3Screen` | Complete | Value proposition slide 3 |
| `Onboarding4Screen` | Complete | Value proposition slide 4 |
| `RegisterScreen` | Complete | Email/password, Firestore user + subscription doc created, Zustand login |
| `LoginScreen` | Complete | Email/password, password reset, Firestore user fetched |
| Google Sign-In | Partial | SDK installed, stub in place; disabled due to native module conflict |

#### Core App (Bottom Tabs)
| Screen | Status | Notes |
|--------|--------|-------|
| `HomeScreen` | Complete | Auto-rotating banner, greeting, ServiceHub shortcuts, recent itineraries from Firestore |
| `CreateTripScreen` | Complete | 5-step wizard: Destination → Accommodation → Time & Distance → Time of Day → Vibe Selection. Calls Google Places API on submit. Free tier gate enforced. |
| `MapScreen` | Partial | Google Maps with markers, place card carousel, stop-by-stop navigation, "End Trip". Search bar UI exists but is not functional. |
| `ServiceHubScreen` | Complete | GPS-based nearby search (Medical, Currency Exchange, Transport, Bathrooms). OpenAI enhances descriptions. Premium-only gate. |
| `SavedScreen` | Complete | Two tabs — Saved Places and Saved Itineraries, both loaded from Firestore. |

#### Trip Flow (Stack Screens)
| Screen | Status | Notes |
|--------|--------|-------|
| `ProcessingScreen` | Complete | Lottie loading animation, auto-advances to Suggested Places after 3.5 s |
| `SuggestedPlacesScreen` | Complete | Results from Google Places API. Search filter, save to Firestore, add to itinerary, upgrade gate, generate itinerary CTA. |
| `ItineraryScreen` | Partial | Displays stops. Remove place works. "Ignore Itinerary" button is UI-only (no Firestore write). "Book Now" links not connected. Still falls back to MOCK_STOPS when no real stops are passed. |

#### Profile & Settings
| Screen | Status | Notes |
|--------|--------|-------|
| `ProfileScreen` | Complete | User info, avatar initials, navigation to all settings sub-screens |
| `AccountSettingsScreen` | Complete | Edit full name, home city, profile photo placeholder |
| `TravelPreferenceScreen` | Complete | Multi-select travel styles, saves to Firestore, shows SuccessToast |
| `SubscriptionScreen` | Complete UI | Free vs Fynd Plus plan cards, CTA button. No actual Stripe payment flow wired yet. |
| `LegalScreen` | Complete | Lists Terms of Service, Privacy Policy, Cookie Policy |
| `LegalDetailScreen` | Complete | Renders any legal document content |
| `SupportFeedbackScreen` | Complete | Bug report / feedback / feature request form, saves to Firestore `feedback` collection |
| `DeleteAccountScreen` | Complete | Confirmation modal popup, navigates back on dismiss |

#### Monetisation
| Screen | Status | Notes |
|--------|--------|-------|
| `SpotlightScreen` | Complete UI | Travel deals grid (hotels, flights, experiences, restaurants, activities). Category filter. Taps out to partner URLs (Booking.com, Airbnb, Viator, Skyscanner, GetYourGuide, OpenTable). Ad disclaimer shown. Not connected to user vibes yet. |

---

### Backend / Data Layer

| Feature | Status |
|---------|--------|
| Firestore `users` collection | Done |
| Firestore `subscriptions` collection | Done |
| Firestore `trips` collection | Done |
| Firestore `itineraries` collection | Done |
| Firestore `savedPlaces` collection | Done |
| Firestore `feedback` collection | Done |
| Free tier gate — trips/month (3) | Done |
| Free tier gate — itineraries (1) | Done |
| Free tier gate — saved places (5) | Done |
| Free tier gate — places per trip (5) | Done |
| Premium flag (`isPremium`) propagated via Zustand | Done |
| Usage counters (`tripsUsedThisMonth`, etc.) | Done |
| `UpgradeGate` modal component | Done |
| Stripe backend / webhook | Not started |
| Push notifications | Not started |
| Server (`/server` directory) | Scaffolded only |

---

### Shared Components

| Component | Description |
|-----------|-------------|
| `AppHeader` | Logo + avatar header reused across tabs |
| `UpgradeGate` | Full-screen modal enforcing free tier limits |
| `SuccessToast` | Animated bottom toast for save confirmations |
| `Avatar` | Initials-based circular avatar |
| `FyndButton` | Branded primary button |
| `FyndInput` | Themed text input |
| `Loader` | Spinner wrapper |
| `PlaceCard` | Reusable place card UI |

---

## What Remains for Full Functionality

### High Priority (Core Flow Blockers)

| Task | Detail |
|------|--------|
| Fix `user.id` undefined in `CreateTripScreen` | `handleContinue` silently returns because `user.id` is null at the time of press. Root cause: auth state not hydrated when navigating directly to tab. Need to guard or await auth rehydration before allowing trip creation. |
| Connect real places to `ItineraryScreen` | Currently falls back to `MOCK_STOPS`. The `SuggestedPlacesScreen` passes `places` array but `ItineraryScreen` reads `route.params.stops` — shape mismatch needs resolving. |
| "Ignore Itinerary" button | Should call `updateItineraryStatus(id, 'ignored')` in Firestore and navigate back. |
| Map search bar | Should filter markers / search Google Places by query at user location. |

### Medium Priority (Feature Completeness)

| Task | Detail |
|------|--------|
| Stripe payment flow | Connect `SubscriptionScreen` CTA to Stripe Checkout via the `/server` backend. Handle webhook to flip `isPremium` in Firestore. |
| Profile photo upload | Wire `expo-image-picker` in `AccountSettingsScreen`, upload to Firebase Storage, update Firestore and Zustand. |
| Google Sign-In (native) | Resolve native module conflict or use Expo AuthSession OAuth flow as alternative. |
| Spotlight personalisation | Filter / sort deals based on user's saved vibe preferences from Firestore. |
| "Book Now" links | Attach real booking URLs from Google Places `website` field to Itinerary and Suggested Places cards. |
| Real AI itinerary ordering | Use OpenAI to sort/schedule stops by time of day, distance and exploration hours rather than raw Google Places order. |
| Delete Account — full flow | Actually delete Firestore docs (`users`, `subscriptions`, `trips`, etc.) and call `auth.delete()` on the Firebase user. Currently UI-only. |
| Map real coordinates | Pass real `lat/lng` from `SuggestedPlacesScreen` through to `MapScreen` instead of falling back to NYC hardcoded stops. |

### Lower Priority (Polish & Scale)

| Task | Detail |
|------|--------|
| Push notifications | Trip reminders, itinerary alerts via Expo Notifications + FCM. |
| Offline support | Cache recent itineraries with AsyncStorage for no-connection scenarios. |
| App icon & splash screen | Finalise production assets in `app.json`. |
| App Store / Play Store submission | Build EAS production builds, configure signing, submit. |
| Analytics | Integrate Expo Analytics or Firebase Analytics for user behaviour tracking. |
| Unit & integration tests | No tests written yet. At minimum, test auth flow, trip creation, and gate logic. |
| Rate limiting on API keys | Google Places and OpenAI keys are currently hardcoded client-side — move to server-side proxy. |
| Require cycle fix | `firebase.ts → authService.ts → database.ts → firebase.ts` circular dependency causes Metro warnings. Refactor to break the cycle. |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.83 (Expo SDK 55) |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (Stack + Bottom Tabs) |
| State | Zustand 5 |
| Backend / DB | Firebase 12 (Auth + Firestore) |
| Maps | react-native-maps + Google Maps SDK |
| Places | Google Places API (Text Search + Nearby Search) |
| AI | OpenAI API (place description enhancement) |
| Payments | Stripe React Native SDK (not yet active) |
| Animation | Lottie React Native |
| Location | expo-location |

---

## Day-by-Day Commit History

| Day | Milestone |
|-----|-----------|
| Day 1 | Project initialised |
| Day 2 | Navigation skeleton + 5 bottom tabs |
| Day 3 | Shared component library |
| Day 4 | Onboarding flow (4 screens) |
| Day 5 | Firebase Auth + Register & Login screens |
| Day 6 | Zustand auth store + smart splash routing |
| Day 7 | Home dashboard + auth persistence fix |
| Day 8 | Create Trip 5-step wizard |
| Day 9 | Processing screen + Lottie animation |
| Day 10 | Suggested Places screen (mock data) |
| Day 11 | Vibe selection, Itinerary screen, full navigation flow |
| Day 12 | Service Hub screen |
| Day 13 | Empty states for Map, ServiceHub, Suggested Places |
| Day 14 | Saved screen (Places + Itineraries tabs) |
| Day 15 | Profile, AccountSettings, Subscription placeholder |
| Day 16 | AccountSettings, DeleteAccount modal, ProfileScreen complete |
| Day 17 | Subscription screen + navigation from Profile |
| Day 18 | Travel Preference screen + Firestore save + SuccessToast |
| Day 19 | Google Places API live, OpenAI integration, ServiceHub GPS, ProcessingScreen import fix |

---

*Fynd is a solo-built app progressing rapidly. The core user journey (discover → suggested places → itinerary → map) is functionally complete. The primary remaining work is payment integration, auth hardening, and production polish.*
