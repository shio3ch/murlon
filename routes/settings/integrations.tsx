import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import IntegrationSettingsIsland from "../../islands/IntegrationSettingsIsland.tsx";
import type { ProjectRecord } from "../../lib/types.ts";

interface IntegrationsPageData {
  user: { id: string; name: string; email: string };
  projects: ProjectRecord[];
}

export const handler: Handlers<IntegrationsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const projectRows = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const projects: ProjectRecord[] = projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      visibility: p.visibility as ProjectRecord["visibility"],
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      projects,
    });
  },
};

export default function IntegrationsPage({ data }: PageProps<IntegrationsPageData>) {
  const { user, projects } = data;

  return (
    <Layout user={user} maxWidth="2xl">
      {/* Breadcrumb */}
      <div class="text-sm text-gray-500 mb-4">
        <a href="/dashboard" class="hover:text-brand-600">設定</a>
        <span class="mx-1">/</span>
        <span class="text-gray-700">外部連携</span>
      </div>

      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">外部連携設定</h1>
        <p class="text-gray-500 mt-1">
          SlackやDiscordのWebhookを設定して、レポートを共有できます
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <IntegrationSettingsIsland projects={projects} />
      </div>
    </Layout>
  );
}
