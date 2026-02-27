import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getIsAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const isAdmin = await getIsAdmin();
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
          <CardContent>
            <Button asChild>
              <Link href="/">Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="font-semibold">Admin</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to quizzes</Link>
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
