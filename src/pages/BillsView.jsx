import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Receipt, AlertTriangle } from 'lucide-react';
import { formatN } from '../utils/formatters';

const BillsView = ({
    handlePrevMonth,
    handleNextMonth,
    monthDisplay,
    billStats,
    currentBills,
    setBottomSheet,
    highlightedItemId,
    setHighlightedItemId
}) => {
    useEffect(() => {
        if (highlightedItemId && currentBills?.length > 0) {
            const hId = String(highlightedItemId);
            const targetBill = currentBills.find(b => String(b.id) === hId || String(b.roomId) === hId);
            if (targetBill) {
                setBottomSheet({ type: 'bill', data: targetBill });
                if (setHighlightedItemId) setHighlightedItemId(null);
                let attempts = 0;
                const scrollInterval = setInterval(() => {
                    const element = document.getElementById(`bill-card-${targetBill.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        clearInterval(scrollInterval);
                    }
                    attempts++;
                    if (attempts >= 10) clearInterval(scrollInterval);
                }, 200);
                return () => clearInterval(scrollInterval);
            }
        }
    }, [highlightedItemId, currentBills]);

    return (
        <div className="space-y-4 pb-20 animate-in fade-in">
            <div className="sticky top-0 z-30 bg-indigo-600 rounded-xl p-4 space-y-4 shadow-lg">
                <div className="bg-white p-1 rounded-xl flex items-center">
                    <button onClick={handlePrevMonth} className="p-3 text-indigo-600"><ChevronLeft /></button>
                    <div className="flex-1 text-center font-black uppercase text-xs">Hóa đơn {monthDisplay}</div>
                    <button onClick={handleNextMonth} className="p-3 text-indigo-600"><ChevronRight /></button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-xl text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Đã thu</p>
                        <p className="text-sm font-black text-emerald-600">{billStats.totalBillPaids}/{billStats.totalRooms}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Chưa thu</p>
                        <p className="text-sm font-black text-rose-600">{billStats.totalBillNotPaids}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Tiền đã thu</p>
                        <p className="text-sm font-black text-indigo-600">{formatN(billStats.totalAmountPaids)}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {currentBills.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic text-xs">
                        Chưa có hóa đơn nào trong tháng này.
                    </div>
                ) : (
                    currentBills.map(bill => {
                        const hId = highlightedItemId ? String(highlightedItemId) : null;
                        const isHighlighted = hId && (String(bill.id) === hId || String(bill.roomId) === hId);

                        let cardClasses = `bg-white p-3.5 rounded-xl border-2 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${bill.status === 'paid' ? 'border-emerald-100/60' : 'border-rose-100'}`;
                        if (isHighlighted) cardClasses += " border-red-500 shadow-red-200 animate-pulse bg-red-50 ring-2 ring-red-200";

                        return (
                            <div
                                id={`bill-card-${bill.id}`}
                                key={bill.id}
                                onClick={() => { setBottomSheet({ type: 'bill', data: bill }); if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null); }}
                                className={cardClasses}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                                        }`}>
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-[12px] font-black uppercase leading-none mb-1.5 ${bill.status === 'paid' ? 'text-emerald-700' : 'text-rose-700'
                                            }`}>
                                            Phòng {bill.roomId}
                                        </p>
                                        <div className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider inline-flex items-center ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {bill.status === 'paid' ? 'Đã thu tiền' : 'Chưa thu'}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className={`font-black text-[15px] tracking-tight tabular-nums ${bill.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                        {formatN(bill.total)}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Tổng cộng
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default BillsView;
