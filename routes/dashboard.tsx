import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../lib/auth.ts";
import { prisma } from "../lib/db.ts";
import Layout from "../components/Layout.tsx";
import DashboardIsland from "../islands/DashboardIsland.tsx";
import CalendarEvents from "../islands/CalendarEvents.tsx";
import type { EntryRecord, ReportRecord, ReportType } from "../lib/types.ts";

interface DashboardData {
  user: { id: string; name: string; email: string };
  entries: EntryRecord[];
  projects: { id: string; name: string }[];
  recentReports: (ReportRecord & { projectName?: string })[];
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const [entries, ownedProjects, memberProjects, recentReports] = await Promise.all([
      prisma.entry.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.project.findMany({
        where: { ownerId: session.userId },
        select: { id: true, name: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.projectMember.findMany({
        where: { userId: session.userId },
        select: { project: { select: { id: true, name: true } } },
      }),
      prisma.report.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { project: { select: { name: true } } },
      }),
    ]);

    const projectMap = new Map<string, string>();
    for (const p of ownedProjects) {
      projectMap.set(p.id, p.name);
    }
    for (const m of memberProjects) {
      projectMap.set(m.project.id, m.project.name);
    }
    const projects = Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        author: e.user
          ? { id: e.user.id, name: e.user.name, avatarUrl: e.user.avatarUrl }
          : undefined,
      })),
      projects,
      recentReports: recentReports.map((r) => ({
        ...r,
        type: r.type as ReportType,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        projectName: r.project?.name ?? undefined,
      })),
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

export default function Dashboard({ data }: PageProps<DashboardData>) {
  const { user, entries, projects, recentReports } = data;

  return (
    <Layout user={user} maxWidth="5xl">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          こんにちは、{user.name}さん
        </h1>
        <p class="text-gray-500 mt-1">今日も一言から始めましょう</p>
      </div>

      <CalendarEvents />

      <DashboardIsland
        initialEntries={entries}
        userId={user.id}
        projects={projects}
      />

      {/* Recent reports */}
      {recentReports.length > 0 && (
        <div class="mt-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            最近のレポート
          </h2>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {recentReports.map((r) => {
              const href = r.projectId
                ? `/projects/${r.projectId}/reports?type=${r.type}&date=${
                  new Date(r.startDate).toISOString().split("T")[0]
                }`
                : `/reports/${r.type.toLowerCase()}?date=${
                  new Date(r.startDate).toISOString().split("T")[0]
                }`;
              return (
                <a
                  key={r.id}
                  href={href}
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
                    {r.projectName && (
                      <span class="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        {r.projectName}
                      </span>
                    )}
                  </div>
                  <span class="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      {projects.length > 0 && (
        <div class="mt-8">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            プロジェクト
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {projects.map((p) => (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                class="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 hover:border-brand-300 hover:shadow transition-all"
              >
                <span class="text-sm font-medium text-gray-700">{p.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
