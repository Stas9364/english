"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginScreen() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") === "auth";
  const next = searchParams.get("next") ?? "/";

  const handleSignInWithGoogle = async () => {
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Sign in failed. Please try again.
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            className="w-full"
            onClick={handleSignInWithGoogle}
          >
            Sign in with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:no-underline">
              Back to quizzes
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
