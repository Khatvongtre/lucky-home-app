import React, { useState, useEffect } from 'react';
import { CircleDollarSign, PieChart, Plus, TrendingDown, TrendingUp, Wallet, ChevronRight, GraduationCap, HeartHandshake, Plane, X, Settings2, Trash2, ChevronDown, Check, LayoutGrid, List, Search } from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';

const ICONS = { Wallet, TrendingUp, PieChart, GraduationCap, Plane, HeartHandshake };

const COLOR_PALETTES = [
    { color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', iconName: 'Wallet' },
    { color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', iconName: 'TrendingUp' },
    { color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', iconName: 'PieChart' },
    { color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', iconName: 'GraduationCap' },
    { color: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-50', iconName: 'Plane' },
    { color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', iconName: 'HeartHandshake' },
    { color: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50', iconName: 'PieChart' },
    { color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', iconName: 'Wallet' },
];

const BORDER_BY_TEXT = {
    'text-blue-600': 'border-blue-200',
    'text-emerald-600': 'border-emerald-200',
    'text-purple-600': 'border-purple-200',
    'text-amber-600': 'border-amber-200',
    'text-pink-600': 'border-pink-200',
    'text-rose-600': 'border-rose-200',
    'text-teal-600': 'border-teal-200',
    'text-indigo-600': 'border-indigo-200',
    'text-slate-500': 'border-slate-200',
};

const getJarBorder = (jar) => BORDER_BY_TEXT[jar.text] || 'border-slate-200';

const INITIAL_JARS = [
    { id: 1, name: 'Thiết yếu', percent: 55, balance: 0, color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', iconName: 'Wallet' },
    { id: 2, name: 'Tiết kiệm', percent: 10, balance: 0, color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', iconName: 'TrendingUp' },
    { id: 3, name: 'Đầu tư', percent: 10, balance: 0, color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', iconName: 'PieChart' },
    { id: 4, name: 'Giáo dục', percent: 10, balance: 0, color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', iconName: 'GraduationCap' },
    { id: 5, name: 'Hưởng thụ', percent: 10, balance: 0, color: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-50', iconName: 'Plane' },
    { id: 6, name: 'Cho đi', percent: 5, balance: 0, color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', iconName: 'HeartHandshake' },
];

const ExpenseTrackerView = ({ showToast = () => { }, requestConfirm = async () => window.confirm("Xác nhận?") }) => {
    const [jars, setJars] = useState(() => {
        try {
            const saved = localStorage.getItem('lucky_jars');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return INITIAL_JARS;
    });

    const [transactions, setTransactions] = useState(() => {
        try {
            const saved = localStorage.getItem('lucky_jars_txs');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return [];
    });

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [txType, setTxType] = useState('in');
    const [txForm, setTxForm] = useState({ amount: '', note: '', jarId: 1, isAutoDistribute: true });
    const [isJarDropdownOpen, setIsJarDropdownOpen] = useState(false);

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [tempJars, setTempJars] = useState([]);
    const [simulatedIncome, setSimulatedIncome] = useState(10000000);
    const [viewMode, setViewMode] = useState('grid');
    const [activePanel, setActivePanel] = useState('jars');
    const [isFundCardExpanded, setIsFundCardExpanded] = useState(true);
    const [isAllocationVisible, setIsAllocationVisible] = useState(true);

    // Bộ lọc tháng cho Lịch sử giao dịch
    const [selectedMonth, setSelectedMonth] = useState('this-month');
    const [txFilter, setTxFilter] = useState('all');
    const [txSearch, setTxSearch] = useState('');
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const monthLabels = { 'this-month': 'Tháng này', 'last-month': 'Tháng trước', 'all': 'Tất cả' };
    const txFilterLabels = { all: 'Tất cả', in: 'Thu', out: 'Chi' };

    useEffect(() => {
        localStorage.setItem('lucky_jars', JSON.stringify(jars));
    }, [jars]);

    useEffect(() => {
        localStorage.setItem('lucky_jars_txs', JSON.stringify(transactions));
    }, [transactions]);

    // Lắng nghe sự kiện từ Nút + của Header
    useEffect(() => {
        const handleOpenModal = () => openTxModal('out');
        window.addEventListener('openExpenseModal', handleOpenModal);
        return () => window.removeEventListener('openExpenseModal', handleOpenModal);
    }, []);

    const totalBalance = jars.reduce((sum, jar) => sum + jar.balance, 0);
    const totalIncome = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

    const openTxModal = (type) => {
        if (jars.length === 0) return showToast("Bạn chưa có hũ nào để giao dịch!", "error");
        setTxType(type);
        setTxForm({ amount: '', note: '', jarId: jars[0].id, isAutoDistribute: type === 'in' });
        setIsTxModalOpen(true);
    };

    const handleSaveTx = (e) => {
        e.preventDefault();
        const amount = parseN(txForm.amount);
        if (!amount || amount <= 0) return showToast("Vui lòng nhập số tiền hợp lệ lớn hơn 0", "error");

        let newTxs = [];
        let updatedJars = [...jars];

        try {
            if (txType === 'in') {
                if (txForm.isAutoDistribute) {
                    let remaining = amount;
                    updatedJars = jars.map((j, index) => {
                        let added = Math.round(amount * (j.percent / 100));
                        if (index === jars.length - 1) added = remaining; // Bù trừ sai số làm tròn vào hũ cuối
                        remaining -= added;

                        if (added > 0) {
                            newTxs.push({ id: crypto.randomUUID(), type: 'in', amount: added, jarId: j.id, date: new Date().toISOString(), note: txForm.note || `Phân bổ tự động (${j.percent}%)` });
                        }
                        return { ...j, balance: j.balance + added };
                    });
                } else {
                    updatedJars = jars.map(j => {
                        if (j.id === Number(txForm.jarId)) {
                            newTxs.push({ id: crypto.randomUUID(), type: 'in', amount: amount, jarId: j.id, date: new Date().toISOString(), note: txForm.note || `Nạp tiền hũ ${j.name}` });
                            return { ...j, balance: j.balance + amount };
                        }
                        return j;
                    });
                }
            } else {
                updatedJars = jars.map(j => {
                    if (j.id === Number(txForm.jarId)) {
                        if (j.balance < amount) {
                            showToast(`Hũ ${j.name} không đủ số dư! (Còn ${formatN(j.balance)}đ)`, "error");
                            throw new Error("Không đủ số dư");
                        }
                        newTxs.push({ id: crypto.randomUUID(), type: 'out', amount: amount, jarId: j.id, date: new Date().toISOString(), note: txForm.note || `Chi tiêu hũ ${j.name}` });
                        return { ...j, balance: j.balance - amount };
                    }
                    return j;
                });
            }

            setJars(updatedJars);
            setTransactions(prev => [...newTxs, ...prev]);
            setIsTxModalOpen(false);
            showToast(txType === 'in' ? "Đã ghi nhận nạp tiền!" : "Đã ghi nhận chi tiêu!", "success");
        } catch (e) { console.log(e); }
    };

    const openSettings = () => {
        setTempJars([...jars]);
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = () => {
        const totalPercent = Number(tempJars.reduce((sum, j) => sum + Number(j.percent || 0), 0).toFixed(1));
        if (totalPercent !== 100) {
            return showToast(`Tổng tỉ lệ phân bổ phải đúng bằng 100% (Hiện tại: ${totalPercent}%)`, "error");
        }
        setJars(tempJars.map(j => ({ ...j, percent: Number(j.percent || 0) })));
        setIsSettingsModalOpen(false);
        showToast("Đã lưu thiết lập Hũ!", "success");
    };

    const handleAddJar = () => {
        const newId = tempJars.length > 0 ? Math.max(...tempJars.map(j => j.id)) + 1 : 1;
        const palette = COLOR_PALETTES[tempJars.length % COLOR_PALETTES.length];
        setTempJars([...tempJars, {
            id: newId,
            name: 'Hũ mới',
            percent: 0,
            balance: 0,
            ...palette
        }]);
    };

    const handleRemoveTempJar = async (id) => {
        const jarToDelete = tempJars.find(j => j.id === id);
        if (jarToDelete && jarToDelete.balance > 0) {
            const confirmed = await requestConfirm({
                title: 'Xác nhận xóa hũ',
                message: `Hũ "${jarToDelete.name}" đang có số dư ${formatN(jarToDelete.balance)}đ. Bạn có chắc muốn xóa và làm mất số dư này?`
            });
            if (!confirmed) {
                return;
            }
        }
        setTempJars(tempJars.filter(j => j.id !== id));
    };

    const handleDeleteTx = async (txId) => {
        const confirmed = await requestConfirm({
            title: 'Xóa giao dịch',
            message: 'Bạn có chắc muốn xóa giao dịch này? Số dư sẽ được tự động hoàn lại.'
        });
        if (!confirmed) return;

        const tx = transactions.find(t => t.id === txId);
        if (!tx) return;

        let updatedJars = jars.map(j => {
            if (j.id === tx.jarId) {
                return { ...j, balance: tx.type === 'in' ? j.balance - tx.amount : j.balance + tx.amount };
            }
            return j;
        });

        setJars(updatedJars);
        setTransactions(transactions.filter(t => t.id !== txId));
        showToast("Đã xóa giao dịch và hoàn lại số dư!", "success");
    };

    const monthFilteredTransactions = transactions.filter(t => {
        if (selectedMonth === 'all') return true;
        const txDate = new Date(t.date);
        const now = new Date();
        if (selectedMonth === 'this-month') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }
        if (selectedMonth === 'last-month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
        }
        return true;
    });

    const normalizedTxSearch = txSearch.trim().toLowerCase();
    const currentTransactions = monthFilteredTransactions.filter(t => {
        if (txFilter !== 'all' && t.type !== txFilter) return false;
        if (!normalizedTxSearch) return true;
        const jar = jars.find(j => j.id === t.jarId);
        const haystack = `${t.note || ''} ${jar?.name || ''} ${formatN(t.amount)} ${t.amount}`.toLowerCase();
        return haystack.includes(normalizedTxSearch);
    });
    const jarStats = transactions.reduce((stats, tx) => {
        const current = stats[tx.jarId] || { initial: 0, spent: 0 };
        if (tx.type === 'in') current.initial += tx.amount;
        if (tx.type === 'out') current.spent += tx.amount;
        stats[tx.jarId] = current;
        return stats;
    }, {});
    const topJar = jars.reduce((top, jar) => jar.balance > (top?.balance || 0) ? jar : top, null);
    const jarSegments = jars
        .filter(jar => jar.balance > 0)
        .map(jar => ({
            ...jar,
            share: totalBalance > 0 ? Math.max((jar.balance / totalBalance) * 100, 4) : 0
        }));

    const formatDateLabel = (dateString) => {
        const txDate = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const isSameDay = (a, b) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
        if (isSameDay(txDate, today)) return 'Hôm nay';
        if (isSameDay(txDate, yesterday)) return 'Hôm qua';
        return txDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
    };

    const transactionGroups = currentTransactions.slice(0, 30).reduce((groups, tx) => {
        const txDate = new Date(tx.date);
        const key = `${txDate.getFullYear()}-${txDate.getMonth()}-${txDate.getDate()}`;
        if (!groups[key]) {
            groups[key] = {
                label: formatDateLabel(tx.date),
                totalIn: 0,
                totalOut: 0,
                items: []
            };
        }
        groups[key].items.push(tx);
        if (tx.type === 'in') groups[key].totalIn += tx.amount;
        if (tx.type === 'out') groups[key].totalOut += tx.amount;
        return groups;
    }, {});

    return (
        <div className="p-1 space-y-3 animate-in fade-in duration-500 pb-20">
            {/* Card Tổng Quỹ */}
            <div className="sticky top-0 z-40 bg-slate-50 pb-2 pt-2 -mt-2 -mx-4 px-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-4 text-white shadow-xl shadow-slate-900/15 relative overflow-hidden">
                    <div className="absolute -right-7 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                    <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
                        <CircleDollarSign className="w-24 h-24 transform rotate-12" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80">Tổng quỹ hiện tại</p>
                                <h2 className="text-[30px] font-black text-white mt-1 tabular-nums tracking-tight leading-none">
                                    {formatN(totalBalance)} <span className="text-base text-indigo-200 font-bold ml-1">đ</span>
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFundCardExpanded(!isFundCardExpanded)}
                                className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-indigo-100 transition-all hover:bg-white/15 active:scale-95"
                                aria-label="Thu mở tổng quỹ"
                            >
                                <ChevronDown className={`w-5 h-5 transition-transform ${isFundCardExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        {isFundCardExpanded && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2">
                                        <div className="flex items-center gap-1.5 text-emerald-200">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            <p className="text-[8px] font-black uppercase tracking-widest">Tổng nạp</p>
                                        </div>
                                        <p className="mt-1 text-[13px] font-black text-emerald-100 tabular-nums">{formatN(totalIncome)}đ</p>
                                    </div>
                                    <div className="rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2">
                                        <div className="flex items-center gap-1.5 text-rose-200">
                                            <TrendingDown className="w-3.5 h-3.5" />
                                            <p className="text-[8px] font-black uppercase tracking-widest">Tổng chi</p>
                                        </div>
                                        <p className="mt-1 text-[13px] font-black text-rose-100 tabular-nums">{formatN(totalExpense)}đ</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openTxModal('in')} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                                        <TrendingUp className="w-4 h-4" /> Nạp Tiền
                                    </button>
                                    <button onClick={() => openTxModal('out')} className="flex-1 bg-white/10 hover:bg-white/20 text-indigo-50 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/10 active:scale-95">
                                        <TrendingDown className="w-4 h-4" /> Chi Tiêu
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                    type="button"
                    onClick={() => setActivePanel('jars')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activePanel === 'jars' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Hũ chi tiêu
                </button>
                <button
                    type="button"
                    onClick={() => setActivePanel('history')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activePanel === 'history' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700'}`}
                >
                    <Wallet className="w-4 h-4" />
                    Lịch sử
                </button>
            </div>

            {/* Jars Section */}
            {activePanel === 'jars' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setActivePanel('jars')}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99] transition-all"
                            >
                                <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
                                    <LayoutGrid className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[14px] font-black text-violet-950 uppercase tracking-tight truncate">Hũ chi tiêu</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{jars.length} hũ tài chính</p>
                                </div>
                            </button>
                            <div className="hidden sm:block rounded-lg bg-white/85 px-3 py-2 text-right shadow-sm">
                                <p className="text-[8px] font-black uppercase tracking-widest text-violet-400">Tổng</p>
                                <p className="text-[12px] font-black text-violet-700 tabular-nums">{formatN(totalBalance)}đ</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsAllocationVisible(!isAllocationVisible)}
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors active:scale-95 ${isAllocationVisible ? 'bg-violet-600 border-violet-600 text-white shadow-sm' : 'bg-white/85 border-violet-100 text-slate-600 hover:bg-white hover:text-violet-700'}`}
                                    aria-label="Ẩn hiện phân bổ số dư"
                                >
                                    <PieChart className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="w-9 h-9 rounded-lg bg-white/85 border border-violet-100 text-slate-600 flex items-center justify-center hover:bg-white hover:text-violet-700 transition-colors active:scale-95">
                                    {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={openSettings} className="w-9 h-9 rounded-lg bg-white/85 border border-violet-100 text-slate-600 flex items-center justify-center hover:bg-white hover:text-violet-700 transition-colors active:scale-95">
                                    <Settings2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {isAllocationVisible && (
                            <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-2.5 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-violet-900 uppercase tracking-widest">Phân bổ số dư</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{topJar ? `Nhiều nhất: ${topJar.name}` : 'Chưa có số dư trong hũ'}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-xl bg-white/85 border border-violet-100 text-violet-600 flex items-center justify-center shadow-sm shrink-0">
                                        <PieChart className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                    {jarSegments.length === 0 ? (
                                        <div className="h-full w-full bg-slate-200" />
                                    ) : (
                                        jarSegments.map(jar => (
                                            <div
                                                key={jar.id}
                                                className={`h-full ${jar.color}`}
                                                style={{ width: `${jar.share}%` }}
                                            />
                                        ))
                                    )}
                                </div>
                                {jarSegments.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {jarSegments.slice(0, 4).map(jar => (
                                            <span key={jar.id} className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[9px] font-black uppercase text-slate-500 shadow-sm">
                                                <span className={`h-2 w-2 rounded-full ${jar.color}`} />
                                                {jar.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 gap-2">
                                {jars.map(jar => {
                                    const Icon = ICONS[jar.iconName] || Wallet;
                                    const stats = jarStats[jar.id] || { initial: jar.balance, spent: 0 };
                                    const initialAmount = Math.max(stats.initial, jar.balance);
                                    const remainingRate = initialAmount > 0 ? Math.max(0, Math.min(100, (jar.balance / initialAmount) * 100)) : 0;
                                    const isOverLimit = jar.balance < 0;
                                    return (
                                        <div key={jar.id} onClick={() => openTxModal('out')} className={`rounded-xl border p-3 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md ${isOverLimit ? 'bg-rose-50 border-rose-200' : `${jar.bg} ${getJarBorder(jar)}`}`}>
                                            <div className="flex items-start gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg border border-white/90 shadow-sm flex items-center justify-center shrink-0 ${isOverLimit ? 'bg-rose-50' : 'bg-white'}`}>
                                                    <Icon className={`w-4 h-4 ${isOverLimit ? 'text-rose-600' : jar.text}`} strokeWidth={2.5} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[11px] font-black uppercase tracking-widest truncate ${isOverLimit ? 'text-rose-700' : jar.text}`}>{jar.name}</p>
                                                    <div className="mt-1 flex items-center gap-1.5 min-w-0">
                                                        <p className={`min-w-0 truncate text-[9px] font-black tabular-nums ${isOverLimit ? 'text-rose-500' : jar.text}`}>{formatN(initialAmount)}đ</p>
                                                        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-black ${isOverLimit ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{Math.round(remainingRate)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-end justify-between gap-2">
                                                    <span className={`text-[8px] font-black uppercase ${isOverLimit ? 'text-rose-500' : jar.text}`}>Còn lại</span>
                                                    <span className={`text-[13px] font-black tabular-nums tracking-tight ${isOverLimit ? 'text-rose-700' : jar.text}`}>{formatN(jar.balance)}đ</span>
                                                </div>
                                                {isOverLimit && (
                                                    <p className="mt-1 text-[8px] font-black uppercase text-rose-700">
                                                        Quá hạn mức
                                                    </p>
                                                )}
                                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/70">
                                                    <div
                                                        className={`h-full rounded-full ${isOverLimit ? 'bg-rose-500' : jar.color}`}
                                                        style={{ width: `${isOverLimit ? 100 : remainingRate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {jars.map(jar => {
                                    const Icon = ICONS[jar.iconName] || Wallet;
                                    const stats = jarStats[jar.id] || { initial: jar.balance, spent: 0 };
                                    const initialAmount = Math.max(stats.initial, jar.balance);
                                    const remainingRate = initialAmount > 0 ? Math.max(0, Math.min(100, (jar.balance / initialAmount) * 100)) : 0;
                                    return (
                                        <div key={jar.id} onClick={() => openTxModal('out')} className={`${jar.bg} p-2.5 rounded-xl border border-white/70 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md`}>
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg border border-white/90 bg-white/65 flex items-center justify-center shadow-sm shrink-0">
                                                        <Icon className={`w-4.5 h-4.5 ${jar.text}`} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1 truncate">{jar.name}</p>
                                                        <span className="inline-block max-w-[120px] truncate text-[8px] font-black text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50/80">
                                                            {formatN(initialAmount)}đ · {Math.round(remainingRate)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[8px] font-black uppercase text-slate-400">Còn lại</p>
                                                    <p className={`mt-0.5 text-[13px] font-black tabular-nums ${jar.text}`}>{formatN(jar.balance)}đ</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/70">
                                                    <div
                                                        className={`h-full rounded-full ${jar.color}`}
                                                        style={{ width: `${remainingRate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lịch sử giao dịch */}
            {activePanel === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsMonthOpen(!isMonthOpen)}
                                    className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all active:scale-95 hover:text-teal-700"
                                >
                                    {monthLabels[selectedMonth]}
                                    <ChevronDown className={`w-3.5 h-3.5 text-teal-500 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isMonthOpen && (
                                    <div className="absolute left-0 mt-1 w-36 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left">
                                        <div className="p-1">
                                            {Object.keys(monthLabels).map((key) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => { setSelectedMonth(key); setIsMonthOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg mb-0.5 last:mb-0 ${selectedMonth === key ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    <span>{monthLabels[key]}</span>
                                                    {selectedMonth === key && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                {Object.keys(txFilterLabels).map(key => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setTxFilter(key)}
                                        className={`rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${txFilter === key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-teal-700'}`}
                                    >
                                        {txFilterLabels[key]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={txSearch}
                                onChange={e => setTxSearch(e.target.value)}
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-[12px] font-semibold text-slate-700 outline-none shadow-sm transition-all placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                                placeholder="Tìm ghi chú, hũ, số tiền..."
                            />
                            {txSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTxSearch('')}
                                    className="absolute right-2 top-1/2 w-6 h-6 -translate-y-1/2 rounded-lg text-slate-300 hover:bg-slate-50 hover:text-slate-500 flex items-center justify-center"
                                    aria-label="Xóa tìm kiếm"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="max-h-[500px] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {currentTransactions.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                        <Wallet className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Không có giao dịch</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Chưa có dữ liệu cho khoảng thời gian này</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {Object.entries(transactionGroups).map(([groupKey, group]) => (
                                        <div key={groupKey}>
                                            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 py-2">
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{group.label}</p>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {group.items.map(t => {
                                                    const jar = jars.find(j => j.id === t.jarId) || { name: 'Hũ đã xóa', bg: 'bg-slate-100', text: 'text-slate-500', iconName: 'Wallet' };
                                                    const Icon = ICONS[jar.iconName] || Wallet;
                                                    return (
                                                        <div key={t.id} className="group flex items-center justify-between gap-2.5 bg-white px-4 py-3.5 transition-all active:bg-slate-50">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${jar.bg} ${jar.text}`}>
                                                                    <Icon className="w-4.5 h-4.5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[12px] font-bold text-slate-700 leading-tight truncate">{t.note}</p>
                                                                    <div className="mt-1.5 flex items-center gap-2 min-w-0">
                                                                        <span className={`max-w-[120px] truncate text-[9px] font-black uppercase ${jar.text}`}>{jar.name}</span>
                                                                        <span className="h-1 w-1 rounded-full bg-slate-200 shrink-0" />
                                                                        <span className="text-[9px] font-semibold text-slate-400 shrink-0">{new Date(t.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <p className={`font-black text-[13px] tracking-tight tabular-nums ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {t.type === 'in' ? '+' : '-'}{formatN(t.amount)}
                                                                </p>
                                                                <button onClick={() => handleDeleteTx(t.id)} className="w-7 h-7 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center" aria-label="Xóa giao dịch">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* MODALS */}
            {isTxModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTxModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-[14px] font-black text-indigo-900 uppercase tracking-tight">
                                {txType === 'in' ? 'Ghi nhận Thu nhập' : 'Ghi nhận Chi tiêu'}
                            </h3>
                            <button onClick={() => setIsTxModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto no-scrollbar flex-1">
                            <form id="txForm" onSubmit={handleSaveTx} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Số tiền</label>
                                    <div className="relative">
                                        <input type="text" value={txForm.amount} onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setTxForm({ ...txForm, amount: val !== '' ? formatN(Number(val)) : '' });
                                        }} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-lg font-black outline-none focus:bg-white transition-all text-right ${txType === 'in' ? 'text-emerald-600 focus:border-emerald-500' : 'text-rose-600 focus:border-rose-500'}`} placeholder="0" required />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">VNĐ</span>
                                    </div>
                                </div>

                                {txType === 'in' && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-1 mb-2 flex">
                                        <button type="button" onClick={() => setTxForm({ ...txForm, isAutoDistribute: true })} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${txForm.isAutoDistribute ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Phân bổ theo %</button>
                                        <button type="button" onClick={() => setTxForm({ ...txForm, isAutoDistribute: false })} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!txForm.isAutoDistribute ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Chọn hũ</button>
                                    </div>
                                )}

                                {txType === 'in' && txForm.isAutoDistribute && parseN(txForm.amount) > 0 && (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-2 mt-2">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 border-b border-emerald-100 pb-1.5">Dự kiến phân bổ</p>
                                        {jars.map((j) => {
                                            const total = parseN(txForm.amount);
                                            let amountForJar = Math.round(total * (j.percent / 100));
                                            return (
                                                <div key={j.id} className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full ${j.bg} border border-slate-300`}></span>
                                                        {j.name} <span className="text-[9px] text-slate-400">({j.percent}%)</span>
                                                    </span>
                                                    <span className="text-[11px] font-black text-emerald-600">+{formatN(amountForJar)}đ</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {(!txForm.isAutoDistribute || txType === 'out') && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Chọn Hũ</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsJarDropdownOpen(!isJarDropdownOpen)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all flex items-center justify-between"
                                            >
                                                <span className="text-indigo-900">
                                                    {jars.find(j => j.id === txForm.jarId)?.name || 'Chọn hũ'}
                                                    <span className="text-slate-400 font-semibold ml-1">
                                                        (Còn {formatN(jars.find(j => j.id === txForm.jarId)?.balance || 0)}đ)
                                                    </span>
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isJarDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isJarDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsJarDropdownOpen(false)}></div>
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                            {jars.map(j => {
                                                                const Icon = ICONS[j.iconName] || Wallet;
                                                                return (
                                                                    <button key={j.id} type="button" onClick={() => { setTxForm({ ...txForm, jarId: j.id }); setIsJarDropdownOpen(false); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${txForm.jarId === j.id ? 'bg-blue-50/50' : ''}`}>
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${j.bg} ${j.text}`}><Icon className="w-4 h-4" /></div>
                                                                        <div className="text-left flex-1"><p className="text-[11px] font-black text-indigo-900 leading-tight">{j.name}</p><p className="text-[10px] font-bold text-slate-400">Còn {formatN(j.balance)}đ</p></div>
                                                                        {txForm.jarId === j.id && <Check className="w-4 h-4 text-blue-600" />}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Ghi chú (Không bắt buộc)</label>
                                    <input type="text" value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all text-indigo-900" placeholder={txType === 'in' ? "Ví dụ: Lương tháng 5, Thưởng..." : "Ví dụ: Đi siêu thị, Đóng tiền học..."} />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button form="txForm" type="submit" className={`w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${txType === 'in' ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-b-[3px] border-emerald-700' : 'bg-rose-500 hover:bg-rose-400 text-white border-b-[3px] border-rose-700'}`}>
                                {txType === 'in' ? 'Xác nhận Nạp' : 'Xác nhận Chi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSettingsModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-[14px] font-black text-indigo-900 uppercase tracking-tight">Thiết lập tỉ lệ Hũ</h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-4">
                            {/* Thu nhập giả định */}
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block px-1">Nhập số tiền mẫu (VNĐ)</label>
                                <div className="relative">
                                    <input type="text" value={simulatedIncome === '' ? '' : formatN(Number(simulatedIncome))} onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setSimulatedIncome(val !== '' ? Number(val) : '');
                                    }} className="w-full bg-white border border-blue-200 rounded-xl pl-14 pr-4 py-2.5 text-sm font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-right shadow-sm text-blue-700" placeholder="0" />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-[10px] uppercase">MẪU:</span>
                                </div>
                                <p className="text-[9px] text-blue-500 font-semibold mt-1.5 px-1 leading-snug">Nhập số tiền để tự động chia theo %, hoặc sửa số tiền của từng hũ bên dưới để tự tính %.</p>
                            </div>

                            <div className={`border p-3 rounded-xl flex items-center justify-between mb-2 shadow-sm ${Number(tempJars.reduce((s, j) => s + Number(j.percent || 0), 0).toFixed(1)) === 100 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <span className="text-[10px] font-black text-slate-600 uppercase">Tổng phần trăm</span>
                                <span className={`text-sm font-black ${Number(tempJars.reduce((s, j) => s + Number(j.percent || 0), 0).toFixed(1)) === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {Number(tempJars.reduce((s, j) => s + Number(j.percent || 0), 0).toFixed(1))}%
                                </span>
                            </div>
                            <div className="space-y-2">
                                {tempJars.map((j, idx) => (
                                    <div key={j.id} className="flex items-center justify-between gap-1.5">
                                        <div className="flex-1">
                                            <input type="text" value={j.name} onChange={e => {
                                                const newTemp = [...tempJars];
                                                newTemp[idx].name = e.target.value;
                                                setTempJars(newTemp);
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-indigo-900" placeholder="Tên hũ" />
                                        </div>
                                        <div className="w-[90px] relative shrink-0">
                                            <input type="text" value={j.percent === '' ? '' : formatN(Math.round(((simulatedIncome || 0) * (j.percent || 0)) / 100))} onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                const amount = val !== '' ? Number(val) : 0;
                                                const newPercent = (simulatedIncome || 0) > 0 ? (amount / simulatedIncome) * 100 : 0;
                                                const newTemp = [...tempJars];
                                                newTemp[idx].percent = val === '' ? '' : newPercent;
                                                setTempJars(newTemp);
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-2 pr-5 py-2 text-xs font-black outline-none focus:border-blue-600 focus:bg-white text-right transition-all text-indigo-600" placeholder="0" />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">đ</span>
                                        </div>
                                        <div className="w-[60px] relative shrink-0">
                                            <input type="number" value={j.percent === '' ? '' : j.percent} onChange={e => {
                                                const val = e.target.value;
                                                const newTemp = [...tempJars];
                                                newTemp[idx].percent = val === '' ? '' : Number(val);
                                                setTempJars(newTemp);
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-2 pr-4 py-2 text-xs font-black outline-none focus:border-blue-600 focus:bg-white text-center transition-all text-blue-600" placeholder="0" />
                                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">%</span>
                                        </div>
                                        <button onClick={() => handleRemoveTempJar(j.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddJar} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95 bg-white">
                                <Plus className="w-4 h-4" /> Thêm hũ mới
                            </button>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={handleSaveSettings} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95 border-b-[3px] border-blue-800">
                                Lưu thiết lập
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTrackerView;
