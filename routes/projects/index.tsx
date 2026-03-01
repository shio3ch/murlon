import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import ProjectList from "../../islands/ProjectList.tsx";
import type { ProjectRecord, Visibility } from "../../lib/types.ts";

interface ProjectWithMemberCount extends ProjectRecord {
  memberCount: number;
}

interface ProjectsPageData {
  user: { id: string; name: string; email: string };
  projects: ProjectWithMemberCount[];
}

export const handler: Handlers<ProjectsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        visibility: p.visibility as Visibility,
        ownerId: p.ownerId,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        memberCount: p._count.members,
      })),
    });
  },
};

export default function ProjectsPage({ data }: PageProps<ProjectsPageData>) {
  const { user, projects } = data;

  return (
    <Layout user={user}>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p class="text-gray-500 mt-1">参加しているプロジェクト一覧</p>
        </div>
        <a
          href="/projects/new"
          class="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          新規作成
        </a>
      </div>

      <ProjectList initialProjects={projects} userId={user.id} />
    </Layout>
  );
}
