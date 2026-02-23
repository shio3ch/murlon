import { type Handlers, type PageProps } from "$fresh/server.ts";
import { createSession, getSession, setSessionCookie, verifyPassword } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";

interface LoginData {
  error?: string;
}

export const handler: Handlers<LoginData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (session) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    return ctx.render({});
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const email = form.get("email")?.toString().trim().toLowerCase();
    const password = form.get("password")?.toString();

    if (!email || !password) {
      return ctx.render({ error: "メールアドレスとパスワードを入力してください" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return ctx.render({ error: "メールアドレスまたはパスワードが正しくありません" });
    }

    if (!user.passwordHash) {
      return ctx.render({ error: "メールアドレスまたはパスワードが正しくありません" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return ctx.render({ error: "メールアドレスまたはパスワードが正しくありません" });
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const headers = new Headers({ Location: "/" });
    setSessionCookie(headers, token);
    return new Response(null, { status: 302, headers });
  },
};

export default function Login({ data }: PageProps<LoginData>) {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-brand-700">murlon</h1>
          <p class="text-gray-500 mt-2 text-sm">書くだけで日報が完成する</p>
        </div>

        <h2 class="text-xl font-semibold text-gray-800 mb-6">ログイン</h2>

        {data.error && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {data.error}
          </div>
        )}

        <form method="POST" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="email">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="password">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="パスワード"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            ログイン
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          アカウントをお持ちでない方は{" "}
          <a href="/auth/register" class="text-brand-600 hover:underline font-medium">
            新規登録
          </a>
        </p>
      </div>
    </div>
  );
}
