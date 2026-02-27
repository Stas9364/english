"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  useEffect(() => {
    // Небольшая задержка, чтобы браузер точно применил cookies из ответа callback
    const t = setTimeout(() => {
      router.replace(next.startsWith("/") ? next : "/");
    }, 100);
    return () => clearTimeout(t);
  }, [router, next]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
