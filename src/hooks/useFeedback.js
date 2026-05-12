import { useCallback, useRef, useState } from 'react';

export const useFeedback = () => {
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastTimer = useRef(null);
  const confirmResolveRef = useRef(null);

  const showToast = useCallback((text, type = 'success') => {
    setToast({ text: String(text), type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const requestConfirm = useCallback((dialog) => {
    return new Promise(resolve => {
      confirmResolveRef.current = resolve;
      setConfirmDialog(dialog);
    });
  }, []);

  const closeConfirmDialog = useCallback((confirmed) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(confirmed);
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  }, []);

  return {
    toast,
    confirmDialog,
    showToast,
    requestConfirm,
    closeConfirmDialog,
  };
};
