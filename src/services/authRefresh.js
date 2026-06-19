import { authStorage } from './authStorage';
import { fetchFromApi } from './apiServer';
import { getDeviceHeaders } from './deviceInfo';

export const AUTH_LOGIN_ENDPOINT = '/Auth/login';
export const AUTH_REFRESH_ENDPOINT = '/Auth/refresh-token';

const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

let refreshRequestPromise = null;

const parseResponseBody = async (response) => {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessage = (result, fallback) => {
  if (result && typeof result === 'object' && 'message' in result) {
    return result.message;
  }

  if (typeof result === 'string' && result.trim()) return result;
  return fallback;
};

const createSessionExpiredError = (message = SESSION_EXPIRED_MESSAGE) => {
  const error = new Error(message);
  error.name = 'AuthSessionExpiredError';
  return error;
};

const buildRefreshHeaders = async () => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  const deviceHeaders = await getDeviceHeaders();
  Object.entries(deviceHeaders || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      headers.set(key, value);
    }
  });

  return headers;
};

export const isSessionExpiredError = (error) => error?.name === 'AuthSessionExpiredError';

export const refreshToken = async () => {
  if (refreshRequestPromise) return refreshRequestPromise;

  refreshRequestPromise = (async () => {
    const currentSession = authStorage.getSession();
    const accessToken = currentSession.token;
    const currentRefreshToken = currentSession.refreshToken;

    if (!accessToken || !currentRefreshToken) {
      authStorage.clearSession();
      throw createSessionExpiredError();
    }

    try {
      const response = await fetchFromApi(AUTH_REFRESH_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
        headers: await buildRefreshHeaders(),
        body: JSON.stringify({
          accessToken,
          refreshToken: currentRefreshToken,
        }),
      });

      const result = await parseResponseBody(response);

      if (response.status === 401) {
        authStorage.clearSession();
        throw createSessionExpiredError(getErrorMessage(result, SESSION_EXPIRED_MESSAGE));
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(result, `Lỗi máy chủ (${response.status})`));
      }

      if (!result?.token || !result?.refreshToken) {
        throw new Error('Backend không trả về token hợp lệ.');
      }

      authStorage.setSession({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user ?? currentSession.user,
        persist: currentSession.persist,
      });

      return result;
    } catch (error) {
      authStorage.clearSession();

      if (isSessionExpiredError(error)) throw error;

      if (error?.message?.includes?.('Failed to fetch')) {
        throw createSessionExpiredError('Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại.');
      }

      throw createSessionExpiredError(error?.message || SESSION_EXPIRED_MESSAGE);
    }
  })().finally(() => {
    refreshRequestPromise = null;
  });

  return refreshRequestPromise;
};
