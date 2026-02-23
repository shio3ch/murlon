import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../lib/auth.ts";
import { prisma } from "../../../../lib/db.ts";
import type { ApiResponse } from "../../../../lib/types.ts";

const ALLOWED_EMOJIS = new Set(["👍", "❤️", "🎉", "😊", "🤔"]);

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

    const reactions = await prisma.reaction.groupBy({
      by: ["emoji"],
      where: { entryId },
      _count: { emoji: true },
    });

    const myReactions = await prisma.reaction.findMany({
      where: { entryId, userId: session.userId },
      select: { emoji: true },
    });
    const myEmojiSet = new Set(myReactions.map((r) => r.emoji));

    const data = reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
      myReaction: myEmojiSet.has(r.emoji),
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

    let body: { emoji?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const emoji = body.emoji;
    if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
      return Response.json(
        {
          success: false,
          error: "許可されていない絵文字です",
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

    // トグル: 既存ならdelete、なければcreate
    const existing = await prisma.reaction.findUnique({
      where: {
        entryId_userId_emoji: { entryId, userId: session.userId, emoji },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { entryId, userId: session.userId, emoji },
      });
    }

    // 更新後のリアクション一覧を返す
    const reactions = await prisma.reaction.groupBy({
      by: ["emoji"],
      where: { entryId },
      _count: { emoji: true },
    });

    const myReactions = await prisma.reaction.findMany({
      where: { entryId, userId: session.userId },
      select: { emoji: true },
    });
    const myEmojiSet = new Set(myReactions.map((r) => r.emoji));

    const data = reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
      myReaction: myEmojiSet.has(r.emoji),
    }));

    return Response.json({ success: true, data } satisfies ApiResponse);
  },
};
