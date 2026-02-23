import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse, TaskPriority, TaskRecord, TaskStatus } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { members: { where: { userId: session.userId } } },
        },
      },
    });

    if (!task) {
      return Response.json(
        { success: false, error: "タスクが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (
      task.project.ownerId !== session.userId &&
      task.project.members.length === 0
    ) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

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
    );
  },

  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { members: { where: { userId: session.userId } } },
        },
      },
    });

    if (!task) {
      return Response.json(
        { success: false, error: "タスクが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (
      task.project.ownerId !== session.userId &&
      task.project.members.length === 0
    ) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    let body: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return Response.json(
          { success: false, error: "タイトルを入力してください" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.title = title;
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.status !== undefined) {
      if (!["TODO", "IN_PROGRESS", "DONE", "HOLD"].includes(body.status)) {
        return Response.json(
          { success: false, error: "無効なステータスです" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }

    if (body.priority !== undefined) {
      if (!["HIGH", "MEDIUM", "LOW"].includes(body.priority)) {
        return Response.json(
          { success: false, error: "無効な優先度です" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.assigneeId !== undefined) {
      updateData.assigneeId = body.assigneeId || null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    const data: TaskRecord = {
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      description: updated.description,
      status: updated.status as TaskStatus,
      priority: updated.priority as TaskPriority,
      dueDate: updated.dueDate,
      assigneeId: updated.assigneeId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<TaskRecord>,
    );
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { members: { where: { userId: session.userId } } },
        },
      },
    });

    if (!task) {
      return Response.json(
        { success: false, error: "タスクが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (
      task.project.ownerId !== session.userId &&
      task.project.members.length === 0
    ) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    await prisma.task.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
