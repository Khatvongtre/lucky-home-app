import { useEffect, useState } from 'react';
import { getCurrentFcmToken, subscribeToFcmToken } from '../services/fcmTokenStore';

export const useFcmToken = () => {
  const [fcmToken, setFcmToken] = useState(() => getCurrentFcmToken());

  useEffect(() => subscribeToFcmToken(setFcmToken), []);

  return fcmToken;
};
