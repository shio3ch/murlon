import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Header from "../../components/Header.tsx";
import GitHubSettingsIsland from "../../islands/GitHubSettingsIsland.tsx";

interface GitHubPageData {
  user: { id: string; name: string; email: string };
  connection: {
    githubLogin: string;
    lastImportedAt: string | null;
  } | null;
}

export const handler: Handlers<GitHubPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const conn = await prisma.gitHubConnection.findUnique({
      where: { userId: session.userId },
    });

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      connection: conn
        ? {
          githubLogin: conn.githubLogin,
          lastImportedAt: conn.lastImportedAt?.toISOString() ?? null,
        }
        : null,
    });
  },
};

export default function GitHubSettingsPage(
  { data }: PageProps<GitHubPageData>,
) {
  const { user, connection } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div class="text-sm text-gray-500 mb-4">
          <a href="/dashboard" class="hover:text-brand-600">設定</a>
          <span class="mx-1">/</span>
          <span class="text-gray-700">GitHub連携</span>
        </div>

        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">GitHub連携</h1>
          <p class="text-gray-500 mt-1">
            GitHubリポジトリのコミットを分報としてインポートできます
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <GitHubSettingsIsland connection={connection} />
        </div>
      </main>
    </div>
  );
}
