import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FOREGROUND_NOTIFICATION_EVENT,
  OPENED_NOTIFICATION_EVENT,
  consumeOpenedNotificationFromUrl,
  subscribeToForegroundNotifications,
  subscribeToOpenedNotifications,
} from '../services/pushNotificationBridge';
import {
  getNotificationTargetHouseId,
  markNotificationRead,
  navigateToNotification,
  NOTIFICATION_REFRESH_EVENT,
  normalizePushNotification,
} from '../services/notificationFlow';

const SERVICE_WORKER_OPEN_TYPES = new Set([
  'notification-click',
  'notification-opened',
  'LUCKYHOME_NOTIFICATION_OPENED',
]);
const SERVICE_WORKER_FOREGROUND_TYPES = new Set([
  'notification-foreground',
  'LUCKYHOME_NOTIFICATION_FOREGROUND',
]);

const getMessagePayload = (message) => message?.notification || message?.payload || message?.data || message;
const getNotificationKey = (notification) => (
  notification?.notificationId
  || notification?.id
  || [notification?.title, notification?.message, notification?.navigateTo].join(':')
);

export const usePushNotificationFlow = ({
  isLoggedIn,
  houses,
  selectedHouse,
  setSelectedHouse,
  setConfig,
  setIsHubMode,
  setActiveTab,
  setHighlightedItemId,
  setViewDate,
}) => {
  const [foregroundNotification, setForegroundNotification] = useState(null);
  const [openedNotification, setOpenedNotification] = useState(() => consumeOpenedNotificationFromUrl());
  const openedNotificationKeyRef = useRef('');

  const openNotification = useCallback((notification) => {
    navigateToNotification(notification, {
      houses,
      selectedHouse,
      setSelectedHouse,
      setConfig,
      setIsHubMode,
      setActiveTab,
      setHighlightedItemId,
      setViewDate,
    });
    void markNotificationRead(notification).catch(() => {});
  }, [
    houses,
    selectedHouse,
    setActiveTab,
    setConfig,
    setHighlightedItemId,
    setIsHubMode,
    setSelectedHouse,
    setViewDate,
  ]);

  const handleForegroundNotification = useCallback((payload) => {
    if (!isLoggedIn) return;
    setForegroundNotification(normalizePushNotification(payload));
    window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
  }, [isLoggedIn]);

  const handleOpenedNotification = useCallback((payload) => {
    openedNotificationKeyRef.current = '';
    setOpenedNotification(normalizePushNotification(payload));
  }, []);

  useEffect(() => {
    const handleForegroundEvent = (event) => handleForegroundNotification(event.detail);
    const handleOpenedEvent = (event) => handleOpenedNotification(event.detail);
    const handleServiceWorkerMessage = (event) => {
      const type = event.data?.type;
      if (SERVICE_WORKER_OPEN_TYPES.has(type)) {
        handleOpenedNotification(getMessagePayload(event.data));
      }
      if (SERVICE_WORKER_FOREGROUND_TYPES.has(type)) {
        handleForegroundNotification(getMessagePayload(event.data));
      }
    };

    const unsubscribeForeground = subscribeToForegroundNotifications(handleForegroundNotification);
    const unsubscribeOpened = subscribeToOpenedNotifications(handleOpenedNotification);

    window.addEventListener(FOREGROUND_NOTIFICATION_EVENT, handleForegroundEvent);
    window.addEventListener(OPENED_NOTIFICATION_EVENT, handleOpenedEvent);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
      window.removeEventListener(FOREGROUND_NOTIFICATION_EVENT, handleForegroundEvent);
      window.removeEventListener(OPENED_NOTIFICATION_EVENT, handleOpenedEvent);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [handleForegroundNotification, handleOpenedNotification]);

  useEffect(() => {
    if (!isLoggedIn || !openedNotification) return;

    const targetHouseId = getNotificationTargetHouseId(openedNotification);
    if (targetHouseId && houses.length === 0) return;

    const notificationKey = getNotificationKey(openedNotification);
    if (openedNotificationKeyRef.current === notificationKey) return;
    openedNotificationKeyRef.current = notificationKey;

    openNotification(openedNotification);
  }, [houses.length, isLoggedIn, openNotification, openedNotification]);

  const openForegroundNotification = useCallback(() => {
    if (!foregroundNotification) return;
    openNotification(foregroundNotification);
    setForegroundNotification(null);
  }, [foregroundNotification, openNotification]);

  return {
    foregroundNotification,
    dismissForegroundNotification: () => setForegroundNotification(null),
    openForegroundNotification,
  };
};
