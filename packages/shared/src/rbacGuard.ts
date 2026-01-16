import type { PermissionCode } from "./types";
import { ForbiddenError } from "./errors";

export const hasAnyPermission = (userPermissions: PermissionCode[], required: PermissionCode[]): boolean => {
  if (required.length === 0) return true;
  const set = new Set(userPermissions);
  return required.some((permission) => set.has(permission));
};

export const assertAnyPermission = (
  userPermissions: PermissionCode[],
  required: PermissionCode[],
  message = "Ei oikeuksia"
) => {
  if (!hasAnyPermission(userPermissions, required)) {
    throw new ForbiddenError(message);
  }
};

