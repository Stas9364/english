export type DailyVisitorStat = {
  date: string;
  uniqueVisitors: number;
};

export type QuizVisitorStatRow = {
  visitDate: string;
  quizSlug: string;
  quizTitle: string;
  uniqueVisitors: number;
};

export type QuizVisitorSummary = {
  quizSlug: string;
  quizTitle: string;
  uniqueVisitors: number;
};

export const VISITOR_STATS_PERIODS = [1, 7, 30] as const;

export type VisitorStatsPeriod = (typeof VISITOR_STATS_PERIODS)[number];

export type VisitorStatsPeriodData = {
  daily: DailyVisitorStat[];
  quizzes: QuizVisitorSummary[];
};
