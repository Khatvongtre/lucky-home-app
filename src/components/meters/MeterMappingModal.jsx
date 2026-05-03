import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';

const MeterMappingModal = ({ mappingMeter, setMappingMeter, rooms, selectedHouse, setMeters, handleSaveMeterMapping }) => {
    if (!mappingMeter) return null;

    return (
        <Modal title={`Chọn phòng: ${mappingMeter.name}`} onClose={() => setMappingMeter(null)}>
            <div className="space-y-4 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase px-1">Chọn các phòng sử dụng chung công tơ này:</p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar py-2">
                    {rooms.filter(r => r.houseId === selectedHouse?.id).map(r => {
                        const isSelected = mappingMeter.roomIds.includes(r.id);
                        return (
                            <button key={r.id} onClick={() => {
                                const newIds = isSelected ? mappingMeter.roomIds.filter(id => id !== r.id) : [...mappingMeter.roomIds, r.id];
                                setMeters(prev => prev.map(m => m.id === mappingMeter.id ? { ...m, roomIds: newIds } : m));
                                setMappingMeter({ ...mappingMeter, roomIds: newIds });
                            }} className={`p-3 rounded-xl border-2 font-black text-xs flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>
                                <span>Phòng {r.roomCode}</span>{isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                        )
                    })}
                </div>
                <button onClick={handleSaveMeterMapping} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all border-b-1 border-blue-800 text-center">Hoàn tất</button>
            </div>
        </Modal>
    );
};

export default MeterMappingModal;