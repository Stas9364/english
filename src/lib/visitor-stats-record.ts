import { createHash } from "node:crypto";
import { invokeServiceRpc } from "@/lib/supabase/service";

export function extractQuizSlug(pathname: string): string | null {
  const match = pathname.match(/^\/quiz\/([^/]+)$/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function hashVisitorFingerprint(ip: string, visitDate: string): string {
  const salt = process.env.VISITOR_HASH_SALT?.trim() ?? "dev-visitor-salt";
  return createHash("sha256").update(`${salt}:${visitDate}:${ip}`).digest("hex");
}

export async function recordQuizVisit(ip: string, quizSlug: string): Promise<void> {
  let normalizedIp = ip.trim();
  const normalizedSlug = quizSlug.trim();

  if (!normalizedSlug) {
    return;
  }

  if (
    !normalizedIp &&
    (process.env.NODE_ENV === "development" || process.env.VISITOR_STATS_DEBUG === "1")
  ) {
    normalizedIp = "127.0.0.1";
    console.info("[visitor-stats] using dev fallback IP", { slug: normalizedSlug });
  }

  if (!normalizedIp) {
    console.warn("[visitor-stats] skipped: no client IP", { slug: normalizedSlug });
    return;
  }

  const visitDate = getUtcDateKey();
  const fingerprint = hashVisitorFingerprint(normalizedIp, visitDate);

  const { error } = await invokeServiceRpc("record_quiz_visit", {
    p_date: visitDate,
    p_fingerprint: fingerprint,
    p_quiz_slug: normalizedSlug,
  });

  if (error) {
    console.error("[visitor-stats] record_quiz_visit failed", {
      slug: normalizedSlug,
      visitDate,
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (
    process.env.NODE_ENV === "development" ||
    process.env.VISITOR_STATS_DEBUG === "1"
  ) {
    console.info("[visitor-stats] record_quiz_visit ok", {
      slug: normalizedSlug,
      visitDate,
      fingerprintPrefix: fingerprint.slice(0, 8),
    });
  }
}
