const UPSTASH_REDIS_DATABASE_ID = "973ef9af-eab4-4b85-badb-57187238d7cc";
const UPSTASH_API_USERNAME = "foxxx.9364@gmail.com";

export const UPSTASH_FREE_TIER_LIMITS = {
  monthlyCommands: 500_000,
  monthlyBandwidthBytes: 50 * 1024 ** 3,
  storageBytes: 256 * 1024 ** 2,
} as const;

export type UpstashRedisStats = {
  daily_net_commands: number;
  daily_read_requests: number;
  daily_write_requests: number;
  total_monthly_requests: number;
  total_monthly_read_requests: number;
  total_monthly_write_requests: number;
  total_monthly_bandwidth: number;
  total_monthly_storage: number;
  current_storage: number;
};

export async function getUpstashRedisStats(): Promise<UpstashRedisStats | null> {
  const password = process.env.UPSTASH_REDIS_API_KEY?.trim();
  if (!password) {
    console.error("[upstash] UPSTASH_REDIS_API_KEY is not set");
    return null;
  }

  const credentials = Buffer.from(`${UPSTASH_API_USERNAME}:${password}`).toString(
    "base64"
  );

  try {
    const response = await fetch(
      `https://api.upstash.com/v2/redis/stats/${UPSTASH_REDIS_DATABASE_ID}`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("[upstash] stats fetch failed", response.status);
      return null;
    }

    const data = (await response.json()) as Partial<UpstashRedisStats>;

    return {
      daily_net_commands: data.daily_net_commands ?? 0,
      daily_read_requests: data.daily_read_requests ?? 0,
      daily_write_requests: data.daily_write_requests ?? 0,
      total_monthly_requests: data.total_monthly_requests ?? 0,
      total_monthly_read_requests: data.total_monthly_read_requests ?? 0,
      total_monthly_write_requests: data.total_monthly_write_requests ?? 0,
      total_monthly_bandwidth: data.total_monthly_bandwidth ?? 0,
      total_monthly_storage: data.total_monthly_storage ?? 0,
      current_storage: data.current_storage ?? 0,
    };
  } catch (error) {
    console.error("[upstash] stats fetch error", error);
    return null;
  }
}
