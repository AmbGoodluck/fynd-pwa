import { create } from 'zustand';
import type { RecentTrip } from '../types/recentTrip';
export type { RecentTrip } from '../types/recentTrip';

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
