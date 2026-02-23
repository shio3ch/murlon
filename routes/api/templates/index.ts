import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import type { ApiResponse, ReportTemplateRecord, ReportType } from "../../../lib/types.ts";

const PRESET_TEMPLATES: ReportTemplateRecord[] = [
  {
    id: "preset-simple-daily",
    userId: null,
    name: "シンプル日報",
    type: "DAILY",
    prompt: "以下の分報を元に、シンプルな日報を作成してください。\n\n" +
      "【フォーマット】\n## やったこと\n- ...\n\n## 明日の予定\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-scrum-daily",
    userId: null,
    name: "Scrum形式",
    type: "DAILY",
    prompt: "以下の分報を元に、Scrum形式の日報を作成してください。\n\n" +
      "【フォーマット】\n## 昨日やったこと\n- ...\n\n## 今日やること\n- ...\n\n## ブロッカー\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "preset-kpt-daily",
    userId: null,
    name: "KPT形式",
    type: "DAILY",
    prompt: "以下の分報を元に、KPT形式の日報を作成してください。\n\n" +
      "【フォーマット】\n## Keep（続けること）\n- ...\n\n## Problem（課題）\n- ...\n\n## Try（試すこと）\n- ...",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    // ユーザー自身のテンプレートを取得
    const userTemplates = await prisma.reportTemplate.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    // システムプリセット（userId=null）を取得
    const systemTemplates = await prisma.reportTemplate.findMany({
      where: { userId: null },
      orderBy: { createdAt: "asc" },
    });

    // DBにシステムプリセットがなければハードコードのプリセットを使う
    const presets: ReportTemplateRecord[] = systemTemplates.length > 0
      ? systemTemplates.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: t.name,
        type: t.type as ReportType,
        prompt: t.prompt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))
      : PRESET_TEMPLATES;

    const data: ReportTemplateRecord[] = [
      ...presets,
      ...userTemplates.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: t.name,
        type: t.type as ReportType,
        prompt: t.prompt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    ];

    return Response.json(
      { success: true, data } satisfies ApiResponse<ReportTemplateRecord[]>,
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

    let body: { name?: string; type?: string; prompt?: string };
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
        { success: false, error: "テンプレート名を入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.type || !["DAILY", "WEEKLY", "MONTHLY"].includes(body.type)) {
      return Response.json(
        { success: false, error: "無効なレポートタイプです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return Response.json(
        { success: false, error: "プロンプトを入力してください" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const template = await prisma.reportTemplate.create({
      data: {
        userId: session.userId,
        name,
        type: body.type as ReportType,
        prompt,
      },
    });

    const data: ReportTemplateRecord = {
      id: template.id,
      userId: template.userId,
      name: template.name,
      type: template.type as ReportType,
      prompt: template.prompt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    return Response.json(
      { success: true, data } satisfies ApiResponse<ReportTemplateRecord>,
      { status: 201 },
    );
  },
};
