import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // roll to Monday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export const FREE_WEEKLY_ITINERARY_LIMIT = 3;
export const FREE_MAX_PLACES_PER_ITINERARY = 5;
export const FREE_MAX_SAVED_PLACES = 10;
export const GUEST_MAX_PLACES_PER_ITINERARY = 7;

interface PremiumStore {
  isPremium: boolean;
  weeklyItineraryCount: number;
  weeklyResetDate: string;
  setIsPremium: (val: boolean) => void;
  canCreateItinerary: () => boolean;
  incrementItineraryCount: () => void;
}

export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set, get) => ({
      isPremium: false,
      weeklyItineraryCount: 0,
      weeklyResetDate: getWeekStart(),

      setIsPremium: (val) => set({ isPremium: val }),

      canCreateItinerary: () => {
        const state = get();
        if (state.isPremium) return true;
        const currentWeekStart = getWeekStart();
        if (currentWeekStart !== state.weeklyResetDate) return true; // new week resets
        return state.weeklyItineraryCount < FREE_WEEKLY_ITINERARY_LIMIT;
      },

      incrementItineraryCount: () => {
        const currentWeekStart = getWeekStart();
        set((state) => {
          if (currentWeekStart !== state.weeklyResetDate) {
            return { weeklyItineraryCount: 1, weeklyResetDate: currentWeekStart };
          }
          return { weeklyItineraryCount: state.weeklyItineraryCount + 1 };
        });
      },
    }),
    {
      name: 'fynd-premium',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
