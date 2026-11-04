export const getRoomInvoiceStatus = (room, bills = []) => {
  const matches = bills.filter(bill => {
    const id = bill.entityRoomId || bill.roomId;
    return String(id) === String(room.id) || String(bill.roomCode || bill.roomId) === String(room.roomCode || room.id);
  });
  if (matches.some(bill => ['paid', 'completed', 'done'].includes(String(bill.status).toLowerCase()))) return 'paid';
  return matches.length ? 'created' : 'missing';
};
