import { Plus, Search } from 'lucide-react';

const SEARCHABLE_TABS = ['rooms', 'meters_list', 'finance', 'bills', 'savings'];

const SearchAddBar = ({
  activeTab,
  searchQuery,
  setSearchQuery,
  setEditingRoom,
  setIsAddRoomModalOpen,
  setIsAddTransactionModalOpen,
  setIsAddMeterModalOpen,
  setEditingSaving,
  setIsAddSavingModalOpen,
}) => {
  if (!SEARCHABLE_TABS.includes(activeTab)) return null;

  const openAddModal = () => {
    if (activeTab === 'rooms') {
      setEditingRoom(null);
      setIsAddRoomModalOpen(true);
    }
    if (activeTab === 'finance') setIsAddTransactionModalOpen(true);
    if (activeTab === 'meters_list') setIsAddMeterModalOpen(true);
    if (activeTab === 'savings') {
      setEditingSaving(null);
      setIsAddSavingModalOpen(true);
    }
  };

  return (
    <div className="px-4 py-2.5 shrink-0 bg-white border-b border-slate-100 flex items-center space-x-2 shadow-sm text-left">
      <div className="relative flex-1 group">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'savings' ? 'Tìm ngân hàng, tên sổ...' : 'Tìm phòng, hạng mục...'}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none focus:border-blue-500 transition-all"
        />
      </div>
      <button
        onClick={openAddModal}
        className="p-1.5 bg-blue-600 text-white rounded-lg active:scale-90 transition-all flex items-center justify-center"
      >
        <Plus className="w-4.5 h-4.5" strokeWidth={4} />
      </button>
    </div>
  );
};

export default SearchAddBar;
