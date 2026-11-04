import test from 'node:test';
import assert from 'node:assert/strict';
import { getMeterCardStatus } from './meterCardStatus.js';

test('classifies empty, unread, unbilled and paid meters without treating zero as missing', () => {
  const rooms = [{ id: 'a', status: 'full' }];
  assert.equal(getMeterCardStatus({ newVal: null }, [], []), 'unmapped');
  assert.equal(getMeterCardStatus({ newVal: null }, [{ id: 'a', status: 'empty' }], []), 'empty');
  assert.equal(getMeterCardStatus({ newVal: '' }, rooms, []), 'unread');
  assert.equal(getMeterCardStatus({ newVal: 0 }, rooms, []), 'unbilled');
  assert.equal(getMeterCardStatus({ newVal: 10 }, rooms, [{ roomId: 'a', status: 'pending' }]), 'created');
  assert.equal(getMeterCardStatus({ newVal: null }, rooms, [{ roomId: 'a', status: 'paid' }]), 'paid');
});

test('shared meters remain actionable until every mapped room is paid', () => {
  const rooms = [{ id: 'a', status: 'full' }, { id: 'b', status: 'empty' }];
  const bills = [{ roomId: 'a', status: 'paid' }];
  assert.equal(getMeterCardStatus({ newVal: null }, rooms, bills), 'unread');
  assert.equal(getMeterCardStatus({ newVal: 10 }, rooms, bills), 'unbilled');
  assert.equal(getMeterCardStatus({ newVal: 10 }, rooms, [...bills, { roomId: 'b', status: 'paid' }]), 'paid');
});
