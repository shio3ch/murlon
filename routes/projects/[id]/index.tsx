import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import Header from "../../../components/Header.tsx";
import DashboardIsland from "../../../islands/DashboardIsland.tsx";
import type {
  EntryRecord,
  ProjectMemberRecord,
  ProjectRecord,
  ProjectRole,
  Visibility,
} from "../../../lib/types.ts";

interface ProjectDetail extends ProjectRecord {
  members: (ProjectMemberRecord & {
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  })[];
}

interface ProjectPageData {
  user: { id: string; name: string; email: string };
  project: ProjectDetail;
  entries: EntryRecord[];
  isOwner: boolean;
  isAdmin: boolean;
}

export const handler: Handlers<ProjectPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!project) {
      return new Response(null, { status: 302, headers: { Location: "/projects" } });
    }

    const isMember = project.members.some((m) => m.userId === session.userId);
    if (project.ownerId !== session.userId && !isMember) {
      return new Response(null, { status: 302, headers: { Location: "/projects" } });
    }

    const entries = await prisma.entry.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const isOwner = project.ownerId === session.userId;
    const isAdmin = project.members.some(
      (m) => m.userId === session.userId && m.role === "ADMIN",
    );

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility as Visibility,
        ownerId: project.ownerId,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        members: project.members.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          userId: m.userId,
          role: m.role as ProjectRole,
          createdAt: new Date(m.createdAt),
          user: m.user,
        })),
      },
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })),
      isOwner,
      isAdmin,
    });
  },
};

function visibilityLabel(v: Visibility): string {
  switch (v) {
    case "PRIVATE":
      return "非公開";
    case "LIMITED":
      return "限定公開";
    case "PUBLIC":
      return "公開";
  }
}

function visibilityColor(v: Visibility): string {
  switch (v) {
    case "PRIVATE":
      return "bg-gray-100 text-gray-600";
    case "LIMITED":
      return "bg-yellow-100 text-yellow-700";
    case "PUBLIC":
      return "bg-green-100 text-green-700";
  }
}

function roleLabel(role: ProjectRole): string {
  switch (role) {
    case "ADMIN":
      return "管理者";
    case "CONTRIBUTOR":
      return "投稿者";
    case "COMMENTER":
      return "コメント者";
    case "VIEWER":
      return "閲覧者";
  }
}

export default function ProjectDetailPage({ data }: PageProps<ProjectPageData>) {
  const { user, project, entries, isOwner, isAdmin } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-3xl mx-auto px-4 py-8">
        {/* Project header */}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900">{project.name}</h1>
                <span
                  class={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    visibilityColor(project.visibility)
                  }`}
                >
                  {visibilityLabel(project.visibility)}
                </span>
              </div>
              {project.description && <p class="text-gray-500 mt-2">{project.description}</p>}
            </div>
            <div class="flex items-center gap-2">
              <a
                href={`/projects/${project.id}/tasks`}
                class="text-sm text-gray-500 hover:text-brand-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-brand-300 transition-colors"
              >
                タスク管理
              </a>
              <a
                href={`/projects/${project.id}/reports`}
                class="text-sm text-gray-500 hover:text-brand-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-brand-300 transition-colors"
              >
                レポート
              </a>
              {(isOwner || isAdmin) && (
                <a
                  href={`/projects/${project.id}/settings`}
                  class="text-sm text-gray-500 hover:text-brand-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-brand-300 transition-colors"
                >
                  設定
                </a>
              )}
            </div>
          </div>

          {/* Members */}
          <div class="mt-4 pt-4 border-t border-gray-100">
            <h2 class="text-sm font-semibold text-gray-500 mb-2">
              メンバー ({project.members.length}人)
            </h2>
            <div class="flex flex-wrap gap-2">
              {project.members.map((member) => (
                <div
                  key={member.id}
                  class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5"
                >
                  <span class="text-sm text-gray-700">{member.user.name}</span>
                  <span class="text-xs text-gray-400">{roleLabel(member.role)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entry form + timeline via DashboardIsland */}
        <DashboardIsland
          initialEntries={entries}
          userId={user.id}
          projectId={project.id}
        />
      </main>
    </div>
  );
}
