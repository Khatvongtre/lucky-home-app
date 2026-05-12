import { Building2, ChevronRight, X } from 'lucide-react';

const SelectHouseForActionModal = ({
  actionToSelectHouse,
  setActionToSelectHouse,
  houses,
  user,
  setSelectedHouse,
  setConfig,
  setPendingAction,
}) => {
  if (!actionToSelectHouse) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setActionToSelectHouse(null)}></div>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-[15px] font-black text-indigo-900 uppercase tracking-tight">Chọn cơ sở</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Để tiếp tục thao tác</p>
          </div>
          <button onClick={() => setActionToSelectHouse(null)} className="w-8 h-8 bg-slate-200/50 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-2.5 bg-slate-50/30">
          {houses.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-500">Bạn chưa có cơ sở nào.</p>
            </div>
          )}
          {houses.map(house => (
            <button
              key={house.id}
              onClick={() => {
                setSelectedHouse(house);
                setConfig({ ...house });
                setPendingAction(actionToSelectHouse);
                setActionToSelectHouse(null);
              }}
              className="w-full p-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100/50 rounded-2xl text-left active:scale-[0.98] transition-all flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100 group-hover:border-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-blue-700 transition-colors">{house.name}</p>
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase shrink-0">{house.userRole || user?.role}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 truncate">{house.address || 'Chưa cập nhật địa chỉ'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectHouseForActionModal;
