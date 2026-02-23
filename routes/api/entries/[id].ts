import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { entryRepository } from "../../../lib/repositories.ts";
import { deleteEntryUseCase } from "../../../application/entry/delete-entry.usecase.ts";
import { updateEntryUseCase } from "../../../application/entry/update-entry.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await deleteEntryUseCase({ entryRepository }, { id: ctx.params.id, userId: session.userId });
      return Response.json({ success: true } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: {
      content?: string;
      projectId?: string | null;
      taskId?: string | null;
      tension?: number | null;
      templateType?: string | null;
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
      const entry = await updateEntryUseCase(
        { entryRepository },
        { id: ctx.params.id, userId: session.userId, ...body },
      );
      return Response.json({ success: true, data: entry } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
