import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse, ProjectRecord, Visibility } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      visibility: p.visibility as Visibility,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      memberCount: p._count.members,
    }));

    return Response.json(
      { success: true, data } satisfies ApiResponse<
        (ProjectRecord & { memberCount: number })[]
      >,
    );
  },

  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    let body: { name?: string; description?: string; visibility?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const name = body.name?.trim();
    if (!name) {
      return Response.json(
        { success: false, error: "プロジェクト名を入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (name.length > 50) {
      return Response.json(
        {
          success: false,
          error: "プロジェクト名は50文字以内で入力してください",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const visibility = body.visibility ?? "PRIVATE";
    if (!["PRIVATE", "LIMITED", "PUBLIC"].includes(visibility)) {
      return Response.json(
        { success: false, error: "無効な公開範囲です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          description: body.description?.trim() || null,
          visibility: visibility as Visibility,
          ownerId: session.userId,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId: session.userId,
          role: "ADMIN",
        },
      });

      return created;
    });

    const data: ProjectRecord = {
      id: project.id,
      name: project.name,
      description: project.description,
      visibility: project.visibility as Visibility,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<ProjectRecord>,
      { status: 201 },
    );
  },
};
