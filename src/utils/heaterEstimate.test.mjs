import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateHeater } from './heaterEstimate.js';

test('splits shared usage by previous occupancy and applies each room price', () => {
  const result = estimateHeater(100, [
    { id: 'a', previousPeopleCount: 2, peopleCount: 0, priceElecOverride: 4000 },
    { id: 'b', peopleCount: 2, effectiveServicePrices: { priceElec: 4500 } },
  ], 3500);
  assert.equal(result.people, 4);
  assert.deepEqual(result.items.map(({ quantity, amount }) => [quantity, amount]), [[50, 200000], [50, 225000]]);
  assert.equal(result.total, 425000);
});

test('preserves zero occupancy and free prices, rounds each room down separately', () => {
  const result = estimateHeater(1, [
    { previousPeopleCount: 0, peopleCount: 5 },
    { peopleCount: 1, priceElecOverride: 0 },
    { peopleCount: 2 },
  ], 4000);
  assert.equal(result.people, 3);
  assert.deepEqual(result.items.map(item => item.amount), [0, 0, 2000]);
  assert.equal(estimateHeater(100, [{ peopleCount: 0 }], 4000).total, 0);
});
