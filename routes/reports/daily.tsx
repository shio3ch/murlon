import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import ReportView from "../../islands/ReportView.tsx";
import PdfExportButton from "../../islands/PdfExportButton.tsx";
import type { EntryRecord, ReportRecord } from "../../lib/types.ts";

interface ReportPageData {
  user: { id: string; name: string; email: string };
  report: ReportRecord | null;
  entries: EntryRecord[];
  date: string;
}

function getDateRange(dateStr: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateStr);
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return { startDate, endDate };
}

export const handler: Handlers<ReportPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") ||
      new Date().toISOString().split("T")[0];

    const { startDate, endDate } = getDateRange(dateStr);

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
          type: "DAILY",
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
          type: report.type as "DAILY",
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
      date: dateStr,
    });
  },
};

export default function DailyReportPage({ data }: PageProps<ReportPageData>) {
  const { user, report, entries, date } = data;

  return (
    <Layout user={user}>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">日報</h1>
          <p class="text-gray-500 mt-1">
            {new Date(date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div class="flex gap-2">
          <PdfExportButton title={`日報_${date}`} />
          <a
            href={`/reports/daily?date=${getPrevDate(date)}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            ← 前日
          </a>
          <a
            href={`/reports/daily?date=${getNextDate(date)}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            翌日 →
          </a>
        </div>
      </div>

      <ReportView
        report={report}
        entries={entries}
        reportType="DAILY"
        startDate={date}
        endDate={date}
        userId={user.id}
      />
    </Layout>
  );
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
