import { getRoomInvoiceStatus } from './roomInvoiceStatus.js';

export const getMeterCardStatus = (meter, rooms, bills) => {
  if (!rooms.length) return 'unmapped';
  const states = rooms.map(room => getRoomInvoiceStatus(room, bills));
  if (states.every(state => state === 'paid')) return 'paid';
  if (rooms.every(room => room.status === 'empty')) return 'empty';
  if (meter.newVal == null || meter.newVal === '') return 'unread';
  if (states.some(state => state === 'missing')) return 'unbilled';
  return 'created';
};
