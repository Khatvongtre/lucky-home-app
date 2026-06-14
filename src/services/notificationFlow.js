import { api } from './api';

export const NOTIFICATION_REFRESH_EVENT = 'luckyhome:notifications:refresh';

const parseJsonValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getPayloadValue = (payload, ...keys) => {
  for (const key of keys) {
    const value = payload?.[key] ?? payload?.data?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return '';
};

export const parseNotificationMetadata = (metadataJson) => parseJsonValue(metadataJson, {});

export const parseNotificationNavigateTarget = (navigateTo = '') => {
  const [path, queryString = ''] = String(navigateTo || '').split('?');
  const query = new URLSearchParams(queryString);
  const parts = path.split('/').filter(Boolean);

  return {
    tab: parts[0] || '',
    houseId: parts[1] || query.get('houseId') || '',
    year: Number(query.get('year')) || null,
    month: Number(query.get('month')) || null,
  };
};

export const normalizePushNotification = (payload = {}) => {
  const notificationPayload = payload.notification && typeof payload.notification === 'object'
    ? payload.notification
    : {};
  const metadata = getPayloadValue(payload, 'metadataJson', 'metadata');
  const notificationId = getPayloadValue(payload, 'notificationId', 'id');

  return {
    ...payload,
    id: notificationId,
    notificationId,
    title: getPayloadValue(payload, 'title') || notificationPayload.title || '',
    message: getPayloadValue(payload, 'message', 'body') || notificationPayload.body || '',
    navigateTo: getPayloadValue(payload, 'navigateTo', 'navigate_to'),
    houseId: getPayloadValue(payload, 'houseId', 'house_id'),
    houseName: getPayloadValue(payload, 'houseName', 'house_name'),
    billId: getPayloadValue(payload, 'billId', 'bill_id'),
    roomId: getPayloadValue(payload, 'roomId', 'room_id'),
    metadataJson: typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
    isRead: payload.isRead === true || payload.isRead === 'true',
  };
};

export const getNotificationTargetHouseId = (notification) => {
  const metadata = parseNotificationMetadata(notification?.metadataJson);
  const target = parseNotificationNavigateTarget(notification?.navigateTo);
  return notification?.houseId || target.houseId || metadata.houseId || metadata.HouseId || '';
};

const getHouseName = (house) => (
  house?.houseName || house?.name || house?.title || ''
);

export const getNotificationHouseName = (notification, houses = [], selectedHouse = null) => {
  const metadata = parseNotificationMetadata(notification?.metadataJson);
  const payloadHouseName = (
    notification?.houseName
    || notification?.HouseName
    || metadata.houseName
    || metadata.HouseName
    || metadata.houseLabel
  );
  if (payloadHouseName) return payloadHouseName;

  const targetHouseId = getNotificationTargetHouseId(notification);
  const matchedHouse = houses.find(house => String(house.id) === String(targetHouseId));
  if (matchedHouse) return getHouseName(matchedHouse);

  if (targetHouseId && String(selectedHouse?.id) === String(targetHouseId)) {
    return getHouseName(selectedHouse);
  }

  return '';
};

export const navigateToNotification = (notification, {
  houses = [],
  selectedHouse,
  setSelectedHouse,
  setConfig,
  setIsHubMode,
  setActiveTab,
  setHighlightedItemId,
  setViewDate,
}) => {
  const metadata = parseNotificationMetadata(notification?.metadataJson);
  const target = parseNotificationNavigateTarget(notification?.navigateTo);
  const targetHouseId = getNotificationTargetHouseId(notification);
  const targetHouse = houses.find(house => String(house.id) === String(targetHouseId));

  if (targetHouse) {
    setSelectedHouse?.(targetHouse);
    setConfig?.({ ...targetHouse });
  } else if (selectedHouse) {
    setSelectedHouse?.(selectedHouse);
    setConfig?.({ ...selectedHouse });
  }

  if (target.month && target.year) {
    setViewDate?.(new Date(target.year, target.month - 1, 1));
  }

  setIsHubMode?.(false);
  setActiveTab?.(target.tab === 'bills' ? 'bills' : (target.tab || 'dashboard'));
  setHighlightedItemId?.(
    metadata.billId
    || notification?.billId
    || metadata.roomId
    || notification?.roomId
    || metadata.targetId
    || notification?.id
  );
};

export const markNotificationRead = async (notification) => {
  const notificationId = notification?.notificationId || notification?.id;
  if (!notificationId || notification?.isRead) return null;

  const result = await api.post(`/notifications/${encodeURIComponent(notificationId)}/read`);
  window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
  return result;
};
