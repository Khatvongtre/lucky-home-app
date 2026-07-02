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
    houseId: getPayloadValue(payload, 'houseId', 'HouseId', 'house_id'),
    houseName: getPayloadValue(payload, 'houseName', 'HouseName', 'house_name'),
    billId: getPayloadValue(payload, 'billId', 'BillId', 'bill_id'),
    roomId: getPayloadValue(payload, 'roomId', 'RoomId', 'room_id'),
    metadataJson: typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
    isRead: payload.isRead === true || payload.isRead === 'true',
  };
};

export const getNotificationTargetHouseId = (notification) => {
  const metadata = parseNotificationMetadata(notification?.metadataJson);
  const target = parseNotificationNavigateTarget(notification?.navigateTo);
  return notification?.houseId || notification?.HouseId || target.houseId || metadata.houseId || metadata.HouseId || '';
};

const getHouseName = (house) => (
  house?.houseName || house?.name || house?.title || ''
);

const firstFilled = (...values) => values.find(value => (
  value !== undefined && value !== null && String(value).trim() !== ''
));

const getHouseBankAcc = (house = {}) => {
  const nestedConfig = parseJsonValue(house.config, {});
  const houseConfig = parseJsonValue(house.houseConfig || house.settings, {});

  return firstFilled(
    house.bankAcc,
    nestedConfig.bankAcc,
    houseConfig.bankAcc,
    house.bankAccount,
    nestedConfig.bankAccount,
    house.accountNumber,
    nestedConfig.accountNumber
  );
};

const mergeNotificationHouse = (targetHouse, selectedHouse) => {
  if (!targetHouse && !selectedHouse) return null;
  if (!targetHouse) return selectedHouse;
  if (!selectedHouse || String(selectedHouse.id) !== String(targetHouse.id)) return targetHouse;

  const selectedConfig = parseJsonValue(selectedHouse.config, {});
  const targetConfig = parseJsonValue(targetHouse.config, {});

  return {
    ...selectedHouse,
    ...targetHouse,
    bankName: firstFilled(targetHouse.bankName, targetConfig.bankName, selectedHouse.bankName, selectedConfig.bankName),
    bankBin: firstFilled(targetHouse.bankBin, targetConfig.bankBin, selectedHouse.bankBin, selectedConfig.bankBin),
    bankAcc: firstFilled(
      targetHouse.bankAcc,
      targetConfig.bankAcc,
      targetHouse.bankAccount,
      targetConfig.bankAccount,
      targetHouse.accountNumber,
      targetConfig.accountNumber,
      selectedHouse.bankAcc,
      selectedConfig.bankAcc,
      selectedHouse.bankAccount,
      selectedConfig.bankAccount,
      selectedHouse.accountNumber,
      selectedConfig.accountNumber
    ),
    config: {
      ...selectedConfig,
      ...targetConfig,
    },
  };
};

const resolveNotificationHouse = async ({
  targetHouseId,
  houses,
  selectedHouse,
  loadHouses,
}) => {
  const matchedHouse = houses.find(house => String(house.id) === String(targetHouseId));
  let targetHouse = mergeNotificationHouse(matchedHouse, selectedHouse);

  if (targetHouse && !getHouseBankAcc(targetHouse) && loadHouses) {
    try {
      const latestHouses = await loadHouses();
      const latestHouse = (latestHouses || []).find(house => String(house.id) === String(targetHouseId));
      targetHouse = mergeNotificationHouse(latestHouse || matchedHouse, selectedHouse);
    } catch (error) {
      console.warn('Không tải lại được cấu hình cơ sở từ thông báo:', error);
    }
  }

  return targetHouse;
};

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

export const navigateToNotification = async (notification, {
  houses = [],
  selectedHouse,
  loadHouses,
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
  const targetHouse = await resolveNotificationHouse({
    targetHouseId,
    houses,
    selectedHouse,
    loadHouses,
  });

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

  const targetTab = target.tab === 'bill' || target.tab === 'bills'
    ? 'bills'
    : (target.tab || 'dashboard');

  setIsHubMode?.(false);
  setActiveTab?.(targetTab);
  setHighlightedItemId?.(
    metadata.billId
    || metadata.BillId
    || notification?.billId
    || notification?.BillId
    || metadata.roomId
    || metadata.RoomId
    || notification?.roomId
    || notification?.RoomId
    || metadata.targetId
    || metadata.TargetId
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
