import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Header from "../../components/Header.tsx";
import ReportView from "../../islands/ReportView.tsx";
import PdfExportButton from "../../islands/PdfExportButton.tsx";
import type { EntryRecord, ReportRecord } from "../../lib/types.ts";

interface MonthlyReportData {
  user: { id: string; name: string; email: string };
  report: ReportRecord | null;
  entries: EntryRecord[];
  monthStart: string;
  monthEnd: string;
  year: number;
  month: number;
}

export const handler: Handlers<MonthlyReportData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const url = new URL(req.url);
    const now = new Date();
    const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

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
          type: "MONTHLY",
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),
    ]);

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      report: report
        ? {
          ...report,
          type: report.type as "MONTHLY",
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
      monthStart: startDate.toISOString().split("T")[0],
      monthEnd: endDate.toISOString().split("T")[0],
      year,
      month,
    });
  },
};

export default function MonthlyReportPage({ data }: PageProps<MonthlyReportData>) {
  const { user, report, entries, monthStart, monthEnd, year, month } = data;

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-3xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">月報</h1>
            <p class="text-gray-500 mt-1">
              {year}年{month}月
            </p>
          </div>
          <div class="flex gap-2">
            <PdfExportButton title={`月報_${year}年${month}月`} />
            <a
              href={`/reports/monthly?year=${prevMonth.year}&month=${prevMonth.month}`}
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              ← 前月
            </a>
            <a
              href={`/reports/monthly?year=${nextMonth.year}&month=${nextMonth.month}`}
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              翌月 →
            </a>
          </div>
        </div>

        <ReportView
          report={report}
          entries={entries}
          reportType="MONTHLY"
          startDate={monthStart}
          endDate={monthEnd}
          userId={user.id}
        />
      </main>
    </div>
  );
}
