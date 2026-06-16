import { createServerClient } from "@/lib/supabase/server";
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

export {
  extractQuizSlug,
  getUtcDateKey,
  recordQuizVisit,
} from "@/lib/visitor-stats-record";

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
    const dateKey = date.toISOString().slice(0, 10);
    result.push({
      date: dateKey,
      uniqueVisitors: byDate.get(dateKey) ?? 0,
    });
  }

  return result;
}

function getQuizTitle(quizzes: QuizVisitorStatsDbRow["quizzes"]): string {
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
  const startDateKey = startDate.toISOString().slice(0, 10);

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
  const today = new Date().toISOString().slice(0, 10);

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
  const startDateKey = startDate.toISOString().slice(0, 10);

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
