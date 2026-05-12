import { ShieldCheck } from 'lucide-react';

const PermissionDenied = ({ onBack }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
    <h3 className="text-lg font-black text-slate-800 uppercase">Không có quyền truy cập</h3>
    <p className="text-xs text-slate-500 mt-2">Chức năng này chỉ dành cho Chủ Sở Hữu.</p>
    <button onClick={onBack} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase">Về trang chủ</button>
  </div>
);

export default PermissionDenied;
