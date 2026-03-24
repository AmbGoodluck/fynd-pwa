import { create } from 'zustand';
import type { RecentTrip } from '../types/recentTrip';
export type { RecentTrip } from '../types/recentTrip';

interface RecentTripStore {
  recentTrips: RecentTrip[];
  /** True while AppNavigator is fetching trips from Firestore on login. */
  isHydrating: boolean;
  /** Non-null when the initial Firestore fetch failed. */
  fetchError: string | null;
  setRecentTrips: (trips: RecentTrip[]) => void;
  prependTrip: (trip: RecentTrip) => void;
  clearRecentTrips: () => void;
  setHydrating: (v: boolean) => void;
  setFetchError: (err: string | null) => void;
}

export const useRecentTripStore = create<RecentTripStore>((set) => ({
  recentTrips: [],
  isHydrating: false,
  fetchError: null,

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
  setHydrating: (v) => set({ isHydrating: v }),
  setFetchError: (err) => set({ fetchError: err }),
}));
