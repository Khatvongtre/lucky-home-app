import packageJson from '../../package.json';

const DEVICE_ID_KEY = 'lucky_home_device_id';
const FALLBACK_DEVICE_NAME = 'Thiết bị không xác định';

const getNavigator = () => (typeof navigator === 'undefined' ? null : navigator);

const getBrowserName = (userAgent) => {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return 'Opera';
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent) || /FxiOS\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return '';
};

const getOperatingSystem = (userAgent) => {
  if (/Windows NT/.test(userAgent)) return 'Windows';
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return '';
};

const createDeviceId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getDeviceId = () => {
  if (typeof localStorage === 'undefined') return createDeviceId();

  const savedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (savedDeviceId) return savedDeviceId;

  const nextDeviceId = createDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, nextDeviceId);
  return nextDeviceId;
};

export const getDeviceName = () => {
  const nav = getNavigator();
  const userAgent = nav?.userAgent || '';
  const browser = getBrowserName(userAgent);
  const os = getOperatingSystem(userAgent);

  if (browser && os) return `${browser} trên ${os}`;
  if (browser) return browser;
  if (os) return os;
  return FALLBACK_DEVICE_NAME;
};

export const getAppVersion = () => (
  import.meta.env.VITE_APP_VERSION
  || packageJson.version
  || '0.0.0'
);

export const getDeviceHeaders = ({ includeName = false } = {}) => ({
  'X-Device-Id': getDeviceId(),
  'X-App-Version': getAppVersion(),
  ...(includeName && { 'X-Device-Name': getDeviceName() }),
});
