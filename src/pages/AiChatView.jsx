import React, { useRef, useEffect } from 'react';
import { Loader2, Sparkles, Bot, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import AiMessageItem from '../components/ai/AiMessageItem';
import AiChatInput from '../components/ai/AiChatInput';
import { INITIAL_AI_MESSAGES } from '../utils/aiChat';
import '../styles/AiChat.css';


const AiChatView = ({ aiMessages, isAiLoading, handleAiChat, setAiMessages, requestConfirm, showToast, executeAiAction }) => {
    const messagesEndRef = useRef(null);
    const hasFetched = useRef(false);

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
                        setAiMessages([...INITIAL_AI_MESSAGES, ...mappedHistory]);
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
    }, [aiMessages.length, setAiMessages]);

    const clearChat = async () => {
        const performDelete = async () => {
            try {
                await api.delete('/ai/chat');
                if (setAiMessages) setAiMessages(INITIAL_AI_MESSAGES);
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
                    <AiMessageItem
                        key={i}
                        msg={msg}
                        isFirstMessage={aiMessages.length === 1 && i === 0}
                        executeAiAction={executeAiAction}
                        onSuggestionClick={(text) => handleAiChat(text, null)}
                    />
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

            <AiChatInput
                isAiLoading={isAiLoading}
                onSubmit={(text, img) => handleAiChat(text, img)}
                showToast={showToast}
            />
        </div >
    );
};

export default AiChatView;
