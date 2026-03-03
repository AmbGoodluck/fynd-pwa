import { create } from 'zustand';

export interface TripSession {
  tripId: string | null;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  explorationHours: number;
  distanceMiles: number;
  timeOfDay: string;
  selectedVibes: string[];
  selectedPlaces: any[];
}

interface TripStore extends TripSession {
  setTripData: (data: Partial<TripSession>) => void;
  setSelectedPlaces: (places: any[]) => void;
  reset: () => void;
}

const DEFAULTS: TripSession = {
  tripId: null,
  destination: '',
  latitude: null,
  longitude: null,
  explorationHours: 4,
  distanceMiles: 6,
  timeOfDay: '',
  selectedVibes: [],
  selectedPlaces: [],
};

export const useTripStore = create<TripStore>((set) => ({
  ...DEFAULTS,
  setTripData: (data) => set((state) => ({ ...state, ...data })),
  setSelectedPlaces: (places) => set({ selectedPlaces: places }),
  reset: () => set(DEFAULTS),
}));
