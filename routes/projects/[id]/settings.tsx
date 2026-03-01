import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import Layout from "../../../components/Layout.tsx";
import ProjectForm from "../../../islands/ProjectForm.tsx";
import ProjectDeleteButton from "../../../islands/ProjectDeleteButton.tsx";
import MemberManager from "../../../islands/MemberManager.tsx";
import type { ProjectRole, Visibility } from "../../../lib/types.ts";

interface MemberWithUser {
  id: string;
  userId: string;
  role: ProjectRole;
  user: { id: string; name: string; email: string };
}

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
  members: MemberWithUser[];
  ownerUser: { id: string; name: string; email: string };
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
      include: {
        members: { include: { user: true } },
        owner: true,
      },
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

    const members: MemberWithUser[] = project.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role as ProjectRole,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      },
    }));

    const ownerUser = {
      id: project.owner.id,
      name: project.owner.name,
      email: project.owner.email,
    };

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
      members,
      ownerUser,
    });
  },
};

export default function ProjectSettingsPage({ data }: PageProps<SettingsPageData>) {
  const { user, project, isOwner, members, ownerUser } = data;

  return (
    <Layout user={user} maxWidth="xl">
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

      {/* Member management */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">メンバー管理</h2>
        <MemberManager
          projectId={project.id}
          initialMembers={members}
          ownerUser={ownerUser}
          currentUserId={user.id}
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
    </Layout>
  );
}
