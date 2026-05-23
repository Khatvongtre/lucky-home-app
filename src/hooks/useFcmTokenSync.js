import { useCallback, useEffect, useRef } from 'react';
import { authStorage } from '../services/authStorage';
import { registerFcmToken, unregisterFcmToken } from '../services/fcmTokenApi';

const getRegistrationKey = ({ token, platform, deviceName }) => (
  [token, platform, deviceName].join(':')
);

export const useFcmTokenSync = ({ isLoggedIn, fcmToken }) => {
  const lastRegistrationKeyRef = useRef('');
  const deleteRequestRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn || !fcmToken?.token) {
      if (!isLoggedIn) lastRegistrationKeyRef.current = '';
      return;
    }

    const registrationKey = getRegistrationKey(fcmToken);
    if (lastRegistrationKeyRef.current === registrationKey) return;

    lastRegistrationKeyRef.current = registrationKey;

    registerFcmToken(fcmToken).catch(() => {
      if (lastRegistrationKeyRef.current === registrationKey) {
        lastRegistrationKeyRef.current = '';
      }
    });
  }, [fcmToken, isLoggedIn]);

  const deleteCurrentFcmToken = useCallback(() => {
    const token = fcmToken?.token;
    if (!token || !authStorage.getToken()) return Promise.resolve(null);

    if (deleteRequestRef.current?.token === token) {
      return deleteRequestRef.current.request;
    }

    const request = unregisterFcmToken(token)
      .catch(() => null)
      .finally(() => {
        if (deleteRequestRef.current?.request === request) {
          deleteRequestRef.current = null;
        }
      });

    deleteRequestRef.current = { token, request };
    return request;
  }, [fcmToken?.token]);

  return { deleteCurrentFcmToken };
};
