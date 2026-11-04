import test from 'node:test';
import assert from 'node:assert/strict';
import { getRoomInvoiceStatus } from './roomInvoiceStatus.js';

test('matches normalized and raw room identities and prioritizes paid invoices', () => {
  const room = { id: 'room-guid', roomCode: '101' };
  assert.equal(getRoomInvoiceStatus(room, []), 'missing');
  assert.equal(getRoomInvoiceStatus(room, [{ roomId: 'other', status: 'paid' }]), 'missing');
  assert.equal(getRoomInvoiceStatus(room, [{ roomId: 'room-guid', status: 'pending' }]), 'created');
  assert.equal(getRoomInvoiceStatus(room, [{ entityRoomId: 'room-guid', roomId: '101', status: 'paid' }]), 'paid');
  assert.equal(getRoomInvoiceStatus(room, [{ roomCode: '101', status: 'pending' }, { roomId: 'room-guid', status: 'Completed' }]), 'paid');
});
