import { resetSessionExpiredNotification } from './authEvents';

const TOKEN_KEY = 'smartstay_token';
const REFRESH_TOKEN_KEY = 'smartstay_refresh_token';
const USER_KEY = 'smartstay_user';
const STORAGE_KIND_KEY = 'smartstay_auth_storage';
export const AUTH_SESSION_CHANGED_EVENT = 'auth:session-changed';

const STORAGE_KIND_LOCAL = 'local';
const STORAGE_KIND_SESSION = 'session';

const getStorageByKind = (kind) => (
  kind === STORAGE_KIND_SESSION ? sessionStorage : localStorage
);

const getActiveStorageKind = () => {
  const savedKind = localStorage.getItem(STORAGE_KIND_KEY);
  if (savedKind === STORAGE_KIND_LOCAL || savedKind === STORAGE_KIND_SESSION) {
    return savedKind;
  }

  if (
    sessionStorage.getItem(TOKEN_KEY)
    || sessionStorage.getItem(USER_KEY)
    || sessionStorage.getItem(REFRESH_TOKEN_KEY)
  ) {
    return STORAGE_KIND_SESSION;
  }

  return STORAGE_KIND_LOCAL;
};

const getActiveStorage = () => getStorageByKind(getActiveStorageKind());

const readItem = (key) => {
  const activeStorage = getActiveStorage();
  const activeValue = activeStorage.getItem(key);
  if (activeValue) return activeValue;

  const fallbackStorage = activeStorage === localStorage ? sessionStorage : localStorage;
  return fallbackStorage.getItem(key);
};

const parseStoredUser = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const clearStorage = (storage) => {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

const notifySessionChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT));
};

export const authStorage = {
  getToken: () => readItem(TOKEN_KEY),

  getRefreshToken: () => readItem(REFRESH_TOKEN_KEY),

  getUser: () => parseStoredUser(readItem(USER_KEY)),

  getSession: () => ({
    token: authStorage.getToken(),
    refreshToken: authStorage.getRefreshToken(),
    user: authStorage.getUser(),
    persist: getActiveStorageKind() === STORAGE_KIND_LOCAL,
  }),

  setSession: ({ token, refreshToken, user, persist = true }) => {
    const targetKind = persist ? STORAGE_KIND_LOCAL : STORAGE_KIND_SESSION;
    const targetStorage = getStorageByKind(targetKind);
    const otherStorage = targetStorage === localStorage ? sessionStorage : localStorage;

    clearStorage(targetStorage);
    clearStorage(otherStorage);

    if (token) targetStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) targetStorage.setItem(USER_KEY, JSON.stringify(user));

    localStorage.setItem(STORAGE_KIND_KEY, targetKind);
    resetSessionExpiredNotification();
    notifySessionChanged();
  },

  clearSession: () => {
    clearStorage(localStorage);
    clearStorage(sessionStorage);
    localStorage.removeItem(STORAGE_KIND_KEY);
    notifySessionChanged();
  },
};
