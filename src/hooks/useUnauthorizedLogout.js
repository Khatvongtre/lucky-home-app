import { useEffect } from 'react';

export const useUnauthorizedLogout = (handleLogout) => {
  useEffect(() => {
    const handleUnauthorized = () => handleLogout();

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [handleLogout]);
};
