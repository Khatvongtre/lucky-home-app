import { Bell, X } from 'lucide-react';

const ForegroundNotificationPopup = ({ notification, onClose, onOpen }) => {
  if (!notification) return null;

  return (
    <div className="fixed left-0 right-0 top-4 z-[9998] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/15">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-slate-50"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Bell className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 pr-8">
            <span className="block text-[10px] font-black uppercase text-blue-600">Thông báo mới</span>
            <span className="mt-0.5 block text-sm font-black leading-snug text-slate-950">
              {notification.title || 'Lucky Home'}
            </span>
            {notification.message && (
              <span className="mt-1 block text-[12px] font-semibold leading-snug text-slate-500">
                {notification.message}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ForegroundNotificationPopup;
