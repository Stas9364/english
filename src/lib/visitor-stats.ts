import { createHash } from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  DailyVisitorStat,
  QuizVisitorStatRow,
  QuizVisitorSummary,
} from "@/lib/visitor-stats-types";

export type {
  DailyVisitorStat,
  QuizVisitorStatRow,
  QuizVisitorSummary,
  VisitorStatsPeriod,
  VisitorStatsPeriodData,
} from "@/lib/visitor-stats-types";

export { VISITOR_STATS_PERIODS } from "@/lib/visitor-stats-types";

type DailyVisitorStatsRow = {
  visit_date: string;
  unique_visitors: number;
};

type QuizVisitorStatsDbRow = {
  visit_date: string;
  quiz_slug: string;
  unique_visitors: number;
  quizzes: { title: string } | { title: string }[] | null;
};

export function extractQuizSlug(pathname: string): string | null {
  const match = pathname.match(/^\/quiz\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function hashVisitorFingerprint(ip: string, visitDate: string): string {
  const salt = process.env.VISITOR_HASH_SALT?.trim() ?? "dev-visitor-salt";
  return createHash("sha256").update(`${salt}:${visitDate}:${ip}`).digest("hex");
}

export async function recordQuizVisit(ip: string, quizSlug: string): Promise<void> {
  const normalizedIp = ip.trim();
  const normalizedSlug = quizSlug.trim();

  if (!normalizedIp || !normalizedSlug) {
    return;
  }

  const client = createServiceClient();
  if (!client) {
    console.error("[visitor-stats] SUPABASE_SERVICE_ROLE_KEY is not set");
    return;
  }

  const visitDate = getUtcDateKey();
  const fingerprint = hashVisitorFingerprint(normalizedIp, visitDate);

  const { error } = await client.rpc("record_quiz_visit", {
    p_date: visitDate,
    p_fingerprint: fingerprint,
    p_quiz_slug: normalizedSlug,
  });

  if (error) {
    console.error("[visitor-stats] record_quiz_visit failed", error);
  }
}

function fillDailyStats(
  days: number,
  rows: DailyVisitorStatsRow[]
): DailyVisitorStat[] {
  const byDate = new Map(
    rows.map((row) => [row.visit_date, row.unique_visitors] as const)
  );
  const result: DailyVisitorStat[] = [];
  const end = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    const dateKey = getUtcDateKey(date);
    result.push({
      date: dateKey,
      uniqueVisitors: byDate.get(dateKey) ?? 0,
    });
  }

  return result;
}

function getQuizTitle(
  quizzes: QuizVisitorStatsDbRow["quizzes"]
): string {
  if (!quizzes) {
    return "";
  }

  if (Array.isArray(quizzes)) {
    return quizzes[0]?.title ?? "";
  }

  return quizzes.title;
}

export async function getDailyVisitorStats(
  days = 30
): Promise<DailyVisitorStat[]> {
  const supabase = await createServerClient();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  const startDateKey = getUtcDateKey(startDate);

  const { data, error } = await supabase
    .from("daily_visitor_stats")
    .select("visit_date, unique_visitors")
    .gte("visit_date", startDateKey)
    .order("visit_date", { ascending: true });

  if (error) {
    console.error("[visitor-stats] getDailyVisitorStats failed", error);
    return fillDailyStats(days, []);
  }

  return fillDailyStats(days, (data ?? []) as DailyVisitorStatsRow[]);
}

export async function getTodayQuizVisitorStats(): Promise<QuizVisitorStatRow[]> {
  const supabase = await createServerClient();
  const today = getUtcDateKey();

  const { data, error } = await supabase
    .from("daily_quiz_visitor_stats")
    .select("visit_date, quiz_slug, unique_visitors, quizzes(title)")
    .eq("visit_date", today)
    .order("unique_visitors", { ascending: false });

  if (error) {
    console.error("[visitor-stats] getTodayQuizVisitorStats failed", error);
    return [];
  }

  return ((data ?? []) as QuizVisitorStatsDbRow[]).map((row) => ({
    visitDate: row.visit_date,
    quizSlug: row.quiz_slug,
    quizTitle: getQuizTitle(row.quizzes) || row.quiz_slug,
    uniqueVisitors: row.unique_visitors,
  }));
}

export async function getTopQuizVisitorStats(
  days = 7
): Promise<QuizVisitorSummary[]> {
  const supabase = await createServerClient();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  const startDateKey = getUtcDateKey(startDate);

  const { data, error } = await supabase
    .from("daily_quiz_visitor_stats")
    .select("quiz_slug, unique_visitors, quizzes(title)")
    .gte("visit_date", startDateKey);

  if (error) {
    console.error("[visitor-stats] getTopQuizVisitorStats failed", error);
    return [];
  }

  const totals = new Map<string, QuizVisitorSummary>();

  for (const row of (data ?? []) as QuizVisitorStatsDbRow[]) {
    const existing = totals.get(row.quiz_slug);
    const title = getQuizTitle(row.quizzes) || row.quiz_slug;

    if (existing) {
      existing.uniqueVisitors += row.unique_visitors;
      continue;
    }

    totals.set(row.quiz_slug, {
      quizSlug: row.quiz_slug,
      quizTitle: title,
      uniqueVisitors: row.unique_visitors,
    });
  }

  return [...totals.values()].sort(
    (left, right) => right.uniqueVisitors - left.uniqueVisitors
  );
}
