import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceResult } from '../services/googlePlacesService';
import { useAuthStore } from './useAuthStore';
import { savePlace as savePlaceDb, deleteSavedPlace, getSavedPlaces, isPlaceSaved as isPlaceSavedDb } from '../services/database';

export interface SavedPlace {
  placeId: string;
  name: string;
  address: string;
  photoUrl: string;
  rating: number;
  description: string;
  coordinates: { lat: number; lng: number };
  category?: string;
  city?: string;
  bookingUrl?: string;
  types?: string[];
  savedAt: number; // timestamp
}

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
        const existing = get().savedPlaces.find(p => p.placeId === place.placeId);
        if (existing) return;
        
        const savedPlace = placeResultToSaved(place);
        // Optimistic update
        set((state) => ({ savedPlaces: [savedPlace, ...state.savedPlaces] }));
        
        const { user, isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated && user) {
          try {
            await savePlaceDb(user.id, {
              placeId: savedPlace.placeId,
              placeName: savedPlace.name || '',
              shortDescription: savedPlace.description || savedPlace.category || '',
              imageUrl: savedPlace.photoUrl || '',
              latitude: savedPlace.coordinates?.lat || 0,
              longitude: savedPlace.coordinates?.lng || 0,
              rating: savedPlace.rating || 0,
              city: savedPlace.city || '',
            });
          } catch (e) {
            if (__DEV__) console.error('Failed to sync saved place to Firestore', e);
          }
        }
      },

      unsavePlace: async (placeId) => {
        set((state) => ({ savedPlaces: state.savedPlaces.filter(p => p.placeId !== placeId) }));
        
        const { user, isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated && user) {
          try {
            const docId = await isPlaceSavedDb(user.id, placeId);
            if (docId) {
              await deleteSavedPlace(docId, user.id);
            }
          } catch (e) {
            if (__DEV__) console.error('Failed to delete saved place from Firestore', e);
          }
        }
      },

      hydrateSavedPlaces: async () => {
        const { user, isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated && user) {
          try {
            const places = await getSavedPlaces(user.id);
            if (places.length > 0) {
              const mapped: SavedPlace[] = places.map((p) => ({
                placeId: p.placeId,
                name: p.placeName || '',
                address: '',
                description: p.shortDescription || '',
                photoUrl: p.imageUrl || '',
                rating: p.rating || 0,
                coordinates: { lat: p.latitude || 0, lng: p.longitude || 0 },
                city: p.city || '',
                savedAt: p.savedAt ? (p.savedAt as any).toMillis?.() || Date.now() : Date.now(),
              }));
              set({ savedPlaces: mapped });
            }
          } catch (e) {
            if (__DEV__) console.error('Failed to hydrate saved places', e);
          }
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
