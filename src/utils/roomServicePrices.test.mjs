import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoomServicePrices, roomServicePriceFields } from './roomServicePrices.js';

const form = (entries) => {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
};

test('clears all seven overrides explicitly when inheriting house prices', () => {
  const entries = Object.fromEntries(roomServicePriceFields.map(({ key }) => [`${key}Override`, '']));
  entries.waterCalcMethodOverride = '';
  const prices = readRoomServicePrices(form(entries));
  assert.equal(Object.keys(prices).length, 7);
  assert.ok(Object.values(prices).every(value => value === null));
});

test('preserves free and decimal prices, normalizes water method independently', () => {
  assert.deepEqual(readRoomServicePrices(form({
    priceNetOverride: '0', priceWaterM3Override: '28000.25', waterCalcMethodOverride: ' M3 ',
  })), { priceNetOverride: 0, priceWaterM3Override: 28000.25, waterCalcMethodOverride: 'm3' });
});

test('omitted override fields stay omitted for older forms', () => {
  assert.deepEqual(readRoomServicePrices(form({ price: '1000000' })), {});
});

test('rejects invalid prices instead of silently charging zero or truncating', () => {
  for (const value of ['-1', 'abc', 'Infinity', '1.234', '10000000000000000']) {
    assert.throws(() => readRoomServicePrices(form({ priceElecOverride: value })));
  }
  assert.throws(() => readRoomServicePrices(form({ waterCalcMethodOverride: 'other' })));
});
