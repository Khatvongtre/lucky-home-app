import React from 'react';
import { Loader2, Send } from 'lucide-react';

const AiChatPage = ({ aiMessages, isAiLoading, handleAiChat }) => {
    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar pb-10">
                {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-200' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm whitespace-pre-wrap'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isAiLoading && <div className="flex justify-start"><div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl rounded-bl-none"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div></div>}
            </div>
            <form onSubmit={handleAiChat} className="p-3 bg-white border-t border-slate-100 flex space-x-2">
                <input name="q" placeholder="Hỏi AI Lucky Home..." disabled={isAiLoading} className="flex-1 bg-slate-100 border-none rounded-lg px-3 text-xs font-bold outline-none focus:bg-blue-50 transition-colors" />
                <button type="submit" disabled={isAiLoading} className="p-2.5 bg-blue-600 text-white rounded-lg active:scale-90 flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
        </div>
    );
};

export default AiChatPage;