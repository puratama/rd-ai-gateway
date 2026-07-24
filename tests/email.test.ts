import test from "node:test";
import assert from "node:assert/strict";
import { buildVerifyHtml, getVerifyUrl } from "../src/lib/email";

test("buildVerifyHtml renders a clickable verification link", () => {
  const html = buildVerifyHtml("[REDACTED-URL]");
  assert.ok(html.includes("[REDACTED-URL]"), "should embed verification URL");
  assert.ok(html.includes("Verifikasi Email"), "should include Indonesian title");
  assert.ok(html.toLowerCase().includes("href="), "should include anchor href");
});

test("getVerifyUrl concatenates base + token query", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  const url = getVerifyUrl("abc123");
  assert.equal(url, "https://app.example.com/api/auth/verify-email?token=abc123");
});

test("getVerifyUrl falls back to localhost in dev when env missing", () => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  const url = getVerifyUrl("xyz");
  assert.ok(url.startsWith("http://localhost:3000/"));
  assert.ok(url.includes("token=xyz"));
});
