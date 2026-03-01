import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import Layout from "../../components/Layout.tsx";
import InsightsIsland from "../../islands/InsightsIsland.tsx";

interface InsightsPageData {
  user: { id: string; name: string; email: string };
}

export const handler: Handlers<InsightsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
    });
  },
};

export default function InsightsPage({ data }: PageProps<InsightsPageData>) {
  const { user } = data;

  return (
    <Layout user={user}>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">インサイト</h1>
        <p class="text-gray-500 mt-1">分報の活動状況と傾向分析</p>
      </div>

      <InsightsIsland />
    </Layout>
  );
}
