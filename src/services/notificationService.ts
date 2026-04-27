import { supabase } from './supabase';
import type { FyndPlace } from './freePlacesService';

export async function maybeCreateDailyPickNotification(
  userId: string,
  topPlace: FyndPlace | null,
): Promise<void> {
  if (!userId || !topPlace) return;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'daily_pick')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (existing && existing.length > 0) return;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'daily_pick',
      title: `Today's Pick: ${topPlace.name}`,
      body: topPlace.ai_description
        ? topPlace.ai_description.split('.')[0] + '.'
        : `Check out ${topPlace.name} near you.`,
      place_id: topPlace.id,
      place_name: topPlace.name,
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[notificationService] Failed to create daily pick:', e);
  }
}
