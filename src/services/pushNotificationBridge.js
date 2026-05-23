import { normalizePushNotification } from './notificationFlow';

export const FOREGROUND_NOTIFICATION_EVENT = 'luckyhome:notification-foreground';
export const OPENED_NOTIFICATION_EVENT = 'luckyhome:notification-opened';

const foregroundListeners = new Set();
const openedListeners = new Set();
const URL_NOTIFICATION_KEYS = [
  'luckyhomeNotification',
  'notificationId',
  'notificationTitle',
  'notificationMessage',
  'notificationBody',
  'notificationNavigateTo',
  'notificationHouseId',
  'notificationMetadata',
  'notificationMetadataJson',
  'notificationBillId',
  'notificationRoomId',
];

let queuedOpenedNotification = null;
let urlOpenedNotification = null;
let hasConsumedUrlNotification = false;

const emit = (listeners, payload) => {
  const notification = normalizePushNotification(payload);
  listeners.forEach(listener => listener(notification));
  return notification;
};

const getNotificationFromUrl = () => {
  const url = new URL(window.location.href);
  const rawNotification = url.searchParams.get('luckyhomeNotification');

  if (rawNotification) {
    try {
      return JSON.parse(rawNotification);
    } catch {
      return null;
    }
  }

  const notificationId = url.searchParams.get('notificationId');
  if (!notificationId) return null;

  return {
    notificationId,
    title: url.searchParams.get('notificationTitle') || '',
    message: url.searchParams.get('notificationMessage') || url.searchParams.get('notificationBody') || '',
    navigateTo: url.searchParams.get('notificationNavigateTo') || '',
    houseId: url.searchParams.get('notificationHouseId') || '',
    metadataJson: url.searchParams.get('notificationMetadataJson') || url.searchParams.get('notificationMetadata') || '',
    billId: url.searchParams.get('notificationBillId') || '',
    roomId: url.searchParams.get('notificationRoomId') || '',
  };
};

const clearNotificationUrlParams = () => {
  const url = new URL(window.location.href);
  const hasNotificationParams = URL_NOTIFICATION_KEYS.some(key => url.searchParams.has(key));
  if (!hasNotificationParams) return;

  URL_NOTIFICATION_KEYS.forEach(key => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
};

export const publishForegroundNotification = (payload) => emit(foregroundListeners, payload);

export const publishOpenedNotification = (payload) => {
  const notification = emit(openedListeners, payload);
  if (openedListeners.size === 0) queuedOpenedNotification = notification;
  return notification;
};

export const subscribeToForegroundNotifications = (listener) => {
  foregroundListeners.add(listener);
  return () => foregroundListeners.delete(listener);
};

export const subscribeToOpenedNotifications = (listener) => {
  openedListeners.add(listener);

  if (queuedOpenedNotification) {
    listener(queuedOpenedNotification);
    queuedOpenedNotification = null;
  }

  return () => openedListeners.delete(listener);
};

export const consumeOpenedNotificationFromUrl = () => {
  if (hasConsumedUrlNotification) return urlOpenedNotification;

  const payload = getNotificationFromUrl();
  clearNotificationUrlParams();
  hasConsumedUrlNotification = true;
  urlOpenedNotification = payload ? normalizePushNotification(payload) : null;
  return urlOpenedNotification;
};
