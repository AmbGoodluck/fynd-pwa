/**
 * useBookingLinksStore.ts
 *
 * In-memory Zustand store that caches validated booking links by place_id.
 * Prevents repeated detection for the same place within a session (Section 10).
 * Handles user feedback adjustments (Section 9).
 */
import { create } from 'zustand';
import type { BookingLink } from '../services/bookingDetectionService';
import { applyNegativeFeedback, applyPositiveFeedback } from '../services/bookingDetectionService';

interface BookingLinksState {
  /** Map of place_id → BookingLink */
  links: Record<string, BookingLink>;

  /** Store or update a verified booking link */
  setLink: (link: BookingLink) => void;

  /** Retrieve a cached booking link for a place, or null if not yet detected */
  getLink: (placeId: string) => BookingLink | null;

  /** Apply user feedback: positive = confirmed correct, negative = reported wrong */
  applyFeedback: (placeId: string, positive: boolean) => void;

  /** Remove a cached link (e.g. to force re-detection) */
  removeLink: (placeId: string) => void;
}

export const useBookingLinksStore = create<BookingLinksState>((set, get) => ({
  links: {},

  setLink: (link) =>
    set(state => ({
      links: { ...state.links, [link.place_id]: link },
    })),

  getLink: (placeId) => get().links[placeId] ?? null,

  applyFeedback: (placeId, positive) => {
    const existing = get().links[placeId];
    if (!existing) return;
    const updated = positive
      ? applyPositiveFeedback(existing)
      : applyNegativeFeedback(existing);
    set(state => ({
      links: { ...state.links, [placeId]: updated },
    }));
  },

  removeLink: (placeId) =>
    set(state => {
      const next = { ...state.links };
      delete next[placeId];
      return { links: next };
    }),
}));
