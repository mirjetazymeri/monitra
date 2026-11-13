// Run with `npm test` (Node's built-in test runner; no extra dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loginPathFor, safeNextPath } from "./auth-redirect.ts";

test("keeps in-app paths, including query strings", () => {
  assert.equal(safeNextPath("/history"), "/history");
  assert.equal(safeNextPath("/incidents?endpoint=4"), "/incidents?endpoint=4");
  assert.equal(safeNextPath("/endpoints/12"), "/endpoints/12");
});

test("rejects anything that could leave the app (open redirect)", () => {
  for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "evil.example", "javascript:alert(1)", "/history\n//evil", ""]) {
    assert.equal(safeNextPath(value), "/overview", `accepted ${JSON.stringify(value)}`);
  }
  assert.equal(safeNextPath(null), "/overview");
  assert.equal(safeNextPath(undefined), "/overview");
});

test("never returns to the login page itself", () => {
  assert.equal(safeNextPath("/login"), "/overview");
  assert.equal(safeNextPath("/login?next=/history"), "/overview");
  assert.equal(safeNextPath("/"), "/overview");
});

test("builds the login URL with an encoded return path", () => {
  assert.equal(loginPathFor("/incidents?endpoint=4"), "/login?next=%2Fincidents%3Fendpoint%3D4");
  assert.equal(loginPathFor("/overview"), "/login");
  assert.equal(loginPathFor("//evil.example"), "/login");
});
