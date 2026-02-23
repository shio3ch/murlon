import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import Header from "../../components/Header.tsx";

interface SettingsPageData {
  user: { name: string; email: string };
}

export const handler: Handlers<SettingsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }
    return ctx.render({ user: { name: session.name, email: session.email } });
  },
};

export default function SettingsPage({ data }: PageProps<SettingsPageData>) {
  const { user } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-2xl mx-auto px-4 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">設定</h1>
          <p class="text-gray-500 mt-1">アカウントとアプリの設定を管理します</p>
        </div>

        <div class="space-y-4">
          <a
            href="/settings/templates"
            class="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900">テンプレート管理</h2>
                <p class="text-sm text-gray-500 mt-0.5">
                  レポート生成に使用するテンプレートを管理します
                </p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </a>

          <a
            href="/settings/integrations"
            class="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-brand-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900">外部連携</h2>
                <p class="text-sm text-gray-500 mt-0.5">
                  Slack・Discord へのレポート自動投稿を設定します
                </p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
