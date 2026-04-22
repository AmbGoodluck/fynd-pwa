import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function recordVisit(
  userId: string,
  placeId: string,
  placeName: string,
  placeTypes: string[],
  placeCity: string,
  source: 'detail_screen' | 'went_here_prompt' = 'detail_screen',
): Promise<void> {
  try {
    await addDoc(collection(db, 'user_visits'), {
      user_id: userId,
      place_id: placeId,
      place_name: placeName,
      place_types: placeTypes,
      place_city: placeCity,
      visited_at: Date.now(),
      source,
    });
  } catch (e) {
    console.error('[visitService] Error recording visit:', e);
  }
}

export async function hasVisited(userId: string, placeId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'user_visits'),
      where('user_id', '==', userId),
      where('place_id', '==', placeId),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

export async function getUserVisits(userId: string, limitCount: number = 50): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'user_visits'),
      where('user_id', '==', userId),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.visited_at - a.visited_at)
      .slice(0, limitCount);
  } catch {
    return [];
  }
}
