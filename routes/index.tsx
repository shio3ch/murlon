import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../lib/auth.ts";

interface HomeData {
  loggedIn: false;
}

export const handler: Handlers<HomeData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });
    }

    return ctx.render({ loggedIn: false });
  },
};

export default function Home({ data: _data }: PageProps<HomeData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span class="text-2xl font-bold text-brand-600">murlon</span>
          <nav class="flex items-center gap-3">
            <a
              href="/auth/login"
              class="text-sm text-gray-600 hover:text-brand-600 font-medium"
            >
              ログイン
            </a>
            <a
              href="/auth/signup"
              class="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              新規登録
            </a>
          </nav>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          書くだけで日報が完成する
        </h1>
        <p class="text-lg text-gray-500 mb-8">
          分報（短い投稿）をAIが自動集約し、日報・週報・月報を生成します。
        </p>
        <a
          href="/auth/signup"
          class="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          無料で始める
        </a>
      </main>
    </div>
  );
}
