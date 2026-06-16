import { Redis } from "@upstash/redis";

const QUIZ_CACHE_VERSION = "v1";
const QUIZ_CACHE_PREFIX = "quiz:public:slug";
export const QUIZ_CACHE_TTL_SECONDS = 60 * 60 * 24 * 15;
const MAX_CACHE_PAYLOAD_BYTES = 900_000;

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function normalizeQuizSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function getQuizCacheKey(slug: string): string {
  return `${QUIZ_CACHE_PREFIX}:${normalizeQuizSlug(slug)}:${QUIZ_CACHE_VERSION}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    if (value !== null) {
      console.info("[redis] cache_hit", { key });
    } else {
      console.info("[redis] cache_miss", { key });
    }
    return value ?? null;
  } catch (error) {
    console.error("[redis] cache_get_error", { key, error });
    return null;
  }
}

export async function setCachedJson(
  key: string,
  payload: unknown,
  ttlSeconds = QUIZ_CACHE_TTL_SECONDS
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const serialized = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(serialized, "utf-8");
  if (payloadBytes > MAX_CACHE_PAYLOAD_BYTES) {
    console.info("[redis] cache_skip_large_payload", { key, payloadBytes });
    return;
  }

  try {
    await redis.set(key, payload, { ex: ttlSeconds });
    console.info("[redis] cache_set", { key, ttlSeconds });
  } catch (error) {
    console.error("[redis] cache_set_error", { key, error });
  }
}

export async function invalidateCacheByKey(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
    console.info("[redis] cache_invalidate", { key });
  } catch (error) {
    console.error("[redis] cache_invalidate_error", { key, error });
  }
}

export async function invalidateQuizCacheBySlug(slug: string): Promise<void> {
  const key = getQuizCacheKey(slug);
  await invalidateCacheByKey(key);
}
