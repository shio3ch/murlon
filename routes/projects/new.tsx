import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import Layout from "../../components/Layout.tsx";
import ProjectForm from "../../islands/ProjectForm.tsx";

interface NewProjectPageData {
  user: { id: string; name: string; email: string };
}

export const handler: Handlers<NewProjectPageData> = {
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

export default function NewProjectPage({ data }: PageProps<NewProjectPageData>) {
  const { user } = data;

  return (
    <Layout user={user} maxWidth="xl">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">新規プロジェクト作成</h1>
        <p class="text-gray-500 mt-1">プロジェクトを作成して分報を整理しましょう</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ProjectForm mode="create" />
      </div>
    </Layout>
  );
}
