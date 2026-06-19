import { useEffect } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '../services/authEvents';

export const useUnauthorizedLogout = (handleLogout, showToast) => {
  useEffect(() => {
    const handleUnauthorized = (event) => {
      const message = event?.detail?.message || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';
      showToast?.(message, 'error');
      handleLogout();
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleUnauthorized);
  }, [handleLogout, showToast]);
};
