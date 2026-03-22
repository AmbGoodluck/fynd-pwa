import { create } from 'zustand';
import type { Place } from './useTripStore';

export interface RecentTrip {
  trip_id: string;
  user_id: string;
  city: string;
  places: Place[];
  created_at: string;    // ISO string — consistent with SharedTrip pattern
  last_accessed: string; // ISO string
  is_shared: boolean;
}

interface RecentTripStore {
  recentTrips: RecentTrip[];
  setRecentTrips: (trips: RecentTrip[]) => void;
  prependTrip: (trip: RecentTrip) => void;
  clearRecentTrips: () => void;
}

export const useRecentTripStore = create<RecentTripStore>((set) => ({
  recentTrips: [],

  setRecentTrips: (trips) => set({ recentTrips: trips }),

  // Prepend and deduplicate by trip_id
  prependTrip: (trip) =>
    set((s) => ({
      recentTrips: [
        trip,
        ...s.recentTrips.filter((t) => t.trip_id !== trip.trip_id),
      ],
    })),

  clearRecentTrips: () => set({ recentTrips: [] }),
}));
