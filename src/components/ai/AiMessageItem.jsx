import React, { useState } from 'react';
import { Bot, User, Copy, CheckCircle2, Zap } from 'lucide-react';

const AiMessageItem = ({ msg, isFirstMessage, executeAiAction, onSuggestionClick }) => {
    const [copied, setCopied] = useState(false);

    const SUGGESTIONS = [
        "Phân tích thu chi tháng này",
        "Có phòng nào sắp hết hạn hợp đồng?",
        "Viết thông báo nhắc đóng tiền",
        "Báo cáo tỷ lệ lấp đầy"
    ];

    const handleCopy = (htmlText) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlText;
        const plainText = tempDiv.innerText || tempDiv.textContent;
        navigator.clipboard.writeText(plainText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <React.Fragment>
            <div className={`flex gap-3 message-appear w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                        <Bot className="w-4 h-4" />
                    </div>
                )}

                <div className={`max-w-[88%] rounded-2xl p-3 text-[14px] leading-relaxed shadow-sm relative group ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-600/20 font-medium text-left'
                    : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                    }`}>

                    {msg.role === 'assistant' && (
                        <button onClick={() => handleCopy(msg.text)} className="absolute -top-3 -right-3 p-1.5 bg-white shadow-sm border border-slate-200 rounded-full text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all z-10" title="Copy nội dung">
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {msg.image && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/20 bg-black/5">
                            <img src={msg.image} alt="Attached" className="max-w-full h-auto object-contain max-h-48" />
                        </div>
                    )}

                    {msg.role === 'assistant' ? (
                        <div className="ai-html-content" dangerouslySetInnerHTML={{ __html: msg.text || '' }} />
                    ) : (
                        msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                </div>

                {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-slate-200 text-slate-500">
                        <User className="w-4 h-4" />
                    </div>
                )}
            </div>

            {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 pl-11 pr-4 message-appear">
                    <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thao tác nhanh:</p>
                    {msg.actions.map((act, idx) => (
                        <button key={idx} onClick={() => executeAiAction && executeAiAction(act.code)} className="bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-[11px] font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            {act.label}
                        </button>
                    ))}
                </div>
            )}

            {isFirstMessage && (
                <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 px-2">
                    {SUGGESTIONS.map((s, idx) => (
                        <button key={idx} onClick={() => onSuggestionClick(s)} className="bg-white border border-slate-200 text-blue-600 px-3.5 py-2.5 rounded-xl text-[12px] font-bold shadow-sm hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all text-left flex-1 min-w-[45%]">
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </React.Fragment>
    );
};

export default AiMessageItem;