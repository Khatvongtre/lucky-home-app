import React from 'react';
import { X } from 'lucide-react';
import { useSwipeBack } from '../../hooks/useSwipeBack';

const Modal = ({ title, onClose, children }) => {
    const swipeBackHandlers = useSwipeBack({ onBack: onClose });

    return (
    <div {...swipeBackHandlers} className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[85vh] relative animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-blue-600 flex justify-between items-center p-3.5 shrink-0 rounded-t-xl z-10 text-left">
                <h3 className="font-black text-white uppercase text-[10px] tracking-widest">{title}</h3>
                <button type="button" onClick={onClose} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-90 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto no-scrollbar">{children}</div>
        </div>
    </div>
    );
};

export default Modal;
