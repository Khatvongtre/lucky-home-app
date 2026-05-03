import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const ToastNotification = ({ toast }) => {
    if (!toast) return null;

    const config = {
        error: {
            icon: AlertTriangle,
            border: 'border-red-200',
            iconBg: 'bg-red-50',
            iconColor: 'text-red-500',
            titleColor: 'text-red-700',
            title: 'Có lỗi xảy ra',
            shadow: 'shadow-red-500/20'
        },
        warning: {
            icon: AlertTriangle,
            border: 'border-amber-200',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-500',
            titleColor: 'text-amber-700',
            title: 'Lưu ý',
            shadow: 'shadow-amber-500/20'
        },
        success: {
            icon: CheckCircle2,
            border: 'border-emerald-200',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
            titleColor: 'text-emerald-700',
            title: 'Thành công',
            shadow: 'shadow-emerald-500/20'
        }
    };

    const currentConfig = config[toast.type] || config.success;
    const Icon = currentConfig.icon;

    return (
        <div className="fixed top-4 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <div className={`flex items-start gap-3 p-3 max-w-sm w-full rounded-2xl shadow-xl border bg-white/90 backdrop-blur-md animate-in slide-in-from-top-6 fade-in duration-300 ${currentConfig.border} ${currentConfig.shadow}`}>
                <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-xl ${currentConfig.iconBg} ${currentConfig.iconColor}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5 pr-2">
                    <h4 className={`text-[12px] font-black uppercase tracking-tight leading-none mb-1 ${currentConfig.titleColor}`}>
                        {currentConfig.title}
                    </h4>
                    <p className="text-[11.5px] font-semibold text-slate-600 leading-snug break-words">
                        {toast.text}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ToastNotification;