import { supabase } from './supabase';

export async function recordVisit(
  userId: string,
  placeId: string,
  placeName: string,
  placeTypes: string[],
  placeCity: string,
  source: 'detail_screen' | 'went_here_prompt' = 'detail_screen',
): Promise<void> {
  try {
    const { error } = await supabase.from('user_visits').insert({
      user_id: userId,
      place_id: placeId,
      place_name: placeName,
      place_types: placeTypes,
      place_city: placeCity,
      visited_at: new Date().toISOString(),
      source,
    });
    if (error) console.error('[visitService] Error recording visit:', error.message);
  } catch (e) {
    console.error('[visitService] Error recording visit:', e);
  }
}

export async function hasVisited(userId: string, placeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_visits')
      .select('id')
      .eq('user_id', userId)
      .eq('place_id', placeId)
      .limit(1);
    if (error) return false;
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}

export async function getUserVisits(userId: string, limitCount: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('user_visits')
      .select('*')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(limitCount);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
