import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { projectRepository } from "../../../lib/repositories.ts";
import { getProjectUseCase } from "../../../application/project/get-project.usecase.ts";
import { updateProjectUseCase } from "../../../application/project/update-project.usecase.ts";
import { deleteProjectUseCase } from "../../../application/project/delete-project.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      const project = await getProjectUseCase(
        { projectRepository },
        { id: ctx.params.id, userId: session.userId },
      );
      return Response.json({ success: true, data: project } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async PUT(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { name?: string; description?: string; visibility?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const project = await updateProjectUseCase(
        { projectRepository },
        { id: ctx.params.id, userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: project } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await deleteProjectUseCase(
        { projectRepository },
        { id: ctx.params.id, userId: session.userId },
      );
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
