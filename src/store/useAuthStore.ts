import { create } from 'zustand';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface User {
  id: string;
  fullName: string;
  email: string;
  photoURL?: string | null;
  isPremium: boolean;
  travelPreferences?: string[];
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setIsPremium: (val: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  logout: async () => {
    await signOut(auth);
    set({ user: null, isAuthenticated: false });
  },
  setIsPremium: (val) => set((state) => ({
    user: state.user ? { ...state.user, isPremium: val } : null,
  })),
}));
