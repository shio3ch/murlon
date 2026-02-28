import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Layout from "../../components/Layout.tsx";
import GoogleCalendarDisconnect from "../../islands/GoogleCalendarDisconnect.tsx";

interface GoogleCalendarPageData {
  user: { id: string; name: string; email: string };
  isConnected: boolean;
  error?: string;
}

export const handler: Handlers<GoogleCalendarPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: session.userId },
    });

    const url = new URL(req.url);
    const error = url.searchParams.get("error") ?? undefined;

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      isConnected: !!connection,
      error,
    });
  },
};

export default function GoogleCalendarPage(
  { data }: PageProps<GoogleCalendarPageData>,
) {
  const { user, isConnected, error } = data;

  return (
    <Layout user={user} maxWidth="2xl">
      {/* Breadcrumb */}
      <div class="text-sm text-gray-500 mb-4">
        <a href="/dashboard" class="hover:text-brand-600">設定</a>
        <span class="mx-1">/</span>
        <span class="text-gray-700">Google Calendar連携</span>
      </div>

      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          Google Calendar連携
        </h1>
        <p class="text-gray-500 mt-1">
          Google Calendarと連携して、今日の予定を分報画面に表示できます
        </p>
      </div>

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {isConnected
          ? (
            <div>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-3 h-3 bg-green-500 rounded-full" />
                <span class="text-gray-800 font-medium">
                  Google Calendarと連携済み
                </span>
              </div>
              <p class="text-gray-500 text-sm mb-4">
                ダッシュボードに今日のカレンダーイベントが表示されます。
              </p>
              <GoogleCalendarDisconnect />
            </div>
          )
          : (
            <div>
              <p class="text-gray-600 mb-4">
                Google Calendarと連携すると、今日の予定をダッシュボードで確認できるようになります。
              </p>
              <a
                href="/api/calendar/auth"
                class="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Google Calendarと連携する
              </a>
            </div>
          )}
      </div>
    </Layout>
  );
}
