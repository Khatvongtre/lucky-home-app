import React, { useState, useEffect } from 'react';
import { CircleDollarSign, PieChart, Plus, TrendingDown, TrendingUp, Wallet, ChevronRight, GraduationCap, HeartHandshake, Plane, X, Settings2, Trash2, ChevronDown, Check, LayoutGrid, List, Search, ArrowRightLeft } from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';
import { api } from '../services/api';

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

const getFundBorder = (fund) => BORDER_BY_TEXT[fund.text] || 'border-slate-200';

const FundView = ({ showToast = () => { }, requestConfirm = async () => window.confirm("Xác nhận?") }) => {
    const [funds, setFunds] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [txType, setTxType] = useState('in');
    const [txForm, setTxForm] = useState({ amount: '', note: '', fundId: 1, toFundId: '', isDistribute: false, allocations: {} });
    const [isFundDropdownOpen, setIsFundDropdownOpen] = useState(false);
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false);
    const [isToDropdownOpen, setIsToDropdownOpen] = useState(false);

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [tempFunds, setTempFunds] = useState([]);
    const [viewMode, setViewMode] = useState('grid');
    const [activePanel, setActivePanel] = useState('funds');
    const [isFundCardExpanded, setIsFundCardExpanded] = useState(true);
    const [isAllocationVisible, setIsAllocationVisible] = useState(true);

    // Bộ lọc tháng cho Lịch sử giao dịch
    const [selectedMonth, setSelectedMonth] = useState('this-month');
    const [txFilter, setTxFilter] = useState('all');
    const [txSearch, setTxSearch] = useState('');
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const monthLabels = { 'this-month': 'Tháng này', 'last-month': 'Tháng trước', 'all': 'Tất cả' };
    const txFilterLabels = { all: 'Tất cả', in: 'Thu', out: 'Chi' };

    const loadData = async () => {
        try {
            const [fundsData, txData] = await Promise.all([
                api.get('/funds'),
                api.get('/funds/transactions')
            ]);
            setFunds(fundsData);
            setTransactions(txData);
        } catch (error) {
            console.error(error);
            showToast("Không thể tải dữ liệu sổ chi tiêu", "error");
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totalBalance = funds.reduce((sum, fund) => sum + fund.balance, 0);
    const totalIncome = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

    const fundStats = transactions.reduce((stats, tx) => {
        const current = stats[tx.fundId] || { initial: 0, spent: 0 };
        if (tx.type === 'in') current.initial += tx.amount;
        if (tx.type === 'out') current.spent += tx.amount;
        stats[tx.fundId] = current;
        return stats;
    }, {});

    const openTxModal = (type, defaultFundId = null) => {
        if (funds.length === 0) return showToast("Bạn chưa có hũ nào để giao dịch!", "error");
        setTxType(type);
        const fundIdToSet = defaultFundId || funds[0].id;
        let toFundIdToSet = funds.length > 1 ? funds[1].id : '';
        if (type === 'transfer' && fundIdToSet === toFundIdToSet && funds.length > 1) {
            toFundIdToSet = funds.find(f => f.id !== fundIdToSet)?.id || '';
        }
        setTxForm({ amount: '', note: '', fundId: fundIdToSet, toFundId: toFundIdToSet, isDistribute: false, allocations: {} });
        setIsTxModalOpen(true);
    };

    const handleSaveTx = async (e) => {
        e.preventDefault();
        const amount = parseN(txForm.amount);
        if (!amount || amount <= 0) return showToast("Vui lòng nhập số tiền hợp lệ lớn hơn 0", "error");

        let newTxs = [];

        try {
            if (txType === 'transfer') {
                if (!txForm.toFundId) return showToast("Vui lòng chọn hũ nhận tiền!", "error");
                if (txForm.fundId === txForm.toFundId) return showToast("Hũ chuyển và hũ nhận phải khác nhau!", "error");

                const fromFund = funds.find(f => f.id === Number(txForm.fundId));
                const toFund = funds.find(f => f.id === Number(txForm.toFundId));

                if (fromFund.balance < amount) {
                    return showToast(`Hũ ${fromFund.name} không đủ số dư! (Còn ${formatN(fromFund.balance)}đ)`, "error");
                }

                newTxs.push({ type: 'out', amount: amount, fundId: fromFund.id, note: txForm.note || `Chuyển sang ${toFund.name}` });
                newTxs.push({ type: 'in', amount: amount, fundId: toFund.id, note: txForm.note || `Nhận từ ${fromFund.name}` });
            } else if (txType === 'in') {
                if (txForm.isDistribute) {
                    const totalAllocated = Object.values(txForm.allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
                    if (totalAllocated !== amount) {
                        return showToast(`Tổng số tiền phân bổ (${formatN(totalAllocated)}đ) phải bằng đúng số tiền nạp (${formatN(amount)}đ)!`, "error");
                    }
                    funds.forEach(f => {
                        const allocatedAmount = Number(txForm.allocations[f.id]) || 0;
                        if (allocatedAmount > 0) {
                            newTxs.push({ type: 'in', amount: allocatedAmount, fundId: f.id, note: txForm.note || `Nạp tiền hũ ${f.name}` });
                        }
                    });
                } else {
                    newTxs.push({ type: 'in', amount: amount, fundId: txForm.fundId, note: txForm.note || `Nạp tiền hũ ${funds.find(f => f.id === Number(txForm.fundId))?.name}` });
                }
            } else {
                const fund = funds.find(f => f.id === Number(txForm.fundId));
                if (fund.balance < amount) {
                    return showToast(`Hũ ${fund.name} không đủ số dư! (Còn ${formatN(fund.balance)}đ)`, "error");
                }
                newTxs.push({ type: 'out', amount: amount, fundId: fund.id, note: txForm.note || `Chi tiêu hũ ${fund.name}` });
            }

            if (newTxs.length === 0) return showToast("Không có giao dịch nào được tạo", "error");

            await api.post('/funds/transactions', newTxs);
            await loadData();
            setIsTxModalOpen(false);
            showToast(txType === 'in' ? "Đã ghi nhận nạp tiền!" : txType === 'out' ? "Đã ghi nhận chi tiêu!" : "Đã chuyển tiền thành công!", "success");
        } catch (e) {
            showToast("Lỗi giao dịch: " + e.message, "error");
        }
    };

    const openSettings = () => {
        setTempFunds([...funds]);
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = async () => {
        const payload = tempFunds.map(({ percent, ...f }) => f);
        try {
            const updatedFunds = await api.put('/funds', payload);
            setFunds(updatedFunds);
            setIsSettingsModalOpen(false);
            showToast("Đã lưu thiết lập Hũ!", "success");
        } catch (e) {
            showToast("Lỗi lưu thiết lập: " + e.message, "error");
        }
    };

    const handleAddFund = () => {
        const newId = tempFunds.length > 0 ? Math.max(...tempFunds.map(f => f.id)) + 1 : 1;
        const palette = COLOR_PALETTES[tempFunds.length % COLOR_PALETTES.length];
        setTempFunds([...tempFunds, {
            id: newId,
            name: 'Hũ mới',
            balance: 0,
            ...palette
        }]);
    };

    const handleRemoveTempFund = async (id) => {
        const fundToDelete = tempFunds.find(f => f.id === id);
        if (fundToDelete && fundToDelete.balance > 0) {
            const confirmed = await requestConfirm({
                title: 'Xác nhận xóa hũ',
                message: `Hũ "${fundToDelete.name}" đang có số dư ${formatN(fundToDelete.balance)}đ. Bạn có chắc muốn xóa và làm mất số dư này?`
            });
            if (!confirmed) {
                return;
            }
        }
        setTempFunds(tempFunds.filter(f => f.id !== id));
    };

    const handleDeleteTx = async (txId) => {
        const confirmed = await requestConfirm({
            title: 'Xóa giao dịch',
            message: 'Bạn có chắc muốn xóa giao dịch này? Số dư sẽ được tự động hoàn lại.'
        });
        if (!confirmed) return;

        try {
            await api.delete(`/funds/transactions/${txId}`);
            await loadData();
            showToast("Đã xóa giao dịch và hoàn lại số dư!", "success");
        } catch (e) {
            showToast("Lỗi xóa: " + e.message, "error");
        }
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
        const fund = funds.find(f => f.id === t.fundId);
        const haystack = `${t.note || ''} ${fund?.name || ''} ${formatN(t.amount)} ${t.amount}`.toLowerCase();
        return haystack.includes(normalizedTxSearch);
    });
    const topFund = funds.reduce((top, fund) => fund.balance > (top?.balance || 0) ? fund : top, null);
    const fundSegments = funds
        .filter(fund => fund.balance > 0)
        .map(fund => ({
            ...fund,
            share: totalBalance > 0 ? Math.max((fund.balance / totalBalance) * 100, 4) : 0
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
                                    <button onClick={() => openTxModal('in')} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 active:scale-95">
                                        <TrendingUp className="w-3.5 h-3.5" /> Nạp
                                    </button>
                                    <button onClick={() => openTxModal('out')} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 shadow-lg shadow-rose-500/20 active:scale-95">
                                        <TrendingDown className="w-3.5 h-3.5" /> Chi
                                    </button>
                                    <button onClick={() => openTxModal('transfer')} className="flex-1 bg-white/10 hover:bg-white/20 text-indigo-50 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 backdrop-blur-md border border-white/10 active:scale-95">
                                        <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển
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
                    onClick={() => setActivePanel('funds')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activePanel === 'funds' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'}`}
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

            {/* Funds Section */}
            {activePanel === 'funds' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setActivePanel('funds')}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99] transition-all"
                            >
                                <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
                                    <LayoutGrid className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[14px] font-black text-violet-950 uppercase tracking-tight truncate">Hũ chi tiêu</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{funds.length} hũ tài chính</p>
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
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{topFund ? `Nhiều nhất: ${topFund.name}` : 'Chưa có số dư trong hũ'}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-xl bg-white/85 border border-violet-100 text-violet-600 flex items-center justify-center shadow-sm shrink-0">
                                        <PieChart className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                    {fundSegments.length === 0 ? (
                                        <div className="h-full w-full bg-slate-200" />
                                    ) : (
                                        fundSegments.map(fund => (
                                            <div
                                                key={fund.id}
                                                className={`h-full ${fund.color}`}
                                                style={{ width: `${fund.share}%` }}
                                            />
                                        ))
                                    )}
                                </div>
                                {fundSegments.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {fundSegments.slice(0, 4).map(fund => (
                                            <span key={fund.id} className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[9px] font-black uppercase text-slate-500 shadow-sm">
                                                <span className={`h-2 w-2 rounded-full ${fund.color}`} />
                                                {fund.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 gap-2">
                                {funds.map(fund => {
                                    const Icon = ICONS[fund.iconName] || Wallet;
                                    const isOverLimit = fund.balance < 0;
                                    const stats = fundStats[fund.id] || { initial: fund.balance, spent: 0 };
                                    const initialAmount = Math.max(stats.initial, fund.balance);
                                    const remainingRate = initialAmount > 0 ? Math.max(0, Math.min(100, (fund.balance / initialAmount) * 100)) : 0;
                                    return (
                                        <div key={fund.id} onClick={() => openTxModal('out', fund.id)} className={`rounded-xl border p-3 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md ${isOverLimit ? 'bg-rose-50 border-rose-200' : `${fund.bg} ${getFundBorder(fund)}`}`}>
                                            <div className="flex items-start gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg border border-white/90 shadow-sm flex items-center justify-center shrink-0 ${isOverLimit ? 'bg-rose-50' : 'bg-white'}`}>
                                                    <Icon className={`w-4 h-4 ${isOverLimit ? 'text-rose-600' : fund.text}`} strokeWidth={2.5} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[11px] font-black uppercase tracking-widest truncate ${isOverLimit ? 'text-rose-700' : fund.text}`}>{fund.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 mt-1 truncate">Hạn mức: {formatN(initialAmount)}đ</p>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-end justify-between gap-2">
                                                    <span className={`text-[8px] font-black uppercase ${isOverLimit ? 'text-rose-500' : fund.text}`}>Còn lại</span>
                                                    <span className={`text-[13px] font-black tabular-nums tracking-tight ${isOverLimit ? 'text-rose-700' : fund.text}`}>{formatN(fund.balance)}đ</span>
                                                </div>
                                                {isOverLimit && (
                                                    <p className="mt-1 text-[8px] font-black uppercase text-rose-700">
                                                        Quá hạn mức
                                                    </p>
                                                )}
                                                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/5">
                                                    <div
                                                        className={`h-full rounded-full ${isOverLimit ? 'bg-rose-500' : fund.color}`}
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
                                {funds.map(fund => {
                                    const Icon = ICONS[fund.iconName] || Wallet;
                                    const stats = fundStats[fund.id] || { initial: fund.balance, spent: 0 };
                                    const initialAmount = Math.max(stats.initial, fund.balance);
                                    const remainingRate = initialAmount > 0 ? Math.max(0, Math.min(100, (fund.balance / initialAmount) * 100)) : 0;
                                    const isOverLimit = fund.balance < 0;
                                    return (
                                        <div key={fund.id} onClick={() => openTxModal('out', fund.id)} className={`p-2.5 rounded-xl border shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md ${isOverLimit ? 'bg-rose-50 border-rose-200' : `${fund.bg} ${getFundBorder(fund)}`}`}>
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg border border-white/90 bg-white/65 flex items-center justify-center shadow-sm shrink-0">
                                                        <Icon className={`w-4.5 h-4.5 ${isOverLimit ? 'text-rose-600' : fund.text}`} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1 truncate">{fund.name}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">Hạn mức: {formatN(initialAmount)}đ</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[8px] font-black uppercase text-slate-400">Còn lại</p>
                                                    <p className={`mt-0.5 text-[13px] font-black tabular-nums ${isOverLimit ? 'text-rose-600' : fund.text}`}>{formatN(fund.balance)}đ</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/5">
                                                <div
                                                    className={`h-full rounded-full ${isOverLimit ? 'bg-rose-500' : fund.color}`}
                                                    style={{ width: `${isOverLimit ? 100 : remainingRate}%` }}
                                                />
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
                                                    const fund = funds.find(f => f.id === t.fundId) || { name: 'Hũ đã xóa', bg: 'bg-slate-100', text: 'text-slate-500', iconName: 'Wallet' };
                                                    const Icon = ICONS[fund.iconName] || Wallet;
                                                    return (
                                                        <div key={t.id} className="group flex items-center justify-between gap-2.5 bg-white px-4 py-3.5 transition-all active:bg-slate-50">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fund.bg} ${fund.text}`}>
                                                                    <Icon className="w-4.5 h-4.5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[12px] font-bold text-slate-700 leading-tight truncate">{t.note}</p>
                                                                    <div className="mt-1.5 flex items-center gap-2 min-w-0">
                                                                        <span className={`max-w-[120px] truncate text-[9px] font-black uppercase ${fund.text}`}>{fund.name}</span>
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
                                {txType === 'in' ? 'Ghi nhận Thu nhập' : txType === 'out' ? 'Ghi nhận Chi tiêu' : 'Chuyển quỹ'}
                            </h3>
                            <button onClick={() => setIsTxModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto no-scrollbar flex-1">
                            <form id="txForm" onSubmit={handleSaveTx} className="space-y-4">
                                {txType === 'in' && (
                                    <div className="bg-slate-100 p-1 rounded-xl flex mb-1">
                                        <button type="button" onClick={() => setTxForm({ ...txForm, isDistribute: false })} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!txForm.isDistribute ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Nạp 1 hũ</button>
                                        <button type="button" onClick={() => setTxForm({ ...txForm, isDistribute: true })} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${txForm.isDistribute ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Chia nhiều hũ</button>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                                        {txType === 'in' && txForm.isDistribute ? 'Tổng số tiền nạp' : txType === 'transfer' ? 'Số tiền chuyển' : 'Số tiền'}
                                    </label>
                                    <div className="relative">
                                        <input type="text" value={txForm.amount} onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setTxForm({ ...txForm, amount: val !== '' ? formatN(Number(val)) : '' });
                                        }} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-lg font-black outline-none focus:bg-white transition-all text-right ${txType === 'in' ? 'text-emerald-600 focus:border-emerald-500' : txType === 'transfer' ? 'text-blue-600 focus:border-blue-500' : 'text-rose-600 focus:border-rose-500'}`} placeholder="0" required />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">VNĐ</span>
                                    </div>
                                </div>

                                {txType === 'transfer' && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 w-0">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Từ hũ</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsFromDropdownOpen(!isFromDropdownOpen); setIsToDropdownOpen(false); setIsFundDropdownOpen(false); }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all flex items-center justify-between text-indigo-900"
                                                >
                                                    <span className="truncate pr-2">
                                                        {funds.find(f => f.id === txForm.fundId)?.name || 'Chọn hũ'}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isFromDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isFromDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsFromDropdownOpen(false)}></div>
                                                        <div className="absolute top-full left-0 w-max min-w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                                            <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                                {funds.map(f => {
                                                                    const Icon = ICONS[f.iconName] || Wallet;
                                                                    return (
                                                                        <button key={f.id} type="button" onClick={() => { setTxForm({ ...txForm, fundId: f.id }); setIsFromDropdownOpen(false); }} className={`w-full px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${txForm.fundId === f.id ? 'bg-blue-50/50' : ''}`}>
                                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${f.bg} ${f.text}`}><Icon className="w-3 h-3" /></div>
                                                                            <div className="text-left flex-1"><p className="text-[11px] font-black text-indigo-900 leading-tight whitespace-nowrap">{f.name}</p><p className="text-[9px] font-bold text-slate-400 whitespace-nowrap">Còn {formatN(f.balance)}đ</p></div>
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pt-5 text-slate-400 shrink-0"><ArrowRightLeft className="w-4 h-4" /></div>
                                        <div className="flex-1 w-0">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Sang hũ</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsToDropdownOpen(!isToDropdownOpen); setIsFromDropdownOpen(false); setIsFundDropdownOpen(false); }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all flex items-center justify-between text-indigo-900"
                                                >
                                                    <span className="truncate pr-2">
                                                        {funds.find(f => f.id === txForm.toFundId)?.name || 'Chọn hũ'}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isToDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isToDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsToDropdownOpen(false)}></div>
                                                        <div className="absolute top-full right-0 w-max min-w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                                            <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                                {funds.map(f => {
                                                                    const Icon = ICONS[f.iconName] || Wallet;
                                                                    const isDisabled = f.id === txForm.fundId;
                                                                    return (
                                                                        <button key={f.id} type="button" disabled={isDisabled} onClick={() => { setTxForm({ ...txForm, toFundId: f.id }); setIsToDropdownOpen(false); }} className={`w-full px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${txForm.toFundId === f.id ? 'bg-blue-50/50' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${f.bg} ${f.text}`}><Icon className="w-3 h-3" /></div>
                                                                            <div className="text-left flex-1"><p className="text-[11px] font-black text-indigo-900 leading-tight whitespace-nowrap">{f.name}</p></div>
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {txType === 'in' && txForm.isDistribute && (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-2 mt-2">
                                        <div className="flex justify-between items-center border-b border-emerald-100 pb-2 mb-2">
                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Chưa phân bổ</span>
                                            <span className={`text-sm font-black ${parseN(txForm.amount) - Object.values(txForm.allocations).reduce((sum, val) => sum + (Number(val) || 0), 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatN(parseN(txForm.amount) - Object.values(txForm.allocations).reduce((sum, val) => sum + (Number(val) || 0), 0))}đ
                                            </span>
                                        </div>
                                        {funds.map(f => {
                                            const allocated = txForm.allocations[f.id] || '';
                                            return (
                                                <div key={f.id} className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 flex-1 truncate">
                                                        <span className={`w-2 h-2 rounded-full ${f.bg} border border-slate-300 shrink-0`}></span>
                                                        <span className="truncate">{f.name}</span>
                                                    </span>
                                                    <div className="relative w-[130px] shrink-0">
                                                        <input
                                                            type="text"
                                                            value={allocated ? formatN(allocated) : ''}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                setTxForm({
                                                                    ...txForm,
                                                                    allocations: {
                                                                        ...txForm.allocations,
                                                                        [f.id]: val ? Number(val) : ''
                                                                    }
                                                                });
                                                            }}
                                                            className="w-full bg-white border border-emerald-200 rounded-lg pr-5 pl-2 py-1.5 text-xs font-black outline-none focus:border-emerald-500 text-right text-emerald-600 transition-all"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">đ</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {txType !== 'transfer' && (!txForm.isDistribute || txType === 'out') && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Chọn Hũ</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsFundDropdownOpen(!isFundDropdownOpen)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all flex items-center justify-between"
                                            >
                                                <span className="text-indigo-900">
                                                    {funds.find(f => f.id === txForm.fundId)?.name || 'Chọn hũ'}
                                                    <span className="text-slate-400 font-semibold ml-1">
                                                        (Còn {formatN(funds.find(f => f.id === txForm.fundId)?.balance || 0)}đ)
                                                    </span>
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFundDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isFundDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsFundDropdownOpen(false)}></div>
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                            {funds.map(f => {
                                                                const Icon = ICONS[f.iconName] || Wallet;
                                                                return (
                                                                    <button key={f.id} type="button" onClick={() => { setTxForm({ ...txForm, fundId: f.id }); setIsFundDropdownOpen(false); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${txForm.fundId === f.id ? 'bg-blue-50/50' : ''}`}>
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${f.bg} ${f.text}`}><Icon className="w-4 h-4" /></div>
                                                                        <div className="text-left flex-1"><p className="text-[11px] font-black text-indigo-900 leading-tight">{f.name}</p><p className="text-[10px] font-bold text-slate-400">Còn {formatN(f.balance)}đ</p></div>
                                                                        {txForm.fundId === f.id && <Check className="w-4 h-4 text-blue-600" />}
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
                            <button form="txForm" type="submit" className={`w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${txType === 'in' ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-b-[3px] border-emerald-700' : txType === 'out' ? 'bg-rose-500 hover:bg-rose-400 text-white border-b-[3px] border-rose-700' : 'bg-blue-600 hover:bg-blue-500 text-white border-b-[3px] border-blue-800'}`}>
                                {txType === 'in' ? 'Xác nhận Nạp' : txType === 'out' ? 'Xác nhận Chi' : 'Xác nhận Chuyển'}
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
                            <h3 className="text-[14px] font-black text-indigo-900 uppercase tracking-tight">Thiết lập Hũ</h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-4">
                            <div className="space-y-2 mt-2">
                                {tempFunds.map((f, idx) => (
                                    <div key={f.id} className="flex items-center justify-between gap-1.5">
                                        <div className="flex-1">
                                            <input type="text" value={f.name} onChange={e => {
                                                const newTemp = [...tempFunds];
                                                newTemp[idx].name = e.target.value;
                                                setTempFunds(newTemp);
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-indigo-900" placeholder="Tên hũ" />
                                        </div>
                                        <button onClick={() => handleRemoveTempFund(f.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddFund} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95 bg-white">
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

export default FundView;
