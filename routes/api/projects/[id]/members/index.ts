import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../../../lib/http.ts";
import {
  projectMemberRepository,
  projectRepository,
  userRepository,
} from "../../../../../lib/repositories.ts";
import { addMemberUseCase } from "../../../../../application/project/add-member.usecase.ts";
import { DomainError } from "../../../../../domain/shared/domain-error.ts";
import { hasProjectAccess } from "../../../../../domain/project/project.entity.ts";
import type { ApiResponse } from "../../../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const project = await projectRepository.findByIdWithMemberUsers(ctx.params.id);
    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }
    if (!hasProjectAccess(project, session.userId)) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    return Response.json({ success: true, data: project.members } satisfies ApiResponse);
  },

  async POST(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { email?: string; role?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const member = await addMemberUseCase(
        { projectRepository, projectMemberRepository, userRepository },
        {
          projectId: ctx.params.id,
          requestUserId: session.userId,
          targetEmail: body.email ?? "",
          role: body.role,
        },
      );
      return Response.json({ success: true, data: member } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
