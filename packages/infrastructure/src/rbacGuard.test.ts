import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAnyPermission, hasAnyPermission } from "@ennuste/shared";

test("rbacGuard: hasAnyPermission true when user has one required permission", () => {
  assert.equal(hasAnyPermission(["REPORT_READ"], ["REPORT_READ", "SELLER_UI"]), true);
});

test("rbacGuard: hasAnyPermission false when missing all required permissions", () => {
  assert.equal(hasAnyPermission(["REPORT_READ"], ["MEMBERS_MANAGE"]), false);
});

test("rbacGuard: assertAnyPermission throws ForbiddenError on deny", () => {
  assert.throws(() => assertAnyPermission(["REPORT_READ"], ["MEMBERS_MANAGE"]), (error: any) => {
    return error?.code === "FORBIDDEN" && error?.status === 403;
  });
});
