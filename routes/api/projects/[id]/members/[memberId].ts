import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../../../lib/http.ts";
import { projectMemberRepository, projectRepository } from "../../../../../lib/repositories.ts";
import { updateMemberUseCase } from "../../../../../application/project/update-member.usecase.ts";
import { removeMemberUseCase } from "../../../../../application/project/remove-member.usecase.ts";
import { DomainError } from "../../../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../../../lib/types.ts";

export const handler: Handlers = {
  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { role?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const member = await updateMemberUseCase(
        { projectRepository, projectMemberRepository },
        {
          projectId: ctx.params.id,
          memberId: ctx.params.memberId,
          requestUserId: session.userId,
          role: body.role ?? "",
        },
      );
      return Response.json({ success: true, data: member } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await removeMemberUseCase(
        { projectRepository, projectMemberRepository },
        {
          projectId: ctx.params.id,
          memberId: ctx.params.memberId,
          requestUserId: session.userId,
        },
      );
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
