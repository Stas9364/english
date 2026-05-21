import { createServerClient } from "./server";
import type { User } from "@supabase/supabase-js";

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

/**
 * Returns true if the current user's email is in admin_emails.
 */
export async function getIsAdmin(currentUser?: User | null): Promise<boolean> {
  const supabase = await createServerClient();
  const email = currentUser?.email ?? null;
  if (email) {
    return isEmailInAdminList(supabase, email);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return false;
  return isEmailInAdminList(supabase, user?.email);
}
