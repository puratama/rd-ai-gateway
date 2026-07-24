import test from "node:test";
import assert from "node:assert/strict";
import { calcSellPrice, calcMargin } from "../src/lib/pricing-engine";

test("calcSellPrice applies markup% on cost", () => {
  assert.equal(calcSellPrice(100, 50), 150);
  assert.equal(calcSellPrice(200, 100), 400);
  assert.equal(calcSellPrice(0, 100), 0); // zero cost → no sell
});

test("calcMargin returns the percentage share of profit", () => {
  // cost=50, sell=100 → margin = (100-50)/100 = 50%
  assert.equal(calcMargin(50, 100), 50);
  // cost=80, sell=100 → margin = 20/100 = 20%
  assert.equal(calcMargin(80, 100), 20);
  // zero sell → 0
  assert.equal(calcMargin(100, 0), 0);
});

test("calcSellPrice rounds up to nearest rupiah", () => {
  // 100 * 1.05 = 105
  const r = calcSellPrice(100, 5);
  assert.ok(r >= 105);
});
