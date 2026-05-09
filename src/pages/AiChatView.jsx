import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Send, Sparkles, Bot, User, Trash2, Copy, CheckCircle2, Image as ImageIcon, X, Mic, Zap } from 'lucide-react';
import { api } from '../services/api';

const INITIAL_MSG = [{
    role: 'assistant',
    text: 'Chào bạn! Tôi là trợ lý AI. Hệ thống đang sẵn sàng. Bạn có thể hỏi tôi để phân tích dữ liệu hoặc chọn thao tác nhanh dưới đây:',
    actions: [
        { code: 'FAST_INPUT', label: 'Nhập siêu tốc AI' },
        { code: 'ADD_TRANSACTION', label: 'Ghi sổ thu chi' },
        { code: 'VIEW_FUNDS', label: 'Xem sổ quỹ' },
        { code: 'METER_INPUT', label: 'Chốt điện nước' },
        { code: 'VIEW_BILLS', label: 'Quản lý hóa đơn' },
        { code: 'ADD_ROOM', label: 'Thêm phòng mới' },
        { code: 'ADD_SAVING', label: 'Sổ tiết kiệm' }
    ]
}];

const AiChatView = ({ aiMessages, isAiLoading, handleAiChat, setAiMessages, requestConfirm, showToast, executeAiAction }) => {
    const messagesEndRef = useRef(null);
    const hasFetched = useRef(false);
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const SUGGESTIONS = [
        "Phân tích thu chi tháng này",
        "Có phòng nào sắp hết hạn hợp đồng?",
        "Viết thông báo nhắc đóng tiền",
        "Báo cáo tỷ lệ lấp đầy"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [aiMessages, isAiLoading]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (hasFetched.current) return;
            hasFetched.current = true;
            try {
                const history = await api.get('/ai/chat');
                if (history && Array.isArray(history) && history.length > 0) {
                    // Biến đổi cấu trúc API ({ prompt, response }) thành mảng tin nhắn [{ role, text }]
                    const mappedHistory = history.flatMap(item => [
                        { role: 'user', text: item.prompt },
                        { role: 'assistant', text: item.response }
                    ]);
                    if (setAiMessages) {
                        setAiMessages([...INITIAL_MSG, ...mappedHistory]);
                    }
                }
            } catch (error) {
                hasFetched.current = false;
                console.error("Lỗi tải lịch sử chat:", error);
            }
        };

        if (aiMessages.length === 1) {
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopy = (htmlText, index) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlText;
        const plainText = tempDiv.innerText || tempDiv.textContent;
        navigator.clipboard.writeText(plainText).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
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
            submitChat();
        }
    };

    const handleMicClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (showToast) showToast("Trình duyệt không hỗ trợ nhận diện giọng nói", "error");
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
            if (showToast) showToast("Đang nghe... Hãy nói yêu cầu của bạn", "success");
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => prev ? prev + " " + transcript : transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const submitChat = (textOverride = null) => {
        const textToSubmit = textOverride !== null ? textOverride : inputText;
        if ((!textToSubmit.trim() && !imagePreview) || isAiLoading) return;

        handleAiChat(textToSubmit, imagePreview);
        setInputText('');
        setImagePreview(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const clearChat = async () => {
        const performDelete = async () => {
            try {
                await api.delete('/ai/chat');
                if (setAiMessages) setAiMessages(INITIAL_MSG);
                if (showToast) showToast("Đã xóa lịch sử trò chuyện!", "success");
            } catch (error) {
                if (showToast) showToast("Lỗi xóa lịch sử chat: " + error.message, "error");
            }
        };

        if (requestConfirm) {
            const confirmed = await requestConfirm({
                title: 'Xóa lịch sử trò chuyện',
                message: 'Bạn có chắc chắn muốn xóa toàn bộ đoạn hội thoại với AI không?'
            });
            if (confirmed) {
                await performDelete();
            }
        } else if (window.confirm("Bạn có chắc muốn xóa lịch sử trò chuyện?")) {
            await performDelete();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] -mx-4 -mt-2 -mb-32 bg-slate-50 overflow-hidden animate-in fade-in duration-300 relative z-10 border-t border-slate-200">

            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Trợ lý AI</h2>
                        <p className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sẵn sàng phân tích
                        </p>
                    </div>
                </div>
                {setAiMessages && aiMessages.length > 1 && (
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 hover:border-rose-200 shadow-sm"
                        title="Xóa lịch sử trò chuyện"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa Chat
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar pb-6 scroll-smooth">
                {aiMessages.map((msg, i) => (
                    <React.Fragment key={i}>
                        <div className={`flex gap-3 message-appear w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {/* Avatar AI (Trái) */}
                            {msg.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                    <Bot className="w-4 h-4" />
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`max-w-[88%] rounded-2xl p-3 text-[14px] leading-relaxed shadow-sm relative group ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-600/20 font-medium text-left'
                                : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                                }`}>

                                {/* Nút Copy cho AI */}
                                {msg.role === 'assistant' && (
                                    <button
                                        onClick={() => handleCopy(msg.text, i)}
                                        className="absolute -top-3 -right-3 p-1.5 bg-white shadow-sm border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Copy nội dung"
                                    >
                                        {copiedIndex === i ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                )}

                                {/* Hiển thị ảnh nếu có */}
                                {msg.image && (
                                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20 bg-black/5">
                                        <img src={msg.image} alt="Attached" className="max-w-full h-auto object-contain max-h-48" />
                                    </div>
                                )}

                                {msg.role === 'assistant' ? (
                                    <div
                                        className="ai-html-content"
                                        dangerouslySetInnerHTML={{ __html: msg.text }}
                                    />
                                ) : (
                                    msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>
                                )}
                            </div>

                            {/* Avatar User (Phải) */}
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-slate-200 text-slate-500">
                                    <User className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        {/* Smart Actions / Quick Actions */}
                        {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 pl-11 pr-4 message-appear">
                                <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thao tác nhanh:</p>
                                {msg.actions.map((act, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => executeAiAction && executeAiAction(act.code)}
                                        className="bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-[11px] font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Hiển thị Gợi ý nếu mới chỉ có 1 lời chào */}
                        {
                            aiMessages.length === 1 && i === 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 px-2">
                                    {SUGGESTIONS.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => submitChat(s)}
                                            className="bg-white border border-slate-200 text-blue-600 px-3.5 py-2.5 rounded-xl text-[12px] font-bold shadow-sm hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all text-left flex-1 min-w-[45%]"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )
                        }
                    </React.Fragment>
                ))}

                {isAiLoading && (
                    <div className="flex gap-3 justify-start items-end message-appear">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-[12px] font-semibold text-slate-500">AI đang suy nghĩ...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 pb-6 bg-white border-t border-slate-100 shrink-0 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className={`relative flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm ${imagePreview ? 'pt-2.5' : ''}`}>

                    {/* Image Preview Box */}
                    {imagePreview && (
                        <div className="relative w-16 h-16 ml-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setImagePreview(null)}
                                className="absolute inset-0 m-auto w-6 h-6 bg-slate-900/60 hover:bg-rose-500 text-white flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <div className="flex items-center gap-1 mb-0.5 ml-0.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAiLoading}
                                className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 shadow-sm active:scale-95"
                                title="Đính kèm ảnh"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleMicClick}
                                disabled={isAiLoading}
                                className={`w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50 shadow-sm active:scale-95 ${isListening ? 'text-red-500 border-red-200 bg-red-50 animate-pulse' : 'text-slate-500 hover:text-blue-600'}`}
                                title="Nhập bằng giọng nói"
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            rows={1}
                            placeholder={isListening ? "Đang nghe..." : "Nhập yêu cầu, dán ảnh (Ctrl+V)..."}
                            disabled={isAiLoading}
                            className="flex-1 bg-transparent border-none px-2 py-2.5 text-[13px] font-semibold outline-none resize-none max-h-32 min-h-[40px] text-slate-800 placeholder:text-slate-400 no-scrollbar disabled:opacity-50"
                            onKeyDown={onEnterPress}
                            onPaste={handlePaste}
                            onChange={(e) => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        />
                        <button type="button" onClick={() => submitChat()} disabled={isAiLoading || (!inputText.trim() && !imagePreview)} className="w-10 h-10 mb-0.5 mr-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:bg-slate-300 shadow-sm active:scale-95">
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom CSS for AI HTML Content & Animations */}
            <style>{`
                .ai-html-content { font-family: inherit; word-wrap: break-word; line-height: 1.6; color: #334155; }
                .ai-html-content p { margin-bottom: 0.75rem; }
                .ai-html-content p:last-child { margin-bottom: 0; }
                .ai-html-content strong, .ai-html-content b { color: #0f172a; font-weight: 700; }
                
                /* Heading */
                .ai-html-content h1, .ai-html-content h2, .ai-html-content h3, .ai-html-content h4 { color: #0f172a; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; line-height: 1.3; letter-spacing: -0.02em; }
                .ai-html-content h1 { font-size: 1.5rem; }
                .ai-html-content h2 { font-size: 1.25rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
                .ai-html-content h3 { font-size: 1.125rem; }
                
                /* Lists */
                .ai-html-content ul { list-style-type: none; padding-left: 1rem; margin-bottom: 1rem; }
                .ai-html-content ul li { position: relative; margin-bottom: 0.375rem; padding-left: 0.25rem; }
                .ai-html-content ul li::before { content: ''; position: absolute; left: -1rem; top: 0.6rem; width: 0.375rem; height: 0.375rem; background-color: #3b82f6; border-radius: 50%; box-shadow: 0 0 0 2px #eff6ff; }
                .ai-html-content ul ul { margin-bottom: 0; margin-top: 0.375rem; }
                .ai-html-content ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 1rem; }
                .ai-html-content ol li { margin-bottom: 0.375rem; padding-left: 0.25rem; }
                .ai-html-content ol li::marker { color: #3b82f6; font-weight: 700; font-size: 0.9em; }
                
                /* Links */
                .ai-html-content a { color: #2563eb; text-decoration: none; font-weight: 600; box-shadow: inset 0 -2px 0 0 #bfdbfe; transition: all 0.2s ease; padding: 0 0.1rem; }
                .ai-html-content a:hover { color: #1d4ed8; box-shadow: inset 0 -1.5em 0 0 #bfdbfe; border-radius: 0.2rem; }
                
                /* Bảng cực kỳ chuyên nghiệp */
                .ai-html-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 1rem; font-size: 0.85rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
                .ai-html-content th, .ai-html-content td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .ai-html-content th:not(:last-child), .ai-html-content td:not(:last-child) { border-right: 1px solid #e2e8f0; }
                .ai-html-content tr:last-child td { border-bottom: none; }
                .ai-html-content th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
                .ai-html-content tr:nth-child(even) td { background-color: #f8fafc/30; }
                .ai-html-content tr:hover td { background-color: #f1f5f9; transition: background-color 0.15s ease; }
                
                /* Code & Trích dẫn */
                .ai-html-content code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.375rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; color: #d946ef; border: 1px solid #e2e8f0; }
                .ai-html-content pre { background-color: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #1e293b; line-height: 1.5; }
                .ai-html-content pre code { background-color: transparent; color: #f8fafc; padding: 0; border: none; font-size: 0.85em; }
                .ai-html-content blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; color: #475569; font-style: italic; margin-bottom: 1rem; background: linear-gradient(to right, #eff6ff, rgba(239, 246, 255, 0.2)); padding-top: 0.5rem; padding-bottom: 0.5rem; border-radius: 0 0.5rem 0.5rem 0; }
                
                /* Dải phân cách */
                .ai-html-content hr { border: none; height: 2px; background: linear-gradient(to right, transparent, #cbd5e1, transparent); margin: 2rem 0; opacity: 0.6; }
                
                .message-appear { animation: slideUpFade 0.4s ease-out forwards; }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div >
    );
};

export default AiChatView;