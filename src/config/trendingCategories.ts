import { Platform } from 'react-native';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TrendingCategory {
  id: string;
  label: string;
  subtitle: string;
  gradient: [string, string, string];
  searchTerms: string[];
  timeSlots: TimeSlot[];
}

export const TRENDING_CATEGORIES: TrendingCategory[] = [
  {
    id: 'date-night',
    label: 'Date night spots',
    subtitle: 'Restaurants · Bars',
    gradient: ['#ED93B1', '#72243E', '#4B1528'],
    searchTerms: ['romantic restaurant', 'fine dining', 'wine bar', 'cocktail bar', 'date restaurant'],
    timeSlots: ['evening', 'night'],
  },
  {
    id: 'sunset-spots',
    label: 'Sunset spots',
    subtitle: 'Parks · Scenic',
    gradient: ['#EF9F27', '#854F0B', '#412402'],
    searchTerms: ['scenic viewpoint', 'park', 'rooftop bar', 'lakefront', 'overlook'],
    timeSlots: ['afternoon', 'evening'],
  },
  {
    id: 'chill-hangouts',
    label: 'Chill hangouts',
    subtitle: 'Cafes · Lounges',
    gradient: ['#AFA9EC', '#534AB7', '#26215C'],
    searchTerms: ['cafe', 'lounge', 'tea house', 'bookstore cafe', 'chill bar'],
    timeSlots: ['morning', 'afternoon', 'evening', 'night'],
  },
  {
    id: 'free-things',
    label: 'Free things to do',
    subtitle: 'Activities · Free',
    gradient: ['#5DCAA5', '#0F6E56', '#04342C'],
    searchTerms: ['park', 'trail', 'public garden', 'free museum', 'community center', 'plaza'],
    timeSlots: ['morning', 'afternoon', 'evening', 'night'],
  },
  {
    id: 'study-cafes',
    label: 'Study cafes',
    subtitle: 'Cafes · Quiet',
    gradient: ['#85B7EB', '#185FA5', '#042C53'],
    searchTerms: ['coffee shop', 'cafe', 'library', 'bookstore', 'study spot'],
    timeSlots: ['morning', 'afternoon'],
  },
  {
    id: 'late-night-eats',
    label: 'Late night eats',
    subtitle: 'Food · 24hr',
    gradient: ['#F09595', '#A32D2D', '#501313'],
    searchTerms: ['late night food', '24 hour restaurant', 'diner', 'fast food', 'pizza'],
    timeSlots: ['night'],
  },
  {
    id: 'weekend-adventures',
    label: 'Weekend adventures',
    subtitle: 'Activities · Outdoors',
    gradient: ['#97C459', '#3B6D11', '#173404'],
    searchTerms: ['hiking trail', 'state park', 'adventure', 'kayak', 'climbing', 'outdoor activity'],
    timeSlots: ['morning', 'afternoon'],
  },
];

export function getCurrentTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** Returns categories valid for the current time slot. Frozen on first call — caller should
 *  store the result in state to avoid mid-session changes. */
export function getVisibleCategories(): TrendingCategory[] {
  const slot = getCurrentTimeSlot();
  return TRENDING_CATEGORIES.filter((cat) => cat.timeSlots.includes(slot));
}

/** Returns a gradient style object.
 *  On web: CSS linear-gradient via `background` property (RN Web passes it through to CSS).
 *  On native: solid colour using the darkest stop. */
export function gradientStyle(gradient: [string, string, string]): object {
  if (Platform.OS === 'web') {
    return {
      background: `linear-gradient(160deg, ${gradient[0]} 0%, ${gradient[1]} 60%, ${gradient[2]} 100%)`,
    };
  }
  return { backgroundColor: gradient[2] };
}
