import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type {
  ApiResponse,
  ProjectMemberRecord,
  ProjectRecord,
  ProjectRole,
  Visibility,
} from "../../../lib/types.ts";

interface ProjectDetail extends ProjectRecord {
  members: (ProjectMemberRecord & {
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  })[];
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const isMember = project.members.some((m) => m.userId === session.userId);
    if (project.ownerId !== session.userId && !isMember) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    const data: ProjectDetail = {
      id: project.id,
      name: project.name,
      description: project.description,
      visibility: project.visibility as Visibility,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members: project.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role as ProjectRole,
        createdAt: m.createdAt,
        user: m.user,
      })),
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<ProjectDetail>,
    );
  },

  async PUT(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const isOwner = project.ownerId === session.userId;
    const isAdmin = project.members.some(
      (m) => m.userId === session.userId && m.role === "ADMIN",
    );
    if (!isOwner && !isAdmin) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
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

    const updateData: { name?: string; description?: string | null; visibility?: Visibility } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
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
      updateData.name = name;
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.visibility !== undefined) {
      if (!["PRIVATE", "LIMITED", "PUBLIC"].includes(body.visibility)) {
        return Response.json(
          { success: false, error: "無効な公開範囲です" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.visibility = body.visibility as Visibility;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    const data: ProjectRecord = {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      visibility: updated.visibility as Visibility,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<ProjectRecord>,
    );
  },

  async DELETE(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return Response.json(
        { success: false, error: "プロジェクトが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (project.ownerId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    await prisma.project.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
