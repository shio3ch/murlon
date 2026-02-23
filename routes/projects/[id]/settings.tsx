import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import Header from "../../../components/Header.tsx";
import ProjectForm from "../../../islands/ProjectForm.tsx";
import ProjectDeleteButton from "../../../islands/ProjectDeleteButton.tsx";
import type { Visibility } from "../../../lib/types.ts";

interface SettingsPageData {
  user: { id: string; name: string; email: string };
  project: {
    id: string;
    name: string;
    description: string | null;
    visibility: Visibility;
    ownerId: string;
  };
  isOwner: boolean;
}

export const handler: Handlers<SettingsPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return new Response(null, { status: 302, headers: { Location: "/projects" } });
    }

    const isOwner = project.ownerId === session.userId;
    const isAdmin = project.members.some(
      (m) => m.userId === session.userId && m.role === "ADMIN",
    );

    if (!isOwner && !isAdmin) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/projects/${id}` },
      });
    }

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility as Visibility,
        ownerId: project.ownerId,
      },
      isOwner,
    });
  },
};

export default function ProjectSettingsPage({ data }: PageProps<SettingsPageData>) {
  const { user, project, isOwner } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-xl mx-auto px-4 py-8">
        <div class="mb-6">
          <a
            href={`/projects/${project.id}`}
            class="inline-flex items-center text-sm text-gray-500 hover:text-brand-600 mb-3"
          >
            ← プロジェクトに戻る
          </a>
          <h1 class="text-2xl font-bold text-gray-900">プロジェクト設定</h1>
          <p class="text-gray-500 mt-1">{project.name}</p>
        </div>

        {/* Edit form */}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">基本設定</h2>
          <ProjectForm
            mode="edit"
            initialData={{
              id: project.id,
              name: project.name,
              description: project.description,
              visibility: project.visibility,
            }}
          />
        </div>

        {/* Danger zone - owner only */}
        {isOwner && (
          <div class="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h2 class="text-lg font-semibold text-red-600 mb-2">危険な操作</h2>
            <p class="text-sm text-gray-500 mb-4">
              プロジェクトを削除すると、関連する全てのデータが削除されます。この操作は取り消せません。
            </p>
            <ProjectDeleteButton
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        )}
      </main>
    </div>
  );
}
