import { api } from './api';

const normalizeToken = (token) => typeof token === 'string' ? token.trim() : '';

export const registerFcmToken = ({ token, platform = 'web', deviceName }) => {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return Promise.resolve(null);

  return api.post('/notifications/fcm-token', {
    token: normalizedToken,
    platform,
    ...(deviceName ? { deviceName } : {}),
  });
};

export const unregisterFcmToken = (token) => {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return Promise.resolve(null);

  return api.delete('/notifications/fcm-token', { token: normalizedToken });
};
