"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type AdminLogoutButtonProps = {
  variant?: "destructive" | "outline";
  size?: "sm" | "default";
};

export function AdminLogoutButton({
  variant = "destructive",
  size = "sm",
}: AdminLogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={handleLogout}
    >
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}
