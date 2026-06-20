import { authStorage } from './authStorage';
import { notifySessionExpired } from './authEvents';
import {
  AUTH_LOGIN_ENDPOINT,
  AUTH_REFRESH_ENDPOINT,
  isSessionExpiredError,
  refreshToken,
} from './authRefresh';
import { fetchFromApi } from './apiServer';
import { getDeviceHeaders } from './deviceInfo';

const LEGACY_LOGIN_ENDPOINT = '/auth/login';
const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

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

const normalizeNetworkError = (error) => {
  if (error?.message?.includes?.('Failed to fetch')) {
    return new Error('Không thể kết nối Backend. Vui lòng kiểm tra Server.');
  }

  return error;
};

const isLoginRequest = (url) => url === AUTH_LOGIN_ENDPOINT || url === LEGACY_LOGIN_ENDPOINT;
const isRefreshRequest = (url) => url === AUTH_REFRESH_ENDPOINT;
const isFormDataBody = (body) => typeof FormData !== 'undefined' && body instanceof FormData;

const buildHeaders = async ({ url, headers: customHeaders, token, body }) => {
  const headers = new Headers(customHeaders || {});
  const includeDeviceHeaders = Boolean(token) || isLoginRequest(url);

  if (!isFormDataBody(body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeDeviceHeaders) {
    const deviceHeaders = await getDeviceHeaders();
    Object.entries(deviceHeaders || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && !headers.has(key)) {
        headers.set(key, value);
      }
    });
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  return headers;
};

const handleResponse = async (response) => {
  const result = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(result, `Lỗi máy chủ (${response.status})`));
  }

  return result;
};

const handleUnauthorizedResponse = async ({ url, options, retryCount, response }) => {
  const result = await parseResponseBody(response);
  const message = getErrorMessage(result, SESSION_EXPIRED_MESSAGE);

  if (isRefreshRequest(url) || retryCount >= 1) {
    notifySessionExpired(message);
    throw new Error(message);
  }

  if (!authStorage.getRefreshToken()) {
    authStorage.clearSession();
    notifySessionExpired(message);
    throw new Error(message);
  }

  try {
    await refreshToken();
  } catch (error) {
    const refreshErrorMessage = isSessionExpiredError(error)
      ? error.message
      : (error?.message || message);

    notifySessionExpired(refreshErrorMessage);
    throw new Error(refreshErrorMessage);
  }

  return request(url, options, retryCount + 1);
};

const request = async (url, options = {}, retryCount = 0) => {
  const token = authStorage.getToken();

  try {
    const response = await fetchFromApi(url, {
      ...options,
      cache: 'no-store',
      headers: await buildHeaders({
        url,
        headers: options.headers,
        token,
        body: options.body,
      }),
    });

    if (response.status === 401) {
      return handleUnauthorizedResponse({ url, options, retryCount, response });
    }

    return await handleResponse(response);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
};

const jsonRequest = (method, url, body, options = {}) => request(url, {
  ...options,
  method,
  body: body === undefined ? null : JSON.stringify(body),
});

const formRequest = (method, url, body, options = {}) => request(url, {
  ...options,
  method,
  body,
});

export const api = {
  get: (url, options) => request(url, options),
  post: (url, body, options) => jsonRequest('POST', url, body, options),
  postForm: (url, body, options) => formRequest('POST', url, body, options),
  put: (url, body, options) => jsonRequest('PUT', url, body, options),
  delete: (url, body, options) => (
    body === undefined
      ? request(url, { ...options, method: 'DELETE' })
      : jsonRequest('DELETE', url, body, options)
  ),
};
