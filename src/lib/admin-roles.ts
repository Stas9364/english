import type { User } from "@supabase/supabase-js";

/** Роли админки; источник истины в Supabase Auth `app_metadata.role`. */
export const ADMIN_ROLES = ["super_admin", "admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/** Роль из JWT (`app_metadata.role`), если задана явно. */
export function getAdminRoleFromUser(user: User | null | undefined): AdminRole | null {
  if (!user) return null;
  const role = user.app_metadata?.role;
  return isAdminRole(role) ? role : null;
}

export function isAdminRoleValue(role: AdminRole | null): role is AdminRole {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdminRole(role: AdminRole | null): boolean {
  return role === "super_admin";
}
