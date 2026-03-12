import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedTrip, TripMember } from '../types/sharedTrip';

// Persisted guest identity for shared trips
function generateSessionId(): string {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

interface SharedTripState {
  // Guest / session identity
  sessionUserId: string;
  sessionUserName: string;

  // My created trips
  myTrips: SharedTrip[];
  // Trips shared with me (joined)
  joinedTrips: SharedTrip[];

  // Active trip being viewed
  activeTrip: SharedTrip | null;
  activeMembers: TripMember[];

  // Loading / error
  loading: boolean;
  error: string | null;

  // Actions
  setSessionName: (name: string) => void;
  setMyTrips: (trips: SharedTrip[]) => void;
  setJoinedTrips: (trips: SharedTrip[]) => void;
  setActiveTrip: (trip: SharedTrip | null) => void;
  setActiveMembers: (members: TripMember[]) => void;
  addMyTrip: (trip: SharedTrip) => void;
  addJoinedTrip: (trip: SharedTrip) => void;
  removeMyTrip: (trip_id: string) => void;
  removeJoinedTrip: (trip_id: string) => void;
  removeMemberLocally: (member_id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSharedTripStore = create<SharedTripState>()(
  persist(
    (set, get) => ({
      sessionUserId: generateSessionId(),
      sessionUserName: 'Explorer',

      myTrips: [],
      joinedTrips: [],
      activeTrip: null,
      activeMembers: [],
      loading: false,
      error: null,

      setSessionName: (name) => set({ sessionUserName: name }),

      setMyTrips: (trips) => set({ myTrips: trips }),
      setJoinedTrips: (trips) => set({ joinedTrips: trips }),

      setActiveTrip: (trip) => set({ activeTrip: trip }),
      setActiveMembers: (members) => set({ activeMembers: members }),

      addMyTrip: (trip) =>
        set((s) => ({ myTrips: [trip, ...s.myTrips.filter((t) => t.trip_id !== trip.trip_id)] })),

      addJoinedTrip: (trip) =>
        set((s) => ({ joinedTrips: [trip, ...s.joinedTrips.filter((t) => t.trip_id !== trip.trip_id)] })),

      removeMyTrip: (trip_id) =>
        set((s) => ({ myTrips: s.myTrips.filter((t) => t.trip_id !== trip_id) })),

      removeJoinedTrip: (trip_id) =>
        set((s) => ({ joinedTrips: s.joinedTrips.filter((t) => t.trip_id !== trip_id) })),

      removeMemberLocally: (member_id) =>
        set((s) => ({
          activeMembers: s.activeMembers.filter((m) => m.member_id !== member_id),
        })),

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'fynd-shared-trips',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist loading / error state
      partialize: (s) => ({
        sessionUserId: s.sessionUserId,
        sessionUserName: s.sessionUserName,
        myTrips: s.myTrips,
        joinedTrips: s.joinedTrips,
      }),
    }
  )
);
