import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse, EntryRecord } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const cursor = url.searchParams.get("cursor") || undefined;
    const date = url.searchParams.get("date");

    let whereClause: { userId: string; createdAt?: { gte: Date; lte: Date } } = {
      userId: session.userId,
    };

    if (date) {
      const startDate = new Date(date + "T00:00:00");
      const endDate = new Date(date + "T23:59:59");
      whereClause = { ...whereClause, createdAt: { gte: startDate, lte: endDate } };
    }

    const entries = await prisma.entry.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return Response.json({
      success: true,
      data: entries.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    } satisfies ApiResponse);
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

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
    if (!content) {
      return Response.json(
        { success: false, error: "内容を入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (content.length > 5000) {
      return Response.json(
        { success: false, error: "内容は5000文字以内で入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const entry = await prisma.entry.create({
      data: { content, userId: session.userId },
    });

    const responseData: EntryRecord = {
      ...entry,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };

    return Response.json({ success: true, data: responseData } satisfies ApiResponse, {
      status: 201,
    });
  },
};
