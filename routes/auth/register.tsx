import { type Handlers, type PageProps } from "$fresh/server.ts";
import { createSession, getSession, hashPassword, setSessionCookie } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";

interface RegisterData {
  error?: string;
}

export const handler: Handlers<RegisterData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (session) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
    return ctx.render({});
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const name = form.get("name")?.toString().trim();
    const email = form.get("email")?.toString().trim().toLowerCase();
    const password = form.get("password")?.toString();
    const confirmPassword = form.get("confirmPassword")?.toString();

    if (!name || !email || !password || !confirmPassword) {
      return ctx.render({ error: "すべての項目を入力してください" });
    }

    if (password.length < 8) {
      return ctx.render({ error: "パスワードは8文字以上で入力してください" });
    }

    if (password !== confirmPassword) {
      return ctx.render({ error: "パスワードが一致しません" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return ctx.render({ error: "このメールアドレスはすでに登録されています" });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

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

export default function Register({ data }: PageProps<RegisterData>) {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-brand-700">murlon</h1>
          <p class="text-gray-500 mt-2 text-sm">書くだけで日報が完成する</p>
        </div>

        <h2 class="text-xl font-semibold text-gray-800 mb-6">新規登録</h2>

        {data.error && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {data.error}
          </div>
        )}

        <form method="POST" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="name">
              お名前
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="山田 太郎"
            />
          </div>

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
              minLength={8}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="8文字以上"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="confirmPassword">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="パスワードを再入力"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            アカウントを作成
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          すでにアカウントをお持ちの方は{" "}
          <a href="/auth/login" class="text-brand-600 hover:underline font-medium">
            ログイン
          </a>
        </p>
      </div>
    </div>
  );
}
