# Fynd App — Audit Changelog

All fixes applied during the 16-phase code quality audit (March 2026).
UI design, navigation structure, and feature scope were not changed.

---

## Phase 1 — Dead Code Removal

### `src/services/firestoreService.ts`
Added a prominent header comment marking the entire file as dead code.
This file duplicates `src/services/database.ts` (the actively-used service) and is imported by zero files in the codebase. It also uses a stale schema that is missing `isPremium`, typed `travelPreferences`, and subscription limit fields that were added to `database.ts`. **Do not use or import this file.**

---

## Phase 2 — Redundancy Elimination

### `src/screens/SuggestedPlacesScreen.tsx`
Removed three unused React Native imports that were never referenced in the component body: `Image`, `Linking`, and `Alert`. Keeping unused imports inflates the bundle and creates misleading noise for future readers.

---

## Phase 3 — Authentication Flow

### `src/screens/ProfileScreen.tsx` — missing font import
`StyleSheet.create()` referenced `F.bold`, `F.semibold`, and `F.medium` throughout, but `F` from `'../theme/fonts'` was never imported. This caused a `TypeError: Cannot read properties of undefined (reading 'bold')` crash at module evaluation time whenever the Profile screen was loaded.

**Fix:** Added `import { F } from '../theme/fonts';`.

### `src/screens/ProfileScreen.tsx` — incomplete logout
`handleLogout` called `firebaseLogout()` and `guestLogout()` but left `useTripStore` and `useTempItineraryStore` populated. This meant the previous user's active trip session and saved-places itinerary builder could persist to the next user on a shared device.

**Fix:** Added `useTripStore.getState().reset()` and `useTempItineraryStore.getState().clear()` calls in `handleLogout` after the existing store clears.

---

## Phase 5 — Firestore Data Operations

### `src/services/sharedTripService.ts` — non-atomic member_count (joinSharedTrip)
`joinSharedTrip` read `trip.member_count`, added 1 client-side, then wrote the result back. Under concurrent joins this is a read-modify-write race: two simultaneous joins both read `count=1`, both write `count=2` instead of `count=3`.

**Fix:** Replaced `member_count: (trip.member_count || 1) + 1` with `member_count: increment(1)` (Firestore atomic server-side increment). Also added `increment` to the import list (it was not previously imported).

### `src/services/sharedTripService.ts` — non-atomic member_count (removeMember)
`removeMember` fetched the trip document just to read `member_count`, then wrote `member_count - 1`. Same race condition as above, plus an unnecessary extra round-trip.

**Fix:** Replaced the fetch + arithmetic write with `member_count: increment(-1)`, eliminating the extra read and the race condition.

---

## Phase 7 — Zustand State Management

*(See also Phase 3 logout fix above — TripStore and TempItineraryStore now cleared on logout.)*

---

## Phase 8 — Navigation Integrity

### `src/navigation/AppNavigator.tsx` — missing DeleteAccount route
`AccountSettingsScreen` has a "Delete Account" button that calls `navigation.navigate('DeleteAccount')`, but `DeleteAccountScreen` was never imported and the `DeleteAccount` route was never registered in the Stack navigator. Tapping the button produced a silent no-op (React Navigation dropped the navigate call with a warning in dev).

**Fix:**
1. Added `import DeleteAccountScreen from '../screens/DeleteAccountScreen'`.
2. Added `<Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />` after the `AccountSettings` registration.

---

## Phase 10 — Saved Items

### `src/screens/SavedScreen.tsx` — unstable FlatList keyExtractor
The itineraries `FlatList` used `item.id || Math.random().toString()` as its key. `Math.random()` returns a different value on every call, so React assigned a new key to every row on each re-render, forcing it to unmount and re-mount all list items instead of reconciling in place. This was a severe and silent performance issue that worsened as the itinerary list grew.

**Fix:** Replaced `Math.random()` with a stable composite fallback: `item.id || \`itinerary-${item.tripId}-${index}\``.

---

## Phase 12 — Shared Trips

### `src/screens/SharedTripDetailScreen.tsx` — broken module import (CRITICAL)
The screen imported `useBookingLinksStore` from `'../store/bookingStore'`, a path that does not exist. The actual module is `'../store/useBookingLinksStore'`. This caused a `Cannot find module` crash at runtime whenever the SharedTripDetail screen was opened.

**Fix:** Corrected the import path to `'../store/useBookingLinksStore'`.

### `src/services/sharedTripService.ts` — debug console statements in production
Three `console.log` / `console.error` / `console.warn` statements were left in production code inside `createSharedTrip` (logging internal Firestore details including collection names and owner IDs) and `addOwnerMember`. These leak internal implementation details and collection names.

**Fix:** Removed all three debug statements. The `permission-denied` error path retains its thrown `Error` with a developer-readable message; the owner-member catch block now has a brief code comment explaining why it's non-fatal.

---

## Phase 13 — Subscription & Account Management

### `src/screens/DeleteAccountScreen.tsx` — account not actually deleted
Tapping "Continue with delete" showed an "Account Deleted" success animation and called `logout()` (`signOut(auth)`), but never called `auth.currentUser.delete()`. The Firebase Auth account remained active and could be logged back into. The `users` and `subscriptions` Firestore documents were also never removed.

**Fix:**
- Import `auth` and `db` from `'../services/firebase'`; import `deleteDoc` and `doc` from `'firebase/firestore'`
- In `handleDelete`, call `auth.currentUser?.delete()` and delete `users/{uid}` + `subscriptions/{uid}` Firestore documents before showing the success modal
- Handle `auth/requires-recent-login` with a user-facing `Alert` prompting the user to sign out and sign back in (Firebase requires a recent credential for destructive account operations)
- Handle other errors with a generic "Failed to delete account" alert instead of silently failing

---

## Phase 14 — Error Handling

*(Covered by DeleteAccountScreen fix above — errors now surface to the user instead of silently succeeding.)*

---

## Phase 15 — Performance

### `src/screens/SuggestedPlacesScreen.tsx` — unreachable dead branch removed
The `handleAddToItinerary` function had an `else` branch calling `setShowPlaceLimitModal(true)`, which was never declared as a `useState`. For authenticated users `maxPlaces = Infinity`, making `selectedForItinerary.length >= Infinity` always `false`, so the branch was unreachable. The undeclared reference would have crashed if ever triggered.

**Fix:** Removed the dead `else` branch. The remaining `if` path (which calls `setShowUpgradeModal(true)` for guests) is the only reachable limit-reached handler.

*(See also SavedScreen FlatList keyExtractor fix above — Phase 10.)*

---

## Summary

| # | File | Type | Severity |
|---|------|------|----------|
| 1 | `SharedTripDetailScreen.tsx` | Wrong import path (module crash) | Critical |
| 2 | `ProfileScreen.tsx` | Missing `F` import (TypeError crash) | Critical |
| 3 | `AppNavigator.tsx` | Missing `DeleteAccount` route | High |
| 4 | `DeleteAccountScreen.tsx` | Account not actually deleted | High |
| 5 | `sharedTripService.ts` | Non-atomic `member_count` (race condition) | High |
| 6 | `SuggestedPlacesScreen.tsx` | Undeclared `setShowPlaceLimitModal` | Medium |
| 7 | `ProfileScreen.tsx` | Incomplete logout (store leak) | Medium |
| 8 | `SavedScreen.tsx` | `Math.random()` FlatList keys (perf) | Medium |
| 9 | `sharedTripService.ts` | Debug console statements in prod | Low |
| 10 | `SuggestedPlacesScreen.tsx` | Unused imports | Low |
| 11 | `firestoreService.ts` | Entire file is dead code | Low |
