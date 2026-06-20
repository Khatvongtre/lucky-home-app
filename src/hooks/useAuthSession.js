import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { AUTH_SESSION_CHANGED_EVENT, authStorage } from '../services/authStorage';

const emptyPasswordForm = { oldPassword: '', newPassword: '', confirmNewPassword: '' };
const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const storedSession = getStoredSession();
      setIsLoggedIn(storedSession.isLoggedIn);
      setUser(storedSession.user);
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
  }, []);

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

  const handleUploadAvatar = useCallback(async (file) => {
    if (!file) return null;

    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
    }

    const currentSession = authStorage.getSession();
    if (!currentSession.token) {
      throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsAvatarUploading(true);

    try {
      const result = await api.postForm('/Auth/avatar', formData);
      const nextUser = result?.data?.user || result?.user;
      if (!nextUser) {
        throw new Error('Backend chưa trả về thông tin người dùng mới.');
      }

      authStorage.setSession({
        token: currentSession.token,
        refreshToken: currentSession.refreshToken,
        user: nextUser,
        persist: currentSession.persist,
      });
      setUser(nextUser);
      showToast(result?.message || 'Cập nhật ảnh đại diện thành công.', 'success');
      return nextUser;
    } catch (error) {
      throw new Error(error?.message || 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setIsAvatarUploading(false);
    }
  }, [showToast]);

  return {
    isLoggedIn,
    setIsLoggedIn,
    user,
    setUser,
    changePasswordForm,
    setChangePasswordForm,
    handleLogout,
    handleChangePassword,
    isAvatarUploading,
    handleUploadAvatar,
  };
};
