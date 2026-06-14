import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import packageJson from '../../package.json';

const INSTALLATION_ID_KEY = 'lucky_home_installation_id';
const LEGACY_DEVICE_ID_KEY = 'lucky_home_device_id';

let cachedMetadata = null;
let metadataPromise = null;

const getNavigator = () => (typeof navigator === 'undefined' ? null : navigator);

const getBrowserName = (userAgent) => {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return 'Opera';
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent) || /FxiOS\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return '';
};

const getWebOperatingSystem = (userAgent) => {
  const matches = [
    [/Windows NT ([\d.]+)/, 'Windows'],
    [/Android ([\d.]+)/, 'Android'],
    [/(?:iPhone|CPU) OS ([\d_]+)/, 'iOS'],
    [/Mac OS X ([\d_]+)/, 'macOS'],
    [/Linux/, 'Linux'],
  ];

  for (const [pattern, operatingSystem] of matches) {
    const match = userAgent.match(pattern);
    if (match) {
      return {
        operatingSystem,
        osVersion: match[1]?.replaceAll('_', '.') || '',
      };
    }
  }

  return { operatingSystem: '', osVersion: '' };
};

const createUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const randomValues = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 256);
    }
  }

  randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
  const hex = Array.from(randomValues, value => value.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

const getLocalStorageValue = (key) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setLocalStorageValue = (key, value) => {
  try {
    localStorage?.setItem(key, value);
  } catch {
    // Preferences remains the primary storage on native platforms.
  }
};

const getInstallationId = async () => {
  try {
    const storedPreference = await Preferences.get({ key: INSTALLATION_ID_KEY });
    if (storedPreference.value) return storedPreference.value;
  } catch {
    // Fall back to localStorage when Preferences is unavailable.
  }

  const storedId = (
    getLocalStorageValue(INSTALLATION_ID_KEY)
    || getLocalStorageValue(LEGACY_DEVICE_ID_KEY)
  );
  const installationId = storedId || createUuid();

  try {
    await Preferences.set({ key: INSTALLATION_ID_KEY, value: installationId });
  } catch {
    // The localStorage fallback below keeps the ID stable on web.
  }

  setLocalStorageValue(INSTALLATION_ID_KEY, installationId);
  return installationId;
};

const getDefaultAppVersion = () => (
  import.meta.env.VITE_APP_VERSION
  || packageJson.version
  || '0.0.0'
);

const collectNativeMetadata = async () => {
  const [deviceResult, appResult] = await Promise.allSettled([
    Device.getInfo(),
    App.getInfo(),
  ]);
  const deviceInfo = deviceResult.status === 'fulfilled' ? deviceResult.value : {};
  const appInfo = appResult.status === 'fulfilled' ? appResult.value : {};
  const platform = deviceInfo.platform || Capacitor.getPlatform();

  return {
    model: deviceInfo.model || '',
    platform,
    operatingSystem: deviceInfo.operatingSystem || '',
    osVersion: deviceInfo.osVersion || '',
    appVersion: appInfo.version || getDefaultAppVersion(),
    browser: '',
  };
};

const collectWebMetadata = () => {
  const userAgent = getNavigator()?.userAgent || '';
  const { operatingSystem, osVersion } = getWebOperatingSystem(userAgent);

  return {
    model: '',
    platform: Capacitor.getPlatform() || 'web',
    operatingSystem,
    osVersion,
    appVersion: getDefaultAppVersion(),
    browser: getBrowserName(userAgent),
  };
};

const collectDeviceMetadata = async () => {
  const [installationId, platformMetadata] = await Promise.all([
    getInstallationId(),
    Capacitor.isNativePlatform()
      ? collectNativeMetadata()
      : Promise.resolve(collectWebMetadata()),
  ]);
  const deviceName = platformMetadata.model || platformMetadata.platform;
  const osVersion = [
    platformMetadata.operatingSystem,
    platformMetadata.osVersion,
  ].filter(Boolean).join(' ');

  return {
    installationId,
    deviceName,
    deviceModel: platformMetadata.model,
    platform: platformMetadata.platform,
    osVersion,
    appVersion: platformMetadata.appVersion,
    browser: platformMetadata.browser,
  };
};

export const initializeDeviceMetadata = () => {
  if (cachedMetadata) return Promise.resolve(cachedMetadata);

  if (!metadataPromise) {
    metadataPromise = collectDeviceMetadata()
      .catch(async () => ({
        installationId: await getInstallationId().catch(() => createUuid()),
        deviceName: Capacitor.getPlatform() || 'web',
        deviceModel: '',
        platform: Capacitor.getPlatform() || 'web',
        osVersion: '',
        appVersion: getDefaultAppVersion(),
        browser: getBrowserName(getNavigator()?.userAgent || ''),
      }))
      .then((metadata) => {
        cachedMetadata = metadata;
        return metadata;
      });
  }

  return metadataPromise;
};

export const getDeviceHeaders = async () => {
  const metadata = await initializeDeviceMetadata();

  return Object.fromEntries(Object.entries({
    'X-Installation-Id': metadata.installationId,
    'X-Device-Id': metadata.installationId,
    'X-Device-Name': metadata.deviceName,
    'X-Device-Model': metadata.deviceModel,
    'X-Platform': metadata.platform,
    'X-OS-Version': metadata.osVersion,
    'X-App-Version': metadata.appVersion,
    'X-Browser': metadata.browser,
  }).filter(([, value]) => Boolean(value)));
};
