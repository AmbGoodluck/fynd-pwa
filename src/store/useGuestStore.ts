import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceResult } from '../services/googlePlacesService';
import { useAuthStore } from './useAuthStore';
import {
  savePlace as savePlaceDb,
  deleteSavedPlace,
  getSavedPlaces,
  isPlaceSaved as isPlaceSavedDb,
} from '../services/savedPlacesService';
import type { SavedPlace } from '../types/savedPlace';
export type { SavedPlace } from '../types/savedPlace';

interface GuestStore {
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  hasUsedGuestMode: boolean;
  guestItineraryCount: number;
  savedPlaces: SavedPlace[];
  setGuest: (isGuest: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  markGuestModeUsed: () => void;
  incrementGuestItineraryCount: () => void;
  savePlace: (place: PlaceResult) => Promise<void>;
  unsavePlace: (placeId: string) => Promise<void>;
  isPlaceSaved: (placeId: string) => boolean;
  clearSavedPlaces: () => void;
  hydrateSavedPlaces: () => Promise<void>;
  logout: () => void;
  reset: () => void;
}

function placeResultToSaved(place: PlaceResult): SavedPlace {
  return {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    photoUrl: place.photoUrl,
    rating: place.rating,
    description: place.description,
    coordinates: place.coordinates,
    category: place.category,
    city: place.city,
    bookingUrl: place.bookingUrl,
    types: place.types,
    savedAt: Date.now(),
  };
}

export const useGuestStore = create<GuestStore>()(
  persist(
    (set: any, get: any) => ({
      isGuest: false,
      hasSeenOnboarding: false,

      hasUsedGuestMode: false,
      guestItineraryCount: 0,
      savedPlaces: [],

      setGuest: (isGuest) => set({ isGuest }),

      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),

      markGuestModeUsed: () => set({ hasUsedGuestMode: true }),

      incrementGuestItineraryCount: () =>
        set((state) => ({ guestItineraryCount: state.guestItineraryCount + 1 })),

      savePlace: async (place) => {
        const { user, isAuthenticated } = useAuthStore.getState();
        // Guests cannot save places — require an account
        if (!isAuthenticated || !user) return;

        const existing = get().savedPlaces.find(p => p.placeId === place.placeId);
        if (existing) return;

        const savedPlace = placeResultToSaved(place);
        // Optimistic update
        set((state) => ({ savedPlaces: [savedPlace, ...state.savedPlaces] }));

        try {
          await savePlaceDb(user.id, savedPlace);
        } catch (e) {
          // Rollback optimistic update on failure
          set((state) => ({ savedPlaces: state.savedPlaces.filter(p => p.placeId !== savedPlace.placeId) }));
          if (__DEV__) console.error('Failed to sync saved place to Firestore', e);
        }
      },

      unsavePlace: async (placeId) => {
        const { user, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !user) return;

        // Optimistic remove
        set((state) => ({ savedPlaces: state.savedPlaces.filter(p => p.placeId !== placeId) }));

        try {
          const docId = await isPlaceSavedDb(user.id, placeId);
          if (docId) {
            await deleteSavedPlace(docId);
          }
        } catch (e) {
          if (__DEV__) console.error('Failed to delete saved place from Firestore', e);
        }
      },

      hydrateSavedPlaces: async () => {
        const { user, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !user) return;
        try {
          const places = await getSavedPlaces(user.id);
          if (places.length > 0) set({ savedPlaces: places });
        } catch (e) {
          if (__DEV__) console.error('Failed to hydrate saved places', e);
        }
      },

      isPlaceSaved: (placeId) => get().savedPlaces.some(p => p.placeId === placeId),

      clearSavedPlaces: () => set({ savedPlaces: [] }),

      // Signs out the current session but keeps onboarding flag intact
      logout: () => set((state) => ({
        isGuest: false,
        hasUsedGuestMode: false,
        guestItineraryCount: 0,
        savedPlaces: [],
        hasSeenOnboarding: state.hasSeenOnboarding,
      })),

      reset: () => set({ isGuest: false, hasSeenOnboarding: false, hasUsedGuestMode: false, guestItineraryCount: 0, savedPlaces: [] }),
    }),
    {
      name: 'fynd-guest-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
