import { create } from 'zustand';

export interface Place {
  id: string;
  name: string;
  address: string;
  image: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  description?: string;
}

export interface TripSession {
  tripId: string | null;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  explorationHours: number;
  distanceMiles: number;
  timeOfDay: string;
  selectedVibes: string[];
  selectedPlaces: Place[];
  places?: Place[];
}

interface TripStore extends TripSession {
  trip: TripSession | null;
  setTripData: (data: Partial<TripSession>) => void;
  setSelectedPlaces: (places: Place[]) => void;
  setTrip: (trip: TripSession) => void;
  clearTrip: () => void;
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
  trip: null,
  setTripData: (data) => set((state) => ({ 
    ...state, 
    ...data,
    trip: state.trip ? { ...state.trip, ...data } : null,
  })),
  setSelectedPlaces: (places) => set((state) => ({
    selectedPlaces: places,
    places: places,
    trip: state.trip ? { ...state.trip, selectedPlaces: places, places } : null,
  })),
  setTrip: (trip) => set({ trip, ...trip }),
  clearTrip: () => set({ trip: null, ...DEFAULTS }),
  reset: () => set({ trip: null, ...DEFAULTS }),
}));
