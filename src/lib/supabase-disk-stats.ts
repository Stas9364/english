const SUPABASE_PROJECT_REF = "ziczmgathqlgqdltcivg";

export type SupabaseDiskStats = {
  timestamp: string;
  fs_size_bytes: number;
  fs_avail_bytes: number;
  fs_used_bytes: number;
};

export async function getSupabaseDiskStats(): Promise<SupabaseDiskStats | null> {
  const token = process.env.SUPABASE_API_TOKEN?.trim();
  if (!token) {
    console.error("[supabase] SUPABASE_API_TOKEN is not set");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/disk/util`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("[supabase] disk util fetch failed", response.status);
      return null;
    }

    const data = (await response.json()) as {
      timestamp?: string;
      metrics?: {
        fs_size_bytes?: number;
        fs_avail_bytes?: number;
        fs_used_bytes?: number;
      };
    };

    return {
      timestamp: data.timestamp ?? "",
      fs_size_bytes: data.metrics?.fs_size_bytes ?? 0,
      fs_avail_bytes: data.metrics?.fs_avail_bytes ?? 0,
      fs_used_bytes: data.metrics?.fs_used_bytes ?? 0,
    };
  } catch (error) {
    console.error("[supabase] disk util fetch error", error);
    return null;
  }
}
