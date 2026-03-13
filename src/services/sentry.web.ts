// No-op stub for web.
// @sentry/react-native calls TurboModuleRegistry.getEnforcing('RNSentry') at
// module level, which throws on react-native-web. This stub satisfies all
// call sites without importing the native package.
export const init = () => {};
export const wrap = <T>(c: T): T => c;
export const captureException = (..._args: unknown[]) => '';
export const captureMessage = (..._args: unknown[]) => '';
export const captureEvent = (..._args: unknown[]) => '';
export const withScope = (_cb: (scope: any) => void) => {};
export const setTag = () => {};
export const setUser = () => {};
export const setContext = () => {};
export const addBreadcrumb = () => {};
export const nativeCrash = () => {};
