export const GUEST_USER_ID = 'guest-local';

export function createGuestUser() {
  return {
    id: GUEST_USER_ID,
    fullName: 'Guest User',
    email: '',
    isPremium: false,
    travelPreferences: [],
    isGuest: true,
  };
}

export function isGuestUser(userId?: string | null) {
  return !userId || userId === GUEST_USER_ID;
}
