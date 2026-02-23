import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { projectRepository } from "../../../lib/repositories.ts";
import { createProjectUseCase } from "../../../application/project/create-project.usecase.ts";
import { listProjectsUseCase } from "../../../application/project/list-projects.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const projects = await listProjectsUseCase({ projectRepository }, { userId: session.userId });
    return Response.json({ success: true, data: projects } satisfies ApiResponse);
  },

  async POST(req) {
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
      const project = await createProjectUseCase(
        { projectRepository },
        { ...body, ownerId: session.userId },
      );
      return Response.json({ success: true, data: project } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
