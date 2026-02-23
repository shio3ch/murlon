import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { integrationRepository } from "../../../lib/repositories.ts";
import { createIntegrationUseCase } from "../../../application/integration/create-integration.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const data = await integrationRepository.findByUserId(session.userId);
    return Response.json({ success: true, data } satisfies ApiResponse);
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { type?: string; webhookUrl?: string; channelName?: string; projectId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const setting = await createIntegrationUseCase(
        { integrationRepository },
        { userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: setting } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
