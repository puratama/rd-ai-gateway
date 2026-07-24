import test from "node:test";
import assert from "node:assert/strict";
import { mapXenditStatus } from "../src/lib/xendit";
import { addBillingPeriod } from "../src/lib/billing-fulfillment";

// ── Xendit status mapping ──

test("mapXenditStatus PAID → paid", () => {
  assert.equal(mapXenditStatus("PAID"), "paid");
});

test("mapXenditStatus SETTLED → paid", () => {
  assert.equal(mapXenditStatus("SETTLED"), "paid");
});

test("mapXenditStatus EXPIRED → expired", () => {
  assert.equal(mapXenditStatus("EXPIRED"), "expired");
});

test("mapXenditStatus PENDING → pending", () => {
  assert.equal(mapXenditStatus("PENDING"), "pending");
});

test("mapXenditStatus unknown → failed", () => {
  assert.equal(mapXenditStatus("SOME_RANDOM_STATUS"), "failed");
  assert.equal(mapXenditStatus("CANCELLED"), "failed");
  assert.equal(mapXenditStatus(""), "failed");
});

// ── billing period calculation ──

test("addBillingPeriod monthly (default) adds 1 month", () => {
  const start = new Date("2025-06-15T00:00:00Z");
  const end = addBillingPeriod(start, "monthly");
  assert.equal(end.getUTCMonth(), 6); // July = 6 (0-indexed)
  assert.equal(end.getUTCFullYear(), 2025);
  assert.equal(end.getUTCDate(), 15);
});

test("addBillingPeriod yearly adds 1 year", () => {
  const start = new Date("2025-06-15T00:00:00Z");
  const end = addBillingPeriod(start, "yearly");
  assert.equal(end.getUTCFullYear(), 2026);
  assert.equal(end.getUTCMonth(), 5);
  assert.equal(end.getUTCDate(), 15);
});

test("addBillingPeriod weekly adds 7 days", () => {
  const start = new Date("2025-06-15T00:00:00Z");
  const end = addBillingPeriod(start, "weekly");
  assert.equal(end.getUTCDate(), 22);
});

test("addBillingPeriod daily adds 1 day", () => {
  const start = new Date("2025-06-15T00:00:00Z");
  const end = addBillingPeriod(start, "daily");
  assert.equal(end.getUTCDate(), 16);
});

test("addBillingPeriod does not mutate original date", () => {
  const start = new Date("2025-06-15T00:00:00Z");
  const startCopy = new Date(start);
  addBillingPeriod(start, "monthly");
  assert.equal(start.getTime(), startCopy.getTime());
});
