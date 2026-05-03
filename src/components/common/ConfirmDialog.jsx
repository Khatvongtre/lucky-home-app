import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

const ConfirmDialog = ({ dialog, onCancel, onConfirm }) => {
    if (!dialog) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}></div>
            <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                        {dialog.title || 'Xác nhận xóa'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        {dialog.message}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4">
                    <button type="button" onClick={onCancel} className="py-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                        Hủy
                    </button>
                    <button type="button" onClick={onConfirm} className="py-3.5 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest border-b-1 border-red-800 shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" /> Xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;