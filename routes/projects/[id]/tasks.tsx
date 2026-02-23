import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import Header from "../../../components/Header.tsx";
import KanbanBoard from "../../../islands/KanbanBoard.tsx";
import type { TaskPriority, TaskRecord, TaskStatus } from "../../../lib/types.ts";

interface TasksPageData {
  user: { id: string; name: string; email: string };
  project: { id: string; name: string };
  tasks: TaskRecord[];
}

export const handler: Handlers<TasksPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: { where: { userId: session.userId } } },
    });

    if (!project) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/projects" },
      });
    }

    if (project.ownerId !== session.userId && project.members.length === 0) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/projects" },
      });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      project: { id: project.id, name: project.name },
      tasks: tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        dueDate: t.dueDate,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  },
};

export default function TasksPage({ data }: PageProps<TasksPageData>) {
  const { user, project, tasks } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div class="text-sm text-gray-500 mb-4">
          <a href="/projects" class="hover:text-brand-600">プロジェクト</a>
          <span class="mx-1">/</span>
          <a href={`/projects/${project.id}`} class="hover:text-brand-600">
            {project.name}
          </a>
          <span class="mx-1">/</span>
          <span class="text-gray-700">タスク管理</span>
        </div>

        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900">
            {project.name} - タスク管理
          </h1>
        </div>

        {/* Kanban board */}
        <KanbanBoard initialTasks={tasks} projectId={project.id} />
      </main>
    </div>
  );
}
