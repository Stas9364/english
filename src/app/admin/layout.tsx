import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminRole, getCurrentUser, getIsAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AdminChatWidget } from "@/components/admin-chat-widget";
import { AdminLogoutButton } from "@/components/admin-logout-button";

/** Avoid cached layout so auth is read on every request (fixes "login works on second try" in prod). */
export const dynamic = "force-dynamic";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const [isAdmin, adminRole] = await Promise.all([getIsAdmin(user), getAdminRole(user)]);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              Your account does not have access to the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/">Back to topics</Link>
            </Button>
            <AdminLogoutButton variant="outline" />
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">Admin</h1>
            {adminRole === "super_admin" ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Super admin
              </span>
            ) : null}

            <AdminLogoutButton />
          </div>
          <div className="flex items-center gap-2">
            {/*     
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Back to topics</Link>
            </Button> */}

            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/guide">Guide</Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
      <AdminChatWidget />
    </div>
  );
}
