import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { integrationRepository } from "../../../lib/repositories.ts";
import { updateIntegrationUseCase } from "../../../application/integration/update-integration.usecase.ts";
import { deleteIntegrationUseCase } from "../../../application/integration/delete-integration.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async PUT(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { enabled?: boolean; webhookUrl?: string; channelName?: string | null };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const setting = await updateIntegrationUseCase(
        { integrationRepository },
        { id: ctx.params.id, userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: setting } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await deleteIntegrationUseCase(
        { integrationRepository },
        { id: ctx.params.id, userId: session.userId },
      );
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
