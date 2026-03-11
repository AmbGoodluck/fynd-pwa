import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceResult } from '../services/googlePlacesService';

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
  savePlace: (place: PlaceResult) => void;
  unsavePlace: (placeId: string) => void;
  isPlaceSaved: (placeId: string) => boolean;
  clearSavedPlaces: () => void;
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
    savedAt: Date.now(),
  };
}

export const useGuestStore = create<GuestStore>()(
  persist(
    (set, get) => ({
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

      savePlace: (place) => {
        const existing = get().savedPlaces.find(p => p.placeId === place.placeId);
        if (existing) return;
        set((state) => ({ savedPlaces: [placeResultToSaved(place), ...state.savedPlaces] }));
      },

      unsavePlace: (placeId) =>
        set((state) => ({ savedPlaces: state.savedPlaces.filter(p => p.placeId !== placeId) })),

      isPlaceSaved: (placeId) => get().savedPlaces.some(p => p.placeId === placeId),

      clearSavedPlaces: () => set({ savedPlaces: [] }),

      reset: () => set({ isGuest: false, hasSeenOnboarding: false, hasUsedGuestMode: false, guestItineraryCount: 0, savedPlaces: [] }),
    }),
    {
      name: 'fynd-guest-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
