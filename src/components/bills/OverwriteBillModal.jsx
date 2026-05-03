import React from 'react';
import { AlertTriangle } from 'lucide-react';

const OverwriteBillModal = ({ isOverwriteModalOpen, setIsOverwriteModalOpen, executeGenerateBills }) => {
    if (!isOverwriteModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"></div>

            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-orange-500 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">Phát hiện trùng lặp!</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                        Hóa đơn <span className="font-bold text-blue-600">Tháng {new Date().getMonth() + 1}</span> đã tồn tại trên hệ thống. Bạn có muốn xóa bản cũ và tạo lại không?
                    </p>
                </div>

                <div className="flex p-4 gap-3 bg-slate-50">
                    <button onClick={() => setIsOverwriteModalOpen(false)} className="flex-1 py-4 bg-white text-slate-400 font-black uppercase text-[10px] rounded-2xl border border-slate-200 active:scale-95 transition-all">Để sau</button>
                    <button onClick={executeGenerateBills} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] rounded-2xl active:scale-95 transition-all border-b-1 border-blue-800">Đồng ý tạo lại</button>
                </div>
            </div>
        </div>
    );
};

export default OverwriteBillModal;