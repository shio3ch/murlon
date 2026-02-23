import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import { generateStandup } from "../../../lib/ai.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

    const standups = await prisma.standup.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { project: { select: { id: true, name: true } } },
    });

    return Response.json(
      {
        success: true,
        data: standups.map((s) => ({
          ...s,
          date: s.date.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      } satisfies ApiResponse,
    );
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, {
        status: 401,
      });
    }

    let body: { projectId?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const { projectId, date: dateStr } = body;
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    if (isNaN(targetDate.getTime())) {
      return Response.json(
        { success: false, error: "日付形式が正しくありません (YYYY-MM-DD)" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const startDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
    );
    const endDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
    );

    // Validate project access if projectId is specified
    let projectName: string | undefined;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: { where: { userId: session.userId } } },
      });

      if (!project) {
        return Response.json(
          { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
          { status: 404 },
        );
      }

      if (project.ownerId !== session.userId && project.members.length === 0) {
        return Response.json(
          {
            success: false,
            error: "このプロジェクトへのアクセス権がありません",
          } satisfies ApiResponse,
          { status: 403 },
        );
      }

      projectName = project.name;
    }

    const whereClause: Record<string, unknown> = {
      userId: session.userId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    const entries = await prisma.entry.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) {
      return Response.json(
        { success: false, error: "指定した日の分報がありません" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const content = await generateStandup(
      entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })),
      projectName,
    );

    const standup = await prisma.standup.create({
      data: {
        userId: session.userId,
        projectId: projectId || null,
        content,
        date: startDate,
      },
    });

    return Response.json({ success: true, data: standup } satisfies ApiResponse, { status: 201 });
  },
};
