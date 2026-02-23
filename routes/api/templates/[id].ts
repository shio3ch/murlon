import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { templateRepository } from "../../../lib/repositories.ts";
import { updateTemplateUseCase } from "../../../application/template/update-template.usecase.ts";
import { deleteTemplateUseCase } from "../../../application/template/delete-template.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { name?: string; type?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const template = await updateTemplateUseCase(
        { templateRepository },
        { id: ctx.params.id, userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: template } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await deleteTemplateUseCase(
        { templateRepository },
        { id: ctx.params.id, userId: session.userId },
      );
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
