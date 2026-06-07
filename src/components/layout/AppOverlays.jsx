import BillReceipt from '../bills/BillReceipt';
import OverwriteBillModal from '../bills/OverwriteBillModal';
import AddTransactionForm from '../finance/AddTransactionForm';
import SelectHouseForActionModal from '../houses/SelectHouseForActionModal';
import MeterMappingModal from '../meters/MeterMappingModal';
import AddMeterForm from '../meters/AddMeterForm';
import AddRoomForm from '../rooms/AddRoomForm';
import AddSavingForm from '../savings/AddSavingForm';
import Modal from '../common/Modal';

const AppOverlays = ({
  API_URL,
  actionToSelectHouse,
  billsState,
  financeState,
  houseSelectionState,
  meterState,
  roomState,
  savingState,
  permissions,
}) => {
  const {
    bottomSheet,
    setBottomSheet,
    config,
    isGeneratingImage,
    handleBillUpdate,
    handleShareZaloImage,
    handleDeleteBill,
    handlePayBill,
    isOverwriteModalOpen,
    setIsOverwriteModalOpen,
    executeGenerateBills,
  } = billsState;

  const {
    isAddTransactionModalOpen,
    setIsAddTransactionModalOpen,
    handleAddTx,
    handleDeleteTransaction,
    editingTransaction,
    txType,
    setTxType,
    selectedCat,
    setSelectedCat,
    isCatOpen,
    setIsCatOpen,
  } = financeState;

  const {
    houses,
    user,
    setSelectedHouse,
    setConfig,
    setPendingAction,
    setActionToSelectHouse,
  } = houseSelectionState;

  const {
    mappingMeter,
    setMappingMeter,
    rooms,
    selectedHouse,
    setMeters,
    handleSaveMeterMapping,
    isAddMeterModalOpen,
    setIsAddMeterModalOpen,
    editingMeter,
    setEditingMeter,
    handleSaveMeter,
    handleDeleteMeter,
  } = meterState;

  const {
    isAddRoomModalOpen,
    setIsAddRoomModalOpen,
    editingRoom,
    handleAddRoom,
    handleDeleteRoom,
    sharedHeaters,
  } = roomState;

  const {
    isAddSavingModalOpen,
    setIsAddSavingModalOpen,
    editingSaving,
    handleAddSaving,
    handleDeleteSaving,
    uniqueBankNames,
  } = savingState;

  return (
    <>
      <OverwriteBillModal
        isOverwriteModalOpen={isOverwriteModalOpen}
        setIsOverwriteModalOpen={setIsOverwriteModalOpen}
        executeGenerateBills={executeGenerateBills}
      />

      {isAddTransactionModalOpen && (
        <Modal title="Ghi sổ thu chi" onClose={() => setIsAddTransactionModalOpen(false)}>
          <AddTransactionForm
            onSave={handleAddTx}
            onDelete={handleDeleteTransaction}
            editingTransaction={editingTransaction}
            canManageTransactions={permissions.canManageTransactions}
            txType={txType}
            setTxType={setTxType}
            selectedCat={selectedCat}
            setSelectedCat={setSelectedCat}
            isCatOpen={isCatOpen}
            setIsCatOpen={setIsCatOpen}
          />
        </Modal>
      )}

      <BillReceipt
        bottomSheet={bottomSheet}
        setBottomSheet={setBottomSheet}
        config={config}
        API_URL={API_URL}
        isManagerOrAbove={permissions.isManagerOrAbove}
        isOwnerOrAdmin={permissions.isOwnerOrAdmin}
        isGeneratingImage={isGeneratingImage}
        handleBillUpdate={handleBillUpdate}
        handleShareZaloImage={handleShareZaloImage}
        handleDeleteBill={handleDeleteBill}
        handlePayBill={handlePayBill}
      />

      {isAddRoomModalOpen && (
        <Modal title={editingRoom ? 'Cập nhật phòng' : 'Thêm phòng mới'} onClose={() => setIsAddRoomModalOpen(false)}>
          <AddRoomForm
            onSave={handleAddRoom}
            onDelete={handleDeleteRoom}
            editingRoom={editingRoom}
            sharedHeaters={sharedHeaters}
          />
        </Modal>
      )}

      <MeterMappingModal
        mappingMeter={mappingMeter}
        setMappingMeter={setMappingMeter}
        rooms={rooms}
        selectedHouse={selectedHouse}
        setMeters={setMeters}
        handleSaveMeterMapping={handleSaveMeterMapping}
      />

      {isAddMeterModalOpen && (
        <Modal
          title={editingMeter ? 'Cập nhật công tơ' : 'Thêm công tơ mới'}
          onClose={() => {
            setIsAddMeterModalOpen(false);
            setEditingMeter(null);
          }}
        >
          <AddMeterForm onSave={handleSaveMeter} onDelete={handleDeleteMeter} editingMeter={editingMeter} />
        </Modal>
      )}

      {isAddSavingModalOpen && (
        <Modal title={editingSaving ? 'Cập nhật sổ tiết kiệm' : 'Thêm sổ tiết kiệm'} onClose={() => setIsAddSavingModalOpen(false)}>
          <AddSavingForm
            onSave={handleAddSaving}
            onDelete={handleDeleteSaving}
            editingSaving={editingSaving}
            uniqueBankNames={uniqueBankNames}
          />
        </Modal>
      )}

      <SelectHouseForActionModal
        actionToSelectHouse={actionToSelectHouse}
        setActionToSelectHouse={setActionToSelectHouse}
        houses={houses}
        user={user}
        setSelectedHouse={setSelectedHouse}
        setConfig={setConfig}
        setPendingAction={setPendingAction}
      />
    </>
  );
};

export default AppOverlays;
