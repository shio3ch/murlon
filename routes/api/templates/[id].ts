import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type {
  ApiResponse,
  ReportTemplateRecord,
  ReportType,
} from "../../../lib/types.ts";

export const handler: Handlers = {
  async PATCH(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const { id } = ctx.params;

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return Response.json(
        { success: false, error: "テンプレートが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (template.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    let body: { name?: string; type?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return Response.json(
          { success: false, error: "テンプレート名を入力してください" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.name = name;
    }

    if (body.type !== undefined) {
      if (!["DAILY", "WEEKLY", "MONTHLY"].includes(body.type)) {
        return Response.json(
          { success: false, error: "無効なレポートタイプです" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.type = body.type;
    }

    if (body.prompt !== undefined) {
      const prompt = body.prompt.trim();
      if (!prompt) {
        return Response.json(
          { success: false, error: "プロンプトを入力してください" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updateData.prompt = prompt;
    }

    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: updateData,
    });

    const data: ReportTemplateRecord = {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type as ReportType,
      prompt: updated.prompt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<ReportTemplateRecord>,
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

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return Response.json(
        { success: false, error: "テンプレートが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (template.userId !== session.userId) {
      return Response.json(
        { success: false, error: "権限がありません" } satisfies ApiResponse,
        { status: 403 },
      );
    }

    await prisma.reportTemplate.delete({ where: { id } });

    return Response.json({ success: true } satisfies ApiResponse);
  },
};
