import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { projectRepository, taskRepository } from "../../../lib/repositories.ts";
import { createTaskUseCase } from "../../../application/task/create-task.usecase.ts";
import { listTasksUseCase } from "../../../application/task/list-tasks.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) {
      return Response.json(
        { success: false, error: "projectIdは必須です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const tasks = await listTasksUseCase(
        { taskRepository, projectRepository },
        { projectId, userId: session.userId },
      );
      return Response.json({ success: true, data: tasks } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

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

    try {
      const task = await createTaskUseCase(
        { taskRepository, projectRepository },
        { ...body, projectId: body.projectId, title: body.title ?? "", userId: session.userId },
      );
      return Response.json({ success: true, data: task } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
