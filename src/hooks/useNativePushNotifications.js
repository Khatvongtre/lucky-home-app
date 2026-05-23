import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { setCurrentFcmToken } from '../services/fcmTokenStore';
import {
  publishForegroundNotification,
  publishOpenedNotification,
} from '../services/pushNotificationBridge';

const isSupportedNativePushPlatform = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

export const useNativePushNotifications = ({ isLoggedIn }) => {
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) {
      hasRegisteredRef.current = false;
      setCurrentFcmToken('');
      return undefined;
    }

    if (!isSupportedNativePushPlatform() || hasRegisteredRef.current) {
      return undefined;
    }

    let isActive = true;
    const listenerHandles = [];

    const addListenersAndRegister = async () => {
      listenerHandles.push(
        await PushNotifications.addListener('registration', token => {
          if (!isActive) return;
          setCurrentFcmToken(token.value, { platform: Capacitor.getPlatform() });
        })
      );

      listenerHandles.push(
        await PushNotifications.addListener('registrationError', error => {
          console.warn('Push notification registration failed:', error.error);
        })
      );

      listenerHandles.push(
        await PushNotifications.addListener('pushNotificationReceived', notification => {
          publishForegroundNotification(notification);
        })
      );

      listenerHandles.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', action => {
          publishOpenedNotification(action.notification);
        })
      );

      let permissionStatus = await PushNotifications.checkPermissions();
      if (permissionStatus.receive === 'prompt' || permissionStatus.receive === 'prompt-with-rationale') {
        permissionStatus = await PushNotifications.requestPermissions();
      }

      if (permissionStatus.receive !== 'granted') {
        console.warn('Push notification permission was not granted.');
        return;
      }

      hasRegisteredRef.current = true;
      await PushNotifications.register();
    };

    addListenersAndRegister().catch(error => {
      console.warn('Unable to initialize push notifications:', error);
    });

    return () => {
      isActive = false;
      listenerHandles.forEach(handle => {
        handle.remove().catch(() => {});
      });
    };
  }, [isLoggedIn]);
};
