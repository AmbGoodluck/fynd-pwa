import analytics from '@react-native-firebase/analytics';

export type AnalyticsEventName =
  | 'app_open'
  | 'trip_created'
  | 'suggestions_generated'
  | 'itinerary_generated'
  | 'maps_opened';

export async function trackEvent(name: AnalyticsEventName, params?: Record<string, unknown>) {
  try {
    await analytics().logEvent(name, params as never);
  } catch (error) {
    // Analytics should never crash UX flows.
    if (__DEV__) console.log('Analytics logEvent failed', error);
  }
}
