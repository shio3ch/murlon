import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import StandupIsland from "../../islands/StandupIsland.tsx";

interface StandupPageData {
  user: { id: string; name: string; email: string };
  projects: { id: string; name: string }[];
}

export const handler: Handlers<StandupPageData> = {
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
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      projects,
    });
  },
};

export default function StandupPage({ data }: PageProps<StandupPageData>) {
  const { user, projects } = data;

  return (
    <Layout user={user}>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">スタンドアップ</h1>
        <p class="text-gray-500 mt-1">
          今日の分報からScrum形式のスタンドアップを自動生成します
        </p>
      </div>

      <StandupIsland projects={projects} />
    </Layout>
  );
}
