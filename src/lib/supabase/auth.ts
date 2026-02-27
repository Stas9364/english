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

/**
 * Returns true if the current user's email is in admin_emails (RLS allows SELECT only for admins).
 */
export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("admin_emails").select("email").limit(1);
  return (data?.length ?? 0) > 0;
}
