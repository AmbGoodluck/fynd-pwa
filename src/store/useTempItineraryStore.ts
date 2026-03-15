import { create } from 'zustand';
import type { SavedPlace } from './useGuestStore';

export const TEMP_MAX_PLACES = 7;

export type AddPlaceResult = 'added' | 'duplicate' | 'full' | 'different_city';

interface TempItineraryStore {
  places: SavedPlace[];
  city: string;
  createdAt: number | null;
  addPlace: (place: SavedPlace) => AddPlaceResult;
  removePlace: (placeId: string) => void;
  clear: () => void;
  isActive: () => boolean;
}

export const useTempItineraryStore = create<TempItineraryStore>((set, get) => ({
  places: [],
  city: '',
  createdAt: null,

  addPlace: (place) => {
    const { places, city } = get();
    const incoming = (place.city || '').trim().toLowerCase();
    const current = city.trim().toLowerCase();

    // City mismatch: only block if both sides have a city and they differ
    if (places.length > 0 && current && incoming && current !== incoming) {
      return 'different_city';
    }

    if (places.some(p => p.placeId === place.placeId)) {
      return 'duplicate';
    }

    if (places.length >= TEMP_MAX_PLACES) {
      return 'full';
    }

    set(s => ({
      places: [...s.places, place],
      city: s.city || place.city || '',
      createdAt: s.createdAt ?? Date.now(),
    }));
    return 'added';
  },

  removePlace: (placeId) =>
    set(s => ({ places: s.places.filter(p => p.placeId !== placeId) })),

  clear: () => set({ places: [], city: '', createdAt: null }),

  isActive: () => get().places.length > 0,
}));
