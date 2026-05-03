import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const ToastNotification = ({ toast }) => {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[1000] px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top flex items-center text-white ${isError ? 'bg-red-600' : 'bg-slate-900'}`}>
            {isError ? <AlertCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />}
            {toast.text}
        </div>
    );
};

export default ToastNotification;