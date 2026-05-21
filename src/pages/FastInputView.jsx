import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Loader2, Zap, Camera, CheckCircle2, Pencil, TrendingUp, TrendingDown, Wallet, Delete, Home } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { formatN } from '../utils/formatters';
import { api } from '../services/api';
import { useSwipeBack } from '../hooks/useSwipeBack';

const COMMON_SUGGESTIONS = {
    'Thiết yếu': ['Ăn uống', 'Đi chợ', 'Siêu thị', 'Đổ xăng', 'Tiền điện', 'Tiền nước', 'Cà phê'],
    'Tiết kiệm': ['Gửi tiết kiệm', 'Nuôi heo đất', 'Trích lương'],
    'Đầu tư': ['Mua cổ phiếu', 'Mua vàng', 'Chứng chỉ quỹ', 'Góp vốn'],
    'Giáo dục': ['Học phí', 'Mua sách', 'Khóa học', 'Văn phòng phẩm'],
    'Hưởng thụ': ['Du lịch', 'Xem phim', 'Làm đẹp', 'Spa', 'Mua sắm'],
    'Cho đi': ['Từ thiện', 'Quà tặng', 'Đám cưới', 'Thăm hỏi']
};

const FastInputView = ({ setActiveTab, setIsHubMode, showToast, isStandalone = false }) => {
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [parsedResult, setParsedResult] = useState(null);
    const [funds, setFunds] = useState([]);
    const [activeField, setActiveField] = useState(null);
    const fileInputRef = useRef(null);

    // Xử lý đóng màn hình và dọn dẹp URL
    const handleClose = () => {
        if (window.location.pathname.includes('/chitieu')) {
            window.history.pushState({}, document.title, "/");
        }
        if (isStandalone) {
            setParsedResult(null);
            setInputText('');
            setImagePreview(null);
            return;
        }
        setActiveTab('fund');
    };

    const handleGoHub = () => {
        if (window.location.pathname.includes('/chitieu')) {
            window.history.pushState({}, document.title, "/");
        }
        if (isStandalone) {
            setActiveTab('fund');
            setIsHubMode?.(false);
            return;
        }
        setActiveTab('dashboard');
        setIsHubMode?.(true);
    };

    useEffect(() => {
        let isMounted = true;
        const loadFunds = async () => {
            try {
                const data = await api.get('/funds');
                if (isMounted) setFunds(data || []);
            } catch {
                if (isMounted) setFunds([]);
                showToast("Không thể tải danh sách hũ", "error");
            }
        };
        loadFunds();
        return () => { isMounted = false; };
    }, [showToast]);

    // Tự động mở bàn phím số Numpad nếu số tiền đang trống
    useEffect(() => {
        if (parsedResult && !parsedResult.amount && !activeField) {
            setActiveField('amount');
        }
    }, [activeField, parsedResult]);

    // Xử lý phím bấm trên Numpad ảo
    const handleNumpadClick = (key) => {
        if (key === 'backspace') {
            const currentStr = String(parsedResult.amount || '');
            if (currentStr.length > 1) {
                setParsedResult({ ...parsedResult, amount: Number(currentStr.slice(0, -1)) });
            } else {
                setParsedResult({ ...parsedResult, amount: '' });
            }
        } else if (key === '000') {
            const currentStr = String(parsedResult.amount || '');
            if (currentStr.length > 0 && currentStr.length < 10) {
                setParsedResult({ ...parsedResult, amount: Number(currentStr + '000') });
            }
        } else {
            const currentStr = String(parsedResult.amount || '');
            if (currentStr.length < 12) {
                setParsedResult({ ...parsedResult, amount: Number(currentStr + key) });
            }
        }
    };

    // Xử lý Voice to Text
    const handleMicClick = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                if (isListening) {
                    await SpeechRecognition.stop();
                    setIsListening(false);
                    return;
                }

                const availability = await SpeechRecognition.available();
                if (!availability.available) {
                    showToast("Thiết bị chưa hỗ trợ nhận diện giọng nói", "error");
                    return;
                }

                const permission = await SpeechRecognition.requestPermissions();
                if (!['granted', 'prompt'].includes(permission.speechRecognition)) {
                    showToast("Ứng dụng chưa được cấp quyền micro", "error");
                    return;
                }

                setIsListening(true);
                showToast("Đang nghe... Hãy đọc chi tiêu của bạn", "success");
                const result = await SpeechRecognition.start({
                    language: "vi-VN",
                    maxResults: 1,
                    prompt: "Đọc chi tiêu của bạn",
                    partialResults: false,
                    popup: true,
                });
                const transcript = result.matches?.[0] || '';
                if (transcript) {
                    setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
                }
            } catch (error) {
                showToast(error?.message || "Không nhận diện được giọng nói", "error");
            } finally {
                setIsListening(false);
            }
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return showToast("Trình duyệt không hỗ trợ nhận diện giọng nói", "error");
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
            showToast("Đang nghe... Hãy đọc chi tiêu của bạn", "success");
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

    // Xử lý Upload Ảnh
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Xử lý Dán ảnh từ Clipboard
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

    // Gửi dữ liệu cho AI bóc tách
    const handleAnalyze = async () => {
        if (!inputText && !imagePreview) return showToast("Vui lòng nhập văn bản, giọng nói hoặc ảnh", "error");
        setIsProcessing(true);

        try {
            const payload = {
                text: inputText,
                imageBase64: imagePreview // Đã ở định dạng data:image/...;base64,...
            };

            const res = await api.post('/ai/parse-transaction', payload);

            // Tự động tìm Hũ khớp với gợi ý của AI
            let matchedFundId = funds.length > 0 ? funds[0].id : 1;
            if (res.suggestedFundName) {
                const found = funds.find(f => f.name.toLowerCase() === res.suggestedFundName.toLowerCase());
                if (found) matchedFundId = found.id;
            }

            setParsedResult({
                type: res.type || 'out',
                amount: res.amount || 0,
                note: res.note || inputText || 'Giao dịch bóc tách bằng AI',
                fundId: matchedFundId,
                aiSuggestedFundId: matchedFundId,
                isManual: false
            });
            showToast("AI đã phân tích xong!", "success");
        } catch (error) {
            showToast("Lỗi phân tích AI: " + error.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Lưu giao dịch vào database
    const handleSaveTransaction = async () => {
        if (!parsedResult) return;
        if (!parsedResult.amount || parsedResult.amount <= 0) {
            return showToast("Vui lòng nhập số tiền hợp lệ lớn hơn 0", "error");
        }

        if (parsedResult.type === 'out') {
            const selectedFund = funds.find(f => f.id === parsedResult.fundId);
            if (selectedFund && parsedResult.amount > selectedFund.balance) {
                return showToast(`Hũ ${selectedFund.name} không đủ số dư! (Còn ${formatN(selectedFund.balance)}đ)`, "error");
            }
        }

        try {
            await api.post('/funds/transactions', [parsedResult]);
            showToast("Đã lưu giao dịch thành công!", "success");
            handleClose(); // Quay lại xem kết quả
        } catch (error) {
            showToast("Lỗi lưu: " + error.message, "error");
        }
    };

    const selectedFund = parsedResult ? funds.find(f => f.id === parsedResult.fundId) : null;
    const currentSuggestions = selectedFund?.suggestions || (selectedFund ? COMMON_SUGGESTIONS[selectedFund.name] : null) || ['Ăn uống', 'Mua sắm', 'Hóa đơn', 'Khác'];
    const swipeBackHandlers = useSwipeBack({
        onBack: () => {
            if (activeField) {
                setActiveField(null);
                return;
            }
            if (imagePreview) {
                setImagePreview(null);
                return;
            }
            if (parsedResult) {
                setParsedResult(null);
                return;
            }
            handleClose();
        }
    });

    return (
        <div {...swipeBackHandlers} className="flex-1 bg-slate-900 text-white flex flex-col relative">
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Zap className="w-4 h-4" />
                    </div>
                    <h1 className="text-sm font-black uppercase tracking-widest">AI Nhập Nhanh</h1>
                </div>
                <button onClick={handleClose} className="p-2 bg-white/10 rounded-xl active:scale-95 text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {!parsedResult ? (
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-y-auto no-scrollbar pb-32">
                        {/* AI Graphic/Greeting */}
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                            <Zap className="w-10 h-10 text-blue-400 relative z-10" />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2 tracking-tight">Trợ lý nhập liệu AI</h2>
                        <p className="text-sm text-slate-400 text-center mb-8 font-medium">Dán tin nhắn giao dịch, đọc bằng giọng nói hoặc tải hóa đơn để tự động bóc tách.</p>

                        {/* Input Area */}
                        <div className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-4 flex flex-col focus-within:border-blue-500/50 focus-within:bg-slate-800/80 transition-all shadow-2xl">
                            {imagePreview && (
                                <div className="relative h-40 rounded-2xl overflow-hidden bg-black/50 shrink-0 mb-4 border border-slate-700">
                                    <img src={imagePreview} alt="Receipt" className="w-full h-full object-contain" />
                                    <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-full text-white hover:bg-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                            )}
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onPaste={handlePaste}
                                placeholder="Nhập nội dung, dán ảnh (Ctrl+V)..."
                                className="w-full bg-transparent text-lg font-medium outline-none resize-none placeholder:text-slate-500 text-white min-h-[100px] no-scrollbar"
                            />
                            <div className="flex items-center justify-between border-t border-slate-700 pt-3 mt-1">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-blue-400 transition-all" aria-label="Tải ảnh">
                                        <Camera className="w-5 h-5" />
                                    </button>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

                                    <button onClick={handleMicClick} className={`p-3 rounded-xl transition-all flex items-center gap-2 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-700/50 hover:bg-slate-700 text-blue-400'}`}>
                                        <Mic className="w-5 h-5" />
                                        {isListening && <span className="text-xs font-bold pr-1">Đang nghe...</span>}
                                    </button>
                                </div>
                                <button onClick={handleAnalyze} disabled={isProcessing || (!inputText && !imagePreview)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-sm tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    {isProcessing ? 'Đang xử lý...' : 'Phân tích'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM MANUAL ACTION BAR */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700 p-2 rounded-2xl flex items-center gap-2 shadow-2xl z-40">
                        <button
                            onClick={handleGoHub}
                            className="h-10 w-10 bg-white text-blue-700 rounded-full active:scale-95 flex items-center justify-center shrink-0 [-webkit-tap-highlight-color:transparent]"
                            aria-label="Về trang chính"
                            title="Về trang chính"
                        >
                            <Home className="w-4 h-4" />
                        </button>
                        <div className="flex flex-1 gap-2 min-w-0">
                            <button onClick={() => setParsedResult({ type: 'in', amount: '', note: '', fundId: funds.length > 0 ? funds[0].id : 1, isManual: true })} className="flex-1 px-2 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl active:scale-95 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors">
                                + Thu
                            </button>
                            <button onClick={() => setParsedResult({ type: 'out', amount: '', note: '', fundId: funds.length > 0 ? funds[0].id : 1, isManual: true })} className="flex-1 px-2 py-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-xl active:scale-95 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors">
                                - Chi
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-slate-50 z-[60] flex flex-col animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-4 text-slate-800 no-scrollbar pb-36 flex flex-col">
                        {/* 1. Thu / Chi Toggle */}
                        <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1.5 shrink-0">
                            <button onClick={() => setParsedResult({ ...parsedResult, type: 'in' })} className={`flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl font-black text-sm transition-all active:scale-95 ${parsedResult.type === 'in' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-transparent text-slate-500 hover:bg-slate-200/50'}`}>
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> Thu Vào
                            </button>
                            <button onClick={() => setParsedResult({ ...parsedResult, type: 'out' })} className={`flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl font-black text-sm transition-all active:scale-95 ${parsedResult.type === 'out' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-transparent text-slate-500 hover:bg-slate-200/50'}`}>
                                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" /> Chi Ra
                            </button>
                        </div>

                        {/* 2. Amount Input Section */}
                        <div
                            className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border relative transition-all cursor-pointer shrink-0 ${activeField === 'amount' ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-100'}`}
                            onClick={() => setActiveField('amount')}
                        >
                            <div className="text-center relative">
                                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Số tiền giao dịch</p>
                                <div className="relative inline-flex items-baseline justify-center w-full min-h-[48px] sm:min-h-[60px]">
                                    <div className={`w-full max-w-[260px] text-center text-5xl sm:text-6xl font-black tracking-tight bg-transparent outline-none transition-colors overflow-hidden truncate ${parsedResult.amount ? (parsedResult.type === 'in' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-300'}`}>
                                        {parsedResult.amount ? formatN(parsedResult.amount) : '0'}
                                    </div>
                                    <span className={`text-2xl sm:text-3xl font-black ml-1 ${parsedResult.type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>đ</span>
                                </div>
                                {parsedResult.amount > 0 && activeField !== 'amount' && (
                                    <button onClick={(e) => { e.stopPropagation(); setParsedResult({ ...parsedResult, amount: '' }); setActiveField('amount'); }} className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3. Fund Selection UI (Vertical Scrollable) */}
                        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
                            <div className="flex items-center justify-between px-2 shrink-0">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                    {parsedResult.type === 'in' ? 'Vào hũ thu nhập' : 'Từ hũ chi tiêu'}
                                </h3>
                                <button onClick={() => setActiveTab('fund')} className="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all shrink-0">
                                    Quản lý hũ
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar pb-2 px-1">
                                {funds.map(f => {
                                    const isSelected = parsedResult.fundId === f.id;
                                    const activeBg = parsedResult.type === 'in' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
                                    const progressColor = parsedResult.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500';

                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setParsedResult({ ...parsedResult, fundId: f.id })}
                                            className={`w-full flex items-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all active:scale-[0.98] ${isSelected ? activeBg + ' shadow-md' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
                                        >
                                            {/* LEFT */}
                                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 mr-3 sm:mr-4 shadow-inner ${f.bg || 'bg-slate-100'} ${f.text || 'text-slate-500'}`}>
                                                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>

                                            {/* CENTER */}
                                            <div className="flex-1 text-left min-w-0 pr-2 sm:pr-4">
                                                <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
                                                    <h4 className={`text-[13px] sm:text-[15px] font-black uppercase truncate ${isSelected ? (parsedResult.type === 'in' ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-800'}`}>
                                                        {f.name}
                                                    </h4>
                                                    {!parsedResult.isManual && parsedResult.aiSuggestedFundId === f.id && isSelected && (
                                                        <span className="shrink-0 text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> AI CHỌN</span>
                                                    )}
                                                </div>
                                                {/* 5. Progress Bar */}
                                                <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${isSelected ? progressColor : 'bg-slate-300'}`} style={{ width: '100%' }}></div>
                                                </div>
                                            </div>

                                            {/* RIGHT */}
                                            <div className="text-right shrink-0">
                                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Còn lại</p>
                                                <p className={`text-[14px] sm:text-base font-black tabular-nums tracking-tight ${isSelected ? (parsedResult.type === 'in' ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-700'}`}>
                                                    {formatN(f.balance)}đ
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 4. Note Input */}
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 shrink-0">
                            <input
                                type="text"
                                value={parsedResult.note || ''}
                                onChange={e => setParsedResult({ ...parsedResult, note: e.target.value })}
                                onFocus={() => setActiveField('note')}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-center text-[14px] font-bold text-slate-700 bg-slate-50 p-3 sm:p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 transition-all placeholder:text-slate-400"
                                placeholder="Thêm ghi chú giao dịch..."
                            />
                            <div className="flex overflow-x-auto gap-2 mt-3 no-scrollbar pb-1">
                                {currentSuggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setParsedResult({ ...parsedResult, note: s });
                                        }}
                                        className="shrink-0 bg-slate-50 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide active:scale-95 transition-all border border-slate-100 focus:border-blue-300 shadow-sm"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {activeField === 'amount' ? (
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl border-t border-slate-200 z-[70] animate-in slide-in-from-bottom-full duration-300 pb-6 pt-4 px-4 sm:px-5">
                            <div className="flex justify-between items-center mb-5 px-1">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    Bàn phím số
                                </span>
                                <button onClick={() => setActiveField(null)} className="text-blue-600 font-black text-[11px] uppercase tracking-widest bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-xl active:scale-95 transition-all">Thu gọn</button>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-3 grid grid-cols-3 gap-3">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'].map(k => (
                                        <button key={k} onClick={() => handleNumpadClick(k)} className="h-14 sm:h-16 bg-white rounded-2xl text-2xl font-black active:scale-95 active:bg-slate-200 transition-all text-slate-800 flex items-center justify-center shadow-sm shadow-slate-200/50">
                                            {k}
                                        </button>
                                    ))}
                                    <button onClick={() => handleNumpadClick('backspace')} className="h-14 sm:h-16 bg-white rounded-2xl flex items-center justify-center active:scale-95 transition-all text-slate-600 shadow-sm shadow-slate-200/50 active:bg-slate-200">
                                        <Delete className="w-7 h-7" />
                                    </button>
                                </div>
                                <div className="col-span-1 flex flex-col gap-3">
                                    <button onClick={() => setParsedResult({ ...parsedResult, amount: '' })} className="h-14 sm:h-16 bg-white rounded-2xl flex items-center justify-center active:scale-95 transition-all text-rose-500 shadow-sm shadow-slate-200/50 font-black text-xs uppercase tracking-widest active:bg-rose-50">
                                        Xóa
                                    </button>
                                    <button onClick={() => setActiveField(null)} className={`flex-1 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-md text-white ${parsedResult.type === 'in' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}>
                                        <CheckCircle2 className="w-8 h-8" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-20 animate-in fade-in duration-300 flex flex-col gap-2">
                            <button
                                onClick={handleSaveTransaction}
                                className={`w-full h-14 text-white rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2 transition-all ${parsedResult.type === 'in' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}
                            >
                                <CheckCircle2 className="w-5 h-5" /> Lưu giao dịch
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleGoHub}
                                    className="h-14 bg-blue-50 text-blue-700 rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 flex items-center justify-center gap-2 transition-all border border-blue-100 shadow-sm [-webkit-tap-highlight-color:transparent]"
                                    aria-label="Về trang chính"
                                >
                                    <Home className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setParsedResult(null)}
                                    className="h-14 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 flex items-center justify-center gap-2 transition-all border border-slate-200 shadow-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FastInputView;


