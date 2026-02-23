import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { projectRepository, taskRepository } from "../../../lib/repositories.ts";
import { updateTaskUseCase } from "../../../application/task/update-task.usecase.ts";
import { deleteTaskUseCase } from "../../../application/task/delete-task.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { hasProjectAccess } from "../../../domain/project/project.entity.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const task = await taskRepository.findById(ctx.params.id);
    if (!task) {
      return Response.json(
        { success: false, error: "タスクが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const project = await projectRepository.findById(task.projectId);
    if (!project || !hasProjectAccess(project, session.userId)) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    return Response.json({ success: true, data: task } satisfies ApiResponse);
  },

  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: {
      title?: string;
      description?: string | null;
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

    try {
      const task = await updateTaskUseCase(
        { taskRepository, projectRepository },
        { id: ctx.params.id, userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: task } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await deleteTaskUseCase(
        { taskRepository, projectRepository },
        { id: ctx.params.id, userId: session.userId },
      );
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
