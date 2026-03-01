import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import Layout from "../../../components/Layout.tsx";
import ReportView from "../../../islands/ReportView.tsx";
import PdfExportButton from "../../../islands/PdfExportButton.tsx";
import type {
  EntryRecord,
  ReportRecord,
  ReportTemplateRecord,
  ReportType,
} from "../../../lib/types.ts";

interface ProjectReportsPageData {
  user: { id: string; name: string; email: string };
  project: { id: string; name: string };
  reports: ReportRecord[];
  currentReport: ReportRecord | null;
  entries: EntryRecord[];
  reportType: ReportType;
  startDate: string;
  endDate: string;
  templates: ReportTemplateRecord[];
}

function getDateRange(
  type: ReportType,
  dateStr: string,
): { startDate: string; endDate: string } {
  const date = new Date(dateStr);
  switch (type) {
    case "DAILY":
      return { startDate: dateStr, endDate: dateStr };
    case "WEEKLY": {
      const day = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: monday.toISOString().split("T")[0],
        endDate: sunday.toISOString().split("T")[0],
      };
    }
    case "MONTHLY": {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      };
    }
  }
}

export const handler: Handlers<ProjectReportsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const { id } = ctx.params;
    const url = new URL(req.url);
    const reportType = (url.searchParams.get("type") || "DAILY") as ReportType;
    const dateStr = url.searchParams.get("date") ||
      new Date().toISOString().split("T")[0];

    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(reportType)) {
      return new Response(null, { status: 302, headers: { Location: `/projects/${id}/reports` } });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: { where: { userId: session.userId } } },
    });

    if (!project) {
      return new Response(null, { status: 302, headers: { Location: "/projects" } });
    }

    if (project.ownerId !== session.userId && project.members.length === 0) {
      return new Response(null, { status: 302, headers: { Location: "/projects" } });
    }

    const { startDate, endDate } = getDateRange(reportType, dateStr);
    const startDateTime = new Date(startDate + "T00:00:00");
    const endDateTime = new Date(endDate + "T23:59:59");

    let templateRows: Array<{
      id: string;
      userId: string | null;
      name: string;
      type: string;
      prompt: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    try {
      templateRows = await prisma.reportTemplate.findMany({
        where: { OR: [{ userId: session.userId }, { userId: null }] },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      // reportTemplate テーブルが未作成の場合は空配列
    }

    const [entries, currentReport, reports] = await Promise.all([
      prisma.entry.findMany({
        where: {
          userId: session.userId,
          projectId: id,
          createdAt: { gte: startDateTime, lte: endDateTime },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.report.findFirst({
        where: {
          userId: session.userId,
          projectId: id,
          type: reportType,
          startDate: { lte: endDateTime },
          endDate: { gte: startDateTime },
        },
      }),
      prisma.report.findMany({
        where: {
          userId: session.userId,
          projectId: id,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const templates: ReportTemplateRecord[] = templateRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      type: r.type as ReportType,
      prompt: r.prompt,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));

    const mapReport = (r: typeof currentReport) =>
      r
        ? {
          ...r,
          type: r.type as ReportType,
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        }
        : null;

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      project: { id: project.id, name: project.name },
      reports: reports.map((r) => mapReport(r)!),
      currentReport: mapReport(currentReport),
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })),
      reportType,
      startDate,
      endDate,
      templates,
    });
  },
};

function reportTypeLabel(type: ReportType): string {
  switch (type) {
    case "DAILY":
      return "日報";
    case "WEEKLY":
      return "週報";
    case "MONTHLY":
      return "月報";
  }
}

export default function ProjectReportsPage({ data }: PageProps<ProjectReportsPageData>) {
  const {
    user,
    project,
    reports,
    currentReport,
    entries,
    reportType,
    startDate,
    endDate,
    templates,
  } = data;

  return (
    <Layout user={user}>
      {/* Breadcrumb */}
      <div class="text-sm text-gray-500 mb-4">
        <a href="/projects" class="hover:text-brand-600">プロジェクト</a>
        <span class="mx-1">/</span>
        <a href={`/projects/${project.id}`} class="hover:text-brand-600">{project.name}</a>
        <span class="mx-1">/</span>
        <span class="text-gray-700">レポート</span>
      </div>

      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          {project.name} - レポート
        </h1>
        <PdfExportButton
          title={`${project.name}_${reportTypeLabel(reportType)}_${startDate}`}
        />
      </div>

      {/* Report type tabs */}
      <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(["DAILY", "WEEKLY", "MONTHLY"] as ReportType[]).map((t) => (
          <a
            key={t}
            href={`/projects/${project.id}/reports?type=${t}&date=${startDate}`}
            class={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              reportType === t
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {reportTypeLabel(t)}
          </a>
        ))}
      </div>

      {/* Report view */}
      <ReportView
        report={currentReport}
        entries={entries}
        reportType={reportType}
        startDate={startDate}
        endDate={endDate}
        userId={user.id}
        projectId={project.id}
        templates={templates}
      />

      {/* Past reports */}
      {reports.length > 0 && (
        <div class="mt-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            過去のレポート
          </h2>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {reports.map((r) => (
              <a
                key={r.id}
                href={`/projects/${project.id}/reports?type=${r.type}&date=${
                  new Date(r.startDate).toISOString().split("T")[0]
                }`}
                class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded font-medium">
                    {reportTypeLabel(r.type)}
                  </span>
                  <span class="text-sm text-gray-700">
                    {new Date(r.startDate).toLocaleDateString("ja-JP")}
                    {r.type !== "DAILY" && (
                      <>〜 {new Date(r.endDate).toLocaleDateString("ja-JP")}</>
                    )}
                  </span>
                </div>
                <span class="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("ja-JP")} 生成
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
