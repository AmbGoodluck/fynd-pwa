import { supabase } from './supabase';
import type { SavedPlaceDoc, SavedPlace } from '../types/savedPlace';
import { docToSavedPlace, savedPlaceToDoc } from '../types/savedPlace';

const COL = 'savedPlaces';

// ── Write ─────────────────────────────────────────────────────────────────

/**
 * Save a place for a user. Returns the Firestore document ID.
 * Caller should check isPlaceSaved() first to avoid duplicates.
 */
export async function savePlace(userId: string, place: Omit<SavedPlace, 'savedAt'>): Promise<string> {
  const data = savedPlaceToDoc(userId, place);
  const { data: inserted, error } = await supabase
    .from(COL)
    .insert({
      ...data,
      savedAt: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id;
}

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * Fetch all saved places for a user, newest first.
 */
export async function getSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const { data, error } = await supabase
    .from(COL)
    .select('*')
    .eq('userId', userId)
    .order('savedAt', { ascending: false });

  if (error) throw error;
  return (data || []).map(d => docToSavedPlace(d as SavedPlaceDoc));
}

/**
 * Check if a specific place is saved. Returns the Firestore doc ID or null.
 */
export async function isPlaceSaved(userId: string, placeId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(COL)
    .select('id')
    .eq('userId', userId)
    .eq('placeId', placeId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? String(data.id) : null;
}

// ── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete a saved place by its Firestore document ID.
 */
export async function deleteSavedPlace(docId: string): Promise<void> {
  const { error } = await supabase
    .from(COL)
    .delete()
    .eq('id', docId);

  if (error) throw error;
}
