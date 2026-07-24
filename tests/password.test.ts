import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("bcrypt hash validates its source password", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.ok(hash.startsWith("$2"));
  assert.deepEqual(
    await verifyPassword("correct horse battery staple", hash),
    { valid: true, needsRehash: false },
  );
  assert.deepEqual(
    await verifyPassword("incorrect", hash),
    { valid: false, needsRehash: false },
  );
});

test("legacy SHA-256 hash validates once then requests bcrypt upgrade", async () => {
  process.env.AUTH_SALT = "test-salt";
  const legacyHash = createHash("sha256").update("password" + process.env.AUTH_SALT).digest("hex");

  assert.deepEqual(
    await verifyPassword("password", legacyHash),
    { valid: true, needsRehash: true },
  );
  assert.deepEqual(
    await verifyPassword("incorrect", legacyHash),
    { valid: false, needsRehash: false },
  );
});
