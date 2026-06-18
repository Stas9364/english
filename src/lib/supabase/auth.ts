import {
  getAdminRoleFromUser,
  isAdminRoleValue,
  isSuperAdminRole,
  type AdminRole,
} from "@/lib/admin-roles";
import { createServerClient } from "./server";
import type { User } from "@supabase/supabase-js";

export type { AdminRole };
export { ADMIN_ROLES, getAdminRoleFromUser, isSuperAdminRole } from "@/lib/admin-roles";

/**
 * Returns the current authenticated user from cookies (server-side).
 * Use in Server Components, Server Actions, Route Handlers.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function isEmailInAdminList(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  email?: string | null
) {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail) return false;

  const { data, error } = await supabase
    .from("admin_emails")
    .select("email")
    .ilike("email", normalizedEmail)
    .limit(1);
  if (error) return false;

  return (data?.length ?? 0) > 0;
}

async function resolveCurrentUser(currentUser?: User | null): Promise<User | null> {
  if (currentUser !== undefined) return currentUser;

  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return null;
  return user;
}

/**
 * Effective admin role: app_metadata.role, or `admin` if email is in admin_emails.
 */
export async function getAdminRole(currentUser?: User | null): Promise<AdminRole | null> {
  const user = await resolveCurrentUser(currentUser);
  const metadataRole = getAdminRoleFromUser(user);
  if (isAdminRoleValue(metadataRole)) return metadataRole;

  if (!user?.email) return null;

  const supabase = await createServerClient();
  const inAdminList = await isEmailInAdminList(supabase, user.email);
  return inAdminList ? "admin" : null;
}

/**
 * Returns true when the user is admin or super_admin.
 */
export async function getIsAdmin(currentUser?: User | null): Promise<boolean> {
  const role = await getAdminRole(currentUser);
  return isAdminRoleValue(role);
}

/**
 * Returns true only for app_metadata.role = super_admin.
 * Users from admin_emails alone are not super admins.
 */
export async function getIsSuperAdmin(currentUser?: User | null): Promise<boolean> {
  const user = await resolveCurrentUser(currentUser);
  return isSuperAdminRole(getAdminRoleFromUser(user));
}

export type AdminTopicsScope = {
  userId: string;
  isSuperAdmin: boolean;
};

/** Scope for admin topic lists and ownership checks. */
export async function getAdminTopicsScope(
  currentUser?: User | null
): Promise<AdminTopicsScope | null> {
  const user = await resolveCurrentUser(currentUser);
  if (!user) return null;

  const isSuperAdmin = isSuperAdminRole(getAdminRoleFromUser(user));
  return { userId: user.id, isSuperAdmin };
}
