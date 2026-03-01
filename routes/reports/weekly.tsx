import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import ReportView from "../../islands/ReportView.tsx";
import PdfExportButton from "../../islands/PdfExportButton.tsx";
import type { EntryRecord, ReportRecord } from "../../lib/types.ts";

interface WeeklyReportData {
  user: { id: string; name: string; email: string };
  report: ReportRecord | null;
  entries: EntryRecord[];
  weekStart: string;
  weekEnd: string;
}

function getWeekRange(dateStr: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { startDate: monday, endDate: sunday };
}

export const handler: Handlers<WeeklyReportData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const { startDate, endDate } = getWeekRange(dateStr);

    const [entries, report] = await Promise.all([
      prisma.entry.findMany({
        where: {
          userId: session.userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.report.findFirst({
        where: {
          userId: session.userId,
          type: "WEEKLY",
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),
    ]);

    const weekStartStr = startDate.toISOString().split("T")[0];
    const weekEndStr = endDate.toISOString().split("T")[0];

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      report: report
        ? {
          ...report,
          type: report.type as "WEEKLY",
          startDate: new Date(report.startDate),
          endDate: new Date(report.endDate),
          createdAt: new Date(report.createdAt),
          updatedAt: new Date(report.updatedAt),
        }
        : null,
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })),
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
    });
  },
};

export default function WeeklyReportPage({ data }: PageProps<WeeklyReportData>) {
  const { user, report, entries, weekStart, weekEnd } = data;

  const prevWeek = getPrevWeek(weekStart);
  const nextWeek = getNextWeek(weekStart);

  return (
    <Layout user={user}>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">週報</h1>
          <p class="text-gray-500 mt-1">
            {new Date(weekStart).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" 〜 "}
            {new Date(weekEnd).toLocaleDateString("ja-JP", {
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div class="flex gap-2">
          <PdfExportButton title={`週報_${weekStart}_${weekEnd}`} />
          <a
            href={`/reports/weekly?date=${prevWeek}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            ← 前週
          </a>
          <a
            href={`/reports/weekly?date=${nextWeek}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            翌週 →
          </a>
        </div>
      </div>

      <ReportView
        report={report}
        entries={entries}
        reportType="WEEKLY"
        startDate={weekStart}
        endDate={weekEnd}
        userId={user.id}
      />
    </Layout>
  );
}

function getPrevWeek(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function getNextWeek(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}
