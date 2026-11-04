import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoomBilling } from './roomBilling.js';
import { applyBillAdjustments, normalizeBill } from './bills.js';

const form = entries => {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
};

test('preserves omitted billing fields and supports clearing occupancy and explicit zero', () => {
  assert.deepEqual(readRoomBilling(form({})), {});
  assert.deepEqual(readRoomBilling(form({ previousPeopleCount: '', deposit: '0', priceElevator: '0', elevatorCalcMethod: 'room' })), {
    previousPeopleCount: null, deposit: 0, priceElevator: 0, elevatorCalcMethod: 'room',
  });
  assert.deepEqual(readRoomBilling(form({ previousPeopleCount: '0', priceElevator: '12000.5', elevatorCalcMethod: 'person' })), {
    previousPeopleCount: 0, priceElevator: 12000.5, elevatorCalcMethod: 'person',
  });
});

test('rejects invalid amounts, negative or fractional occupancy and invalid methods', () => {
  for (const entries of [{ deposit: '-1' }, { priceElevator: 'abc' }, { priceElevator: 'Infinity' }, { previousPeopleCount: '1.5' }, { previousPeopleCount: '-1' }, { elevatorCalcMethod: 'other' }]) {
    assert.throws(() => readRoomBilling(form(entries)));
  }
});

test('reads comma-formatted billing amounts as API numbers', () => {
  assert.deepEqual(readRoomBilling(form({ deposit: '5,000,000', priceElevator: '120,000.5' })), {
    deposit: 5000000, priceElevator: 120000.5,
  });
});

test('includes elevator in adjustments, preserves its waiver and excludes deposit from monthly total', () => {
  const bill = normalizeBill({ detailsJson: JSON.stringify({ rent: 2000000, elevator: 120000, deposit: 5000000, waivedItems: ['elevator'] }) });
  assert.deepEqual(bill.details.waivedItems, ['elevator']);
  assert.equal(applyBillAdjustments(bill).total, 2000000);
  assert.equal(applyBillAdjustments(bill, { waivedItems: [], discount: 20000, additionalCost: 10000 }).total, 2110000);
  assert.equal(applyBillAdjustments({ details: { rent: 2000000 } }).total, 2000000);
});
