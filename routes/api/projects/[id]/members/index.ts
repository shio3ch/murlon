import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../../../lib/auth.ts";
import { prisma } from "../../../../../lib/db.ts";
import type { ApiResponse, ProjectRole } from "../../../../../lib/types.ts";

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
              select: { id: true, name: true, email: true },
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

    const data = project.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role as ProjectRole,
      user: m.user,
    }));

    return Response.json(
      { success: true, data } satisfies ApiResponse,
    );
  },

  async POST(req, ctx) {
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

    // オーナーまたはADMINのみ招待可能
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

    let body: { email?: string; role?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const email = body.email?.trim();
    if (!email) {
      return Response.json(
        { success: false, error: "メールアドレスを入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const role = body.role || "VIEWER";
    if (!["VIEWER", "COMMENTER", "CONTRIBUTOR", "ADMIN"].includes(role)) {
      return Response.json(
        { success: false, error: "無効なロールです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // emailでユーザーを検索
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return Response.json(
        { success: false, error: "ユーザーが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    // オーナー自身は追加不可
    if (targetUser.id === project.ownerId) {
      return Response.json(
        { success: false, error: "オーナーをメンバーとして追加することはできません" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // 既にメンバーの場合は400エラー
    const existingMember = project.members.find(
      (m) => m.userId === targetUser.id,
    );
    if (existingMember) {
      return Response.json(
        { success: false, error: "既にメンバーです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: targetUser.id,
        role: role as ProjectRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const data = {
      id: member.id,
      userId: member.userId,
      role: member.role as ProjectRole,
      user: member.user,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse,
      { status: 201 },
    );
  },
};
