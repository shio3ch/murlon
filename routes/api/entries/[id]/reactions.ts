import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../../lib/http.ts";
import {
  entryRepository,
  projectRepository,
  reactionRepository,
} from "../../../../lib/repositories.ts";
import {
  listReactionsUseCase,
  toggleReactionUseCase,
} from "../../../../application/entry/toggle-reaction.usecase.ts";
import { DomainError } from "../../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../../lib/types.ts";

const deps = { reactionRepository, entryRepository, projectRepository };

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      const data = await listReactionsUseCase(deps, {
        entryId: ctx.params.id,
        userId: session.userId,
      });
      return Response.json({ success: true, data } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async POST(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { emoji?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const data = await toggleReactionUseCase(deps, {
        entryId: ctx.params.id,
        userId: session.userId,
        emoji: body.emoji ?? "",
      });
      return Response.json({ success: true, data } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
