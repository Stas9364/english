"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  VISITOR_STATS_PERIODS,
  type VisitorStatsPeriod,
  type VisitorStatsPeriodData,
} from "@/lib/visitor-stats-types";

const chartConfig = {
  uniqueVisitors: {
    label: "Unique visitors",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const periodLabels: Record<VisitorStatsPeriod, string> = {
  1: "Day",
  7: "7 days",
  30: "30 days",
};

function formatChartLabel(date: string, period: VisitorStatsPeriod): string {
  if (period === 1) {
    return "Today";
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function sumUniqueVisitors(daily: VisitorStatsPeriodData["daily"]): number {
  return daily.reduce((total, row) => total + row.uniqueVisitors, 0);
}

interface AdminVisitorStatsProps {
  dataByPeriod: Record<VisitorStatsPeriod, VisitorStatsPeriodData>;
}

export function AdminVisitorStats({ dataByPeriod }: AdminVisitorStatsProps) {
  const [period, setPeriod] = useState<VisitorStatsPeriod>(7);
  const { daily, quizzes } = dataByPeriod[period];

  const chartData = useMemo(
    () =>
      daily.map((row) => ({
        date: row.date,
        label: formatChartLabel(row.date, period),
        uniqueVisitors: row.uniqueVisitors,
      })),
    [daily, period]
  );

  const totalVisitors = sumUniqueVisitors(daily);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Unique visitors on quiz pages (UTC).
        </p>
        <div className="flex flex-wrap gap-2">
          {VISITOR_STATS_PERIODS.map((value) => (
            <Button
              key={value}
              type="button"
              variant={period === value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(value)}
            >
              {periodLabels[value]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-4 py-5 lg:col-span-1">
          <CardHeader className="px-5 pb-0">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total for period
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-2xl font-semibold tracking-tight">{totalVisitors}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {period === 1
                ? "Unique visitors today"
                : "Sum of daily uniques (same person on multiple days counts more than once)"}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-4 py-5 lg:col-span-2">
          <CardHeader className="px-5 pb-0">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Visitors by day
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={period === 30 ? 4 : 0}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload as { date?: string } | undefined;
                        return item?.date ?? "";
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="uniqueVisitors"
                  fill="var(--color-uniqueVisitors)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5 pb-0">
          <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Quizzes ({periodLabels[period].toLowerCase()})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {quizzes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No quiz visits in this period.</p>
          ) : (
            <div className="h-[600px] overflow-y-auto overflow-x-auto pr-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="text-muted-foreground pb-2 font-medium">Quiz</th>
                    <th className="text-muted-foreground pb-2 text-right font-medium">
                      Unique visitors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((quiz) => (
                    <tr key={quiz.quizSlug} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{quiz.quizTitle}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {quiz.uniqueVisitors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
