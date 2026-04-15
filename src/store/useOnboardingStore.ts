import { create } from 'zustand';

interface OnboardingStore {
  /** Interests selected during onboarding before the user creates an account.
   *  These should be saved to Firestore immediately after successful registration. */
  pendingInterests: string[];
  setPendingInterests: (ids: string[]) => void;
  clearPendingInterests: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  pendingInterests: [],
  setPendingInterests: (ids) => set({ pendingInterests: ids }),
  clearPendingInterests: () => set({ pendingInterests: [] }),
}));
