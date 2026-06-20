import React from 'react';
import { Camera, Loader2, Lock, LogOut } from 'lucide-react';
import AppUpdatePanel from '../components/common/AppUpdatePanel';
import AccessDevicesPanel from '../components/auth/AccessDevicesPanel';
import UserAvatar from '../components/common/UserAvatar';
import Modal from '../components/common/Modal';

const AVATAR_PREVIEW_SIZE = 280;
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_OUTPUT_TYPE = 'image/jpeg';
const AVATAR_OUTPUT_QUALITY = 0.82;

const loadImageElement = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
  image.src = src;
});

const clampCropOffset = ({ offsetX, offsetY, zoom, imageWidth, imageHeight }) => {
  if (!imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0 };
  }

  const baseScale = Math.max(AVATAR_OUTPUT_SIZE / imageWidth, AVATAR_OUTPUT_SIZE / imageHeight);
  const drawWidth = imageWidth * baseScale * zoom;
  const drawHeight = imageHeight * baseScale * zoom;
  const maxOffsetX = Math.max((drawWidth - AVATAR_OUTPUT_SIZE) / 2, 0);
  const maxOffsetY = Math.max((drawHeight - AVATAR_OUTPUT_SIZE) / 2, 0);

  return {
    offsetX: Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX),
    offsetY: Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY),
  };
};

const cropAvatarFile = async (sourceUrl, cropState, originalFileName) => {
  const image = await loadImageElement(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }

  const { zoom, offsetX, offsetY } = cropState;
  const baseScale = Math.max(
    AVATAR_OUTPUT_SIZE / image.width,
    AVATAR_OUTPUT_SIZE / image.height,
  );
  const drawWidth = image.width * baseScale * zoom;
  const drawHeight = image.height * baseScale * zoom;
  const drawX = (AVATAR_OUTPUT_SIZE - drawWidth) / 2 + offsetX;
  const drawY = (AVATAR_OUTPUT_SIZE - drawHeight) / 2 + offsetY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error('Không thể xuất ảnh avatar.'));
    }, AVATAR_OUTPUT_TYPE, AVATAR_OUTPUT_QUALITY);
  });

  const safeName = (originalFileName || 'avatar').replace(/\.[^.]+$/, '');
  return new File([blob], `${safeName}-avatar.jpg`, { type: AVATAR_OUTPUT_TYPE });
};

const ProfileView = ({
  user,
  getRoleLabel,
  handleLogout,
  changePasswordForm,
  setChangePasswordForm,
  handleChangePassword,
  isAvatarUploading,
  handleUploadAvatar,
  requestConfirm,
  showToast,
}) => {
  const fileInputRef = React.useRef(null);
  const dragStateRef = React.useRef(null);
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = React.useState(null);
  const [cropSourceUrl, setCropSourceUrl] = React.useState('');
  const [cropZoom, setCropZoom] = React.useState(1);
  const [cropOffset, setCropOffset] = React.useState({ x: 0, y: 0 });
  const [imageBounds, setImageBounds] = React.useState({ width: 0, height: 0 });
  const previewImageStyle = React.useMemo(() => {
    if (!imageBounds.width || !imageBounds.height) {
      return {
        width: '100%',
        height: '100%',
        transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
      };
    }

    const previewScale = Math.max(
      AVATAR_PREVIEW_SIZE / imageBounds.width,
      AVATAR_PREVIEW_SIZE / imageBounds.height,
    );

    return {
      width: `${imageBounds.width * previewScale * cropZoom}px`,
      height: `${imageBounds.height * previewScale * cropZoom}px`,
      transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
    };
  }, [cropOffset.x, cropOffset.y, cropZoom, imageBounds.height, imageBounds.width]);

  React.useEffect(() => {
    setPreviewUrl('');
  }, [user?.avatarUrl]);

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
  }, [cropSourceUrl, previewUrl]);

  const closeCropModal = React.useCallback(() => {
    setSelectedAvatarFile(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setImageBounds({ width: 0, height: 0 });
    setCropSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  }, []);

  const updateCropOffset = React.useCallback((nextOffset, nextZoom = cropZoom) => {
    const clamped = clampCropOffset({
      offsetX: nextOffset.x,
      offsetY: nextOffset.y,
      zoom: nextZoom,
      imageWidth: imageBounds.width,
      imageHeight: imageBounds.height,
    });
    setCropOffset({ x: clamped.offsetX, y: clamped.offsetY });
  }, [cropZoom, imageBounds.height, imageBounds.width]);

  const handleCropImageLoad = React.useCallback((event) => {
    const nextBounds = {
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    };
    setImageBounds(nextBounds);
    setCropZoom(1);
    const clamped = clampCropOffset({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      imageWidth: nextBounds.width,
      imageHeight: nextBounds.height,
    });
    setCropOffset({ x: clamped.offsetX, y: clamped.offsetY });
  }, []);

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const nextCropSourceUrl = URL.createObjectURL(file);
    setSelectedAvatarFile(file);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setImageBounds({ width: 0, height: 0 });
    setCropSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextCropSourceUrl;
    });
  };

  const handleCropPointerDown = React.useCallback((event) => {
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: cropOffset.x,
      originY: cropOffset.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [cropOffset.x, cropOffset.y]);

  const handleCropPointerMove = React.useCallback((event) => {
    if (!dragStateRef.current) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    updateCropOffset({
      x: dragStateRef.current.originX + deltaX,
      y: dragStateRef.current.originY + deltaY,
    });
  }, [updateCropOffset]);

  const handleCropPointerUp = React.useCallback((event) => {
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropSourceUrl || !selectedAvatarFile) return;

    try {
      const processedFile = await cropAvatarFile(cropSourceUrl, {
        zoom: cropZoom,
        offsetX: cropOffset.x,
        offsetY: cropOffset.y,
      }, selectedAvatarFile.name);
      const nextPreviewUrl = URL.createObjectURL(processedFile);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextPreviewUrl;
      });
      await handleUploadAvatar(processedFile);
      closeCropModal();
    } catch (error) {
      showToast(error.message || 'Không thể cập nhật ảnh đại diện.', 'error');
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    }
  };

  return (
    <>
      <div className="min-h-[calc(100vh-170px)] flex flex-col animate-in fade-in pb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar
                user={user}
                src={previewUrl}
                className="h-14 w-14 rounded-full shadow-sm"
                fallbackClassName="text-lg"
                iconClassName="w-7 h-7"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAvatarUploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-slate-900 text-white shadow-sm transition-all active:scale-95 disabled:opacity-60"
                aria-label="Cập nhật ảnh đại diện"
                title="Cập nhật ảnh đại diện"
              >
                {isAvatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base text-slate-900 uppercase tracking-tight truncate">
                {user?.fullName || user?.username || 'Tài khoản'}
              </h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                {getRoleLabel(user?.role)}
              </p>
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                Chạm biểu tượng camera để đổi ảnh JPG, PNG hoặc WEBP.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <AccessDevicesPanel requestConfirm={requestConfirm} showToast={showToast} />
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-blue-600 px-5 py-4">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Đổi mật khẩu</h4>
          </div>
          <form onSubmit={handleChangePassword} className="p-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu cũ</label>
                <input type="password" value={changePasswordForm.oldPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu mới</label>
                <input type="password" value={changePasswordForm.newPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Xác nhận mật khẩu mới</label>
                <input type="password" value={changePasswordForm.confirmNewPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, confirmNewPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
              </div>
              <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-rose-800 active:translate-y-1 transition-all">
                <Lock className="w-4 h-4" /> Xác nhận đổi mật khẩu
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4">
          <AppUpdatePanel />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full bg-white border border-red-100 text-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      {cropSourceUrl && (
        <Modal title="Cắt ảnh đại diện" onClose={closeCropModal}>
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500">
              Kéo ảnh để canh khung vuông, sau đó thu phóng nếu cần. Ảnh sẽ được nén nhẹ trước khi tải lên.
            </p>
            <div
              className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[28px] bg-slate-950 touch-none select-none"
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              <img
                src={cropSourceUrl}
                alt="Xem trước ảnh đại diện"
                onLoad={handleCropImageLoad}
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                style={previewImageStyle}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/15" />
              <div className="pointer-events-none absolute inset-3 rounded-[24px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]" />
            </div>
            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thu phóng</span>
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={cropZoom}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value);
                  setCropZoom(nextZoom);
                  const clamped = clampCropOffset({
                    offsetX: cropOffset.x,
                    offsetY: cropOffset.y,
                    zoom: nextZoom,
                    imageWidth: imageBounds.width,
                    imageHeight: imageBounds.height,
                  });
                  setCropOffset({ x: clamped.offsetX, y: clamped.offsetY });
                }}
                className="w-full accent-blue-600"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeCropModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-[0.98]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={isAvatarUploading}
                className="rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {isAvatarUploading ? 'Đang tải...' : 'Cắt và lưu'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ProfileView;
