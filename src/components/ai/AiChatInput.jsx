import React, { useRef, useState } from 'react';
import { Send, Image as ImageIcon, X, Mic } from 'lucide-react';

const AiChatInput = ({ isAiLoading, onSubmit, showToast }) => {
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const handleMicClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (showToast) showToast('Tr\u00ecnh duy\u1ec7t kh\u00f4ng h\u1ed7 tr\u1ee3 nh\u1eadn di\u1ec7n gi\u1ecdng n\u00f3i', 'error');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            return;
        }

        recognition.onstart = () => {
            setIsListening(true);
            if (showToast) showToast('\u0110ang nghe... H\u00e3y n\u00f3i y\u00eau c\u1ea7u c\u1ee7a b\u1ea1n', 'success');
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => prev ? prev + ' ' + transcript : transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result);
                    reader.readAsDataURL(blob);
                }
                break;
            }
        }
    };

    const onEnterPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = (textOverride = null) => {
        const textToSubmit = textOverride !== null ? textOverride : inputText;
        if ((!textToSubmit?.trim() && !imagePreview) || isAiLoading) return;

        onSubmit(textToSubmit, imagePreview);
        setInputText('');
        setImagePreview(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    return (
        <div className="p-3 pb-6 bg-white border-t border-slate-100 shrink-0 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
            <div className={`relative flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm ${imagePreview ? 'pt-2.5' : ''}`}>
                {imagePreview && (
                    <div className="relative w-16 h-16 ml-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 group">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => setImagePreview(null)} className="absolute inset-0 m-auto w-6 h-6 bg-slate-900/60 hover:bg-rose-500 text-white flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-1.5">
                    <div className="flex items-center gap-1 mb-0.5 ml-0.5 shrink-0">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAiLoading} className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm active:scale-95 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]" aria-label="Dinh kem anh"><ImageIcon className="w-4.5 h-4.5" /></button>
                        <button type="button" onClick={handleMicClick} disabled={isAiLoading} className={`w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 disabled:opacity-50 [-webkit-tap-highlight-color:transparent] ${isListening ? 'text-red-500 border-red-200 bg-red-50 animate-pulse' : 'text-slate-500 hover:text-blue-600'}`} aria-label="Nhap bang giong noi"><Mic className="w-4.5 h-4.5" /></button>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    <textarea ref={textareaRef} value={inputText || ''} rows={1} placeholder={isListening ? '\u0110ang nghe...' : 'Nh\u1eadp y\u00eau c\u1ea7u...'} disabled={isAiLoading} className="min-w-0 flex-1 bg-transparent border-none px-1.5 py-2.5 text-[13px] font-semibold outline-none resize-none max-h-32 min-h-[40px] text-slate-800 placeholder:text-slate-400 no-scrollbar disabled:opacity-50" onKeyDown={onEnterPress} onPaste={handlePaste} onChange={(e) => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                    <button type="button" onClick={() => handleSubmit()} disabled={isAiLoading || (!inputText?.trim() && !imagePreview)} className="w-9 h-9 mb-0.5 mr-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:bg-slate-300 [-webkit-tap-highlight-color:transparent]" aria-label="Gui"><Send className="w-4 h-4 ml-0.5" /></button>
                </div>
            </div>
        </div>
    );
};

export default AiChatInput;
