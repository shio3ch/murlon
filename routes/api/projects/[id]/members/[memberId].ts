import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../../lib/auth.ts";
import { prisma } from "../../../../../lib/db.ts";
import type { ApiResponse, ProjectRole } from "../../../../../lib/types.ts";

export const handler: Handlers = {
  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id, memberId } = ctx.params;

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

    // オーナーまたはADMINのみ変更可能
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

    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== id) {
      return Response.json(
        { success: false, error: "メンバーが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    let body: { role?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.role || !["VIEWER", "COMMENTER", "CONTRIBUTOR", "ADMIN"].includes(body.role)) {
      return Response.json(
        { success: false, error: "無効なロールです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: body.role as ProjectRole },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const data = {
      id: updated.id,
      userId: updated.userId,
      role: updated.role as ProjectRole,
      user: updated.user,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse,
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

    const { id, memberId } = ctx.params;

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

    // オーナーまたはADMINのみ削除可能
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

    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== id) {
      return Response.json(
        { success: false, error: "メンバーが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    // オーナー自身は削除不可
    if (member.userId === project.ownerId) {
      return Response.json(
        { success: false, error: "オーナーを削除することはできません" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    await prisma.projectMember.delete({ where: { id: memberId } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
