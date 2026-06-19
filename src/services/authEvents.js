export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

let hasDispatchedSessionExpired = false;

export const notifySessionExpired = (message) => {
  if (hasDispatchedSessionExpired || typeof window === 'undefined') return;

  hasDispatchedSessionExpired = true;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
    detail: { message },
  }));
};

export const resetSessionExpiredNotification = () => {
  hasDispatchedSessionExpired = false;
};
