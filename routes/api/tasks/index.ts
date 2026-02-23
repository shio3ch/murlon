import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse, TaskPriority, TaskRecord, TaskStatus } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return Response.json(
        { success: false, error: "projectIdは必須です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // プロジェクトへのアクセス権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId: session.userId } } },
    });

    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (project.ownerId !== session.userId && project.members.length === 0) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    const data: TaskRecord[] = tasks.map((t) => ({
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
    }));

    return Response.json(
      { success: true, data } satisfies ApiResponse<TaskRecord[]>,
    );
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    let body: {
      projectId?: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.projectId) {
      return Response.json(
        { success: false, error: "projectIdは必須です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const title = body.title?.trim();
    if (!title) {
      return Response.json(
        { success: false, error: "タイトルを入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // プロジェクトへのアクセス権確認
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: { members: { where: { userId: session.userId } } },
    });

    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (project.ownerId !== session.userId && project.members.length === 0) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    if (body.status && !["TODO", "IN_PROGRESS", "DONE", "HOLD"].includes(body.status)) {
      return Response.json(
        { success: false, error: "無効なステータスです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (body.priority && !["HIGH", "MEDIUM", "LOW"].includes(body.priority)) {
      return Response.json(
        { success: false, error: "無効な優先度です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const task = await prisma.task.create({
      data: {
        projectId: body.projectId,
        title,
        description: body.description?.trim() || null,
        status: (body.status as TaskStatus) || "TODO",
        priority: (body.priority as TaskPriority) || "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assigneeId: body.assigneeId || null,
      },
    });

    const data: TaskRecord = {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<TaskRecord>,
      { status: 201 },
    );
  },
};
