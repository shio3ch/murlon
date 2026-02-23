import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../../lib/http.ts";
import { commentRepository, entryRepository, projectRepository } from "../../../../lib/repositories.ts";
import { addCommentUseCase } from "../../../../application/entry/add-comment.usecase.ts";
import { DomainError } from "../../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../../lib/types.ts";
import { hasProjectAccess } from "../../../../domain/project/project.entity.ts";

async function assertCanAccessEntry(userId: string, entryId: string): Promise<void> {
  const entry = await entryRepository.findById(entryId);
  if (!entry) throw new DomainError("分報が見つかりません", "NOT_FOUND");
  if (entry.userId === userId) return;

  if (entry.projectId) {
    const project = await projectRepository.findById(entry.projectId);
    if (project) {
      if (project.visibility === "PUBLIC") return;
      if (project.visibility === "LIMITED" && hasProjectAccess(project, userId)) return;
    }
  }
  throw new DomainError("この分報へのアクセス権がありません", "FORBIDDEN");
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    try {
      await assertCanAccessEntry(session.userId, ctx.params.id);
      const comments = await commentRepository.findByEntryIdWithUsers(ctx.params.id);
      return Response.json({ success: true, data: comments } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },

  async POST(req, ctx) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { content?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (body.content && body.content.length > 500) {
      return Response.json(
        { success: false, error: "コメントは500文字以内で入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      await assertCanAccessEntry(session.userId, ctx.params.id);
      const comment = await addCommentUseCase(
        { commentRepository, entryRepository },
        { entryId: ctx.params.id, userId: session.userId, content: body.content ?? "" },
      );
      return Response.json({ success: true, data: comment } satisfies ApiResponse, { status: 201 });
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
