import Link from "next/link";
import { getCurrentUser, getIsAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = user ? await getIsAdmin() : false;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">English quizzes</Link>
        </Button>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          {!user && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
