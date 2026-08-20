import test from "node:test";
import assert from "node:assert/strict";
import { apiError, corsOptions } from "../src/lib/public-api-contract";

test("public API errors use the OpenAI-compatible envelope", async () => {
  const response = apiError("Insufficient balance", 402, "insufficient_balance", "billing_error");
  assert.equal(response.status, 402);
  assert.deepEqual(await response.json(), {
    error: {
      message: "Insufficient balance",
      type: "billing_error",
      param: null,
      code: "insufficient_balance",
    },
  });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
});

test("public API preflight allows agent authentication headers", () => {
  const response = corsOptions();
  assert.equal(response.status, 204);
  assert.match(response.headers.get("Access-Control-Allow-Headers") || "", /Authorization/);
  assert.match(response.headers.get("Access-Control-Allow-Headers") || "", /X-API-Key/);
});
