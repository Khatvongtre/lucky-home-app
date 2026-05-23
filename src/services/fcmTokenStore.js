const DEFAULT_FCM_PLATFORM = 'web';

let currentFcmToken = {
  token: '',
  platform: DEFAULT_FCM_PLATFORM,
  deviceName: '',
};

const tokenListeners = new Set();

const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';

const emitTokenChange = () => {
  tokenListeners.forEach(listener => listener(currentFcmToken));
};

export const getCurrentFcmToken = () => currentFcmToken;

export const setCurrentFcmToken = (token, options = {}) => {
  const nextFcmToken = {
    token: normalizeText(token),
    platform: normalizeText(options.platform) || DEFAULT_FCM_PLATFORM,
    deviceName: normalizeText(options.deviceName),
  };

  if (
    nextFcmToken.token === currentFcmToken.token
    && nextFcmToken.platform === currentFcmToken.platform
    && nextFcmToken.deviceName === currentFcmToken.deviceName
  ) {
    return currentFcmToken;
  }

  currentFcmToken = nextFcmToken;
  emitTokenChange();
  return currentFcmToken;
};

export const subscribeToFcmToken = (listener) => {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
};
