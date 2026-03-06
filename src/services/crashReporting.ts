import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let initialized = false;

export function initCrashReporting() {
  if (initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  if (!dsn) {
    console.log('Sentry DSN missing. Crash reporting disabled.');
    return;
  }

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    environment: process.env.EXPO_PUBLIC_ENV || 'development',
    release: `${Constants.expoConfig?.slug || 'fynd-app'}@${Constants.expoConfig?.version || '1.0.0'}`,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

export function captureException(error: unknown, context?: string) {
  try {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setTag('context', context);
        Sentry.captureException(error);
      });
      return;
    }
    Sentry.captureException(error);
  } catch (captureError) {
    console.log('Sentry capture failed', captureError);
  }
}
