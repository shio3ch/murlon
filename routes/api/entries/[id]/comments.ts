import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../lib/auth.ts";
import { prisma } from "../../../../lib/db.ts";
import type { ApiResponse } from "../../../../lib/types.ts";

async function canAccessEntry(userId: string, entryId: string): Promise<boolean> {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      project: {
        include: {
          members: { where: { userId }, select: { id: true } },
        },
      },
    },
  });

  if (!entry) return false;

  // 自分のEntry
  if (entry.userId === userId) return true;

  // プロジェクトに属するEntry
  if (entry.project) {
    if (entry.project.visibility === "PUBLIC") return true;
    if (
      entry.project.visibility === "LIMITED" &&
      (entry.project.ownerId === userId || entry.project.members.length > 0)
    ) {
      return true;
    }
  }

  return false;
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id: entryId } = ctx.params;

    const accessible = await canAccessEntry(session.userId, entryId);
    if (!accessible) {
      return Response.json(
        { success: false, error: "この分報へのアクセス権がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    const comments = await prisma.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const data = comments.map((c) => ({
      id: c.id,
      entryId: c.entryId,
      userId: c.userId,
      content: c.content,
      userName: c.user.name,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return Response.json({ success: true, data } satisfies ApiResponse);
  },

  async POST(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id: entryId } = ctx.params;

    let body: { content?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const content = body.content?.trim();
    if (!content || content.length < 1) {
      return Response.json(
        { success: false, error: "コメントを入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (content.length > 500) {
      return Response.json(
        {
          success: false,
          error: "コメントは500文字以内で入力してください",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const accessible = await canAccessEntry(session.userId, entryId);
    if (!accessible) {
      return Response.json(
        { success: false, error: "この分報へのアクセス権がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    const comment = await prisma.comment.create({
      data: {
        entryId,
        userId: session.userId,
        content,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const data = {
      id: comment.id,
      entryId: comment.entryId,
      userId: comment.userId,
      content: comment.content,
      userName: comment.user.name,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };

    return Response.json({ success: true, data } satisfies ApiResponse, { status: 201 });
  },
};
