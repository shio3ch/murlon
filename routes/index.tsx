import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../lib/auth.ts";
import { prisma } from "../lib/db.ts";
import Header from "../components/Header.tsx";
import DashboardIsland from "../islands/DashboardIsland.tsx";
import type { EntryRecord } from "../lib/types.ts";

interface HomeData {
  user: { id: string; name: string; email: string };
  entries: EntryRecord[];
}

export const handler: Handlers<HomeData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const entries = await prisma.entry.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })),
    });
  },
};

export default function Home({ data }: PageProps<HomeData>) {
  const { user, entries } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-3xl mx-auto px-4 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">こんにちは、{user.name}さん</h1>
          <p class="text-gray-500 mt-1">今日も一言から始めましょう</p>
        </div>

        <DashboardIsland initialEntries={entries} userId={user.id} />
      </main>
    </div>
  );
}
