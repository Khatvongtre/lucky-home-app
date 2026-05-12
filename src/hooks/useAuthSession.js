import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { authStorage } from '../services/authStorage';

const emptyPasswordForm = { oldPassword: '', newPassword: '', confirmNewPassword: '' };

const getStoredSession = () => {
  const token = authStorage.getToken();
  const user = authStorage.getUser();
  return {
    isLoggedIn: Boolean(token && user),
    user: token && user ? user : null,
  };
};

export const useAuthSession = ({ showToast }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getStoredSession().isLoggedIn);
  const [user, setUser] = useState(() => getStoredSession().user);
  const [changePasswordForm, setChangePasswordForm] = useState(emptyPasswordForm);

  const handleLogout = useCallback(() => {
    authStorage.clearSession();
    setIsLoggedIn(false);
    setUser(null);
    setChangePasswordForm(emptyPasswordForm);
  }, []);

  const handleChangePassword = useCallback(async (e) => {
    e.preventDefault();
    if (changePasswordForm.newPassword !== changePasswordForm.confirmNewPassword) {
      showToast('Mật khẩu mới không khớp!', 'error');
      return;
    }

    try {
      const currentUsername = user?.username || user?.userName || user?.Username;
      if (!currentUsername) {
        showToast('Lỗi: Không tìm thấy Username trong phiên đăng nhập. Vui lòng đăng nhập lại!', 'error');
        return;
      }

      await api.post('/auth/change-password', {
        username: currentUsername,
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword,
      });
      showToast('Đổi mật khẩu thành công!', 'success');
      setChangePasswordForm(emptyPasswordForm);
    } catch (error) {
      showToast(error.message || 'Lỗi khi đổi mật khẩu', 'error');
    }
  }, [changePasswordForm, showToast, user]);

  return {
    isLoggedIn,
    setIsLoggedIn,
    user,
    setUser,
    changePasswordForm,
    setChangePasswordForm,
    handleLogout,
    handleChangePassword,
  };
};
