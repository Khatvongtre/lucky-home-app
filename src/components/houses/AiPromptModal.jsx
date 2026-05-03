import React from 'react';
import { Sparkles, Mic } from 'lucide-react';
import Modal from '../common/Modal';

const AiPromptModal = ({
    isAiPromptModalOpen,
    setIsAiPromptModalOpen,
    setIsListening,
    aiFeedback,
    setAiFeedback,
    aiPrompt,
    setAiPrompt,
    handleMicClick,
    isListening,
    handleAiGenerateHouse
}) => {
    if (!isAiPromptModalOpen) return null;

    return (
        <Modal title="TRỢ LÝ AI TẠO NHÀ" onClose={() => { setIsAiPromptModalOpen(false); setIsListening(false); setAiFeedback(""); }}>
            <div className="space-y-4 text-left">
                {aiFeedback && (
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-start space-x-2 animate-in slide-in-from-top-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-black text-indigo-700 leading-snug">{aiFeedback}</p>
                    </div>
                )}
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-xl shadow-inner border border-white/5">
                    <div className="flex flex-col items-center flex-1">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Địa chỉ</p>
                        <div className={`w-full py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${aiPrompt.includes(',') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                            {aiPrompt.split(',')[0].slice(0, 15) || "---"}
                        </div>
                    </div>
                    <div className="flex flex-col items-center px-4 border-x border-white/10">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Số tầng</p>
                        <div className={`px-4 py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${/(\d+)\s*(tầng|tang|tnagf|lầu|lau)/i.test(aiPrompt) ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-600'}`}>
                            {aiPrompt.match(/(\d+)\s*(tầng|tang|tnagf|lầu|lau)/i)?.[1] || "0"}
                        </div>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                        <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Số phòng</p>
                        <div className={`w-full py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${/(\d+)\s*(phòng|phong|p\s|p$)/i.test(aiPrompt) ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-slate-600'}`}>
                            {aiPrompt.match(/(\d+)\s*(phòng|phong|p\s|p$)/i)?.[1] || "0"}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center mb-2">
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> {aiFeedback ? "Bạn hãy bổ sung thêm ở dưới:" : "Bạn muốn tạo nhà thế nào?"}
                    </label>
                    <div className="relative">
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="VD: 180 Nam Dư, Vĩnh Hưng, Hà Nội Nhà 4 tầng 6 phòng giá 3.5tr..."
                            className="w-full p-3.5 pr-12 bg-indigo-50/50 border border-indigo-100 rounded-xl font-bold text-[13px] outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none min-h-[100px] text-slate-700 leading-relaxed shadow-inner"
                        />
                        <button
                            type="button"
                            onClick={handleMicClick}
                            className={`absolute right-2 bottom-2 p-2.5 rounded-xl transition-all shadow-sm ${isListening
                                ? 'bg-red-500 text-white animate-pulse shadow-red-200'
                                : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'
                                }`}
                        >
                            {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    </div>
                    {isListening && <p className="text-[9px] font-bold text-red-500 italic mt-1 text-right animate-pulse">Đang nghe...</p>}
                </div>

                <div className="pt-2 border-t border-dashed border-slate-200">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2.5 tracking-widest">Mẫu thực tế chuyên sâu</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            "180 Nam Dư, Vĩnh Hưng Hà Nội Nhà 4 tầng 6 phòng giá 10.5tr",
                            "Ngõ 10 Cầu Giấy, Nhà 5 lầu 12 phòng, tầng trệt kinh doanh giá 15 củ",
                            "Số 50 Trần Duy Hưng, Nhà 3 tầng 4 phòng, tầng 1 để xe giá 8 triệu"
                        ].map((tpl, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setAiPrompt(tpl)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 active:scale-95 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-left leading-tight"
                            >
                                {tpl}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleAiGenerateHouse}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-indigo-800 text-center mt-4 active:scale-95 transition-all"
                >
                    <Sparkles className="w-4 h-4 text-indigo-100" /> Bắt đầu tạo tự động
                </button>
            </div>
        </Modal>
    );
};

export default AiPromptModal;