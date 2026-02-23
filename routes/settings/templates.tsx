import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSession } from "../../lib/auth.ts";
import { prisma } from "../../lib/db.ts";
import Header from "../../components/Header.tsx";
import TemplateManager from "../../islands/TemplateManager.tsx";
import type { ReportTemplateRecord, ReportType } from "../../lib/types.ts";

interface TemplatesPageData {
  user: { id: string; name: string; email: string };
  templates: ReportTemplateRecord[];
}

export const handler: Handlers<TemplatesPageData> = {
  async GET(req, ctx) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, { status: 302, headers: { Location: "/auth/login" } });
    }

    let templates: ReportTemplateRecord[] = [];
    try {
      const rows = await prisma.reportTemplate.findMany({
        where: { OR: [{ userId: session.userId }, { userId: null }] },
        orderBy: { createdAt: "asc" },
      });
      templates = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        type: r.type as ReportType,
        prompt: r.prompt,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch {
      // reportTemplate テーブルが未作成の場合は空配列
      templates = [];
    }

    return ctx.render({
      user: { id: session.userId, name: session.name, email: session.email },
      templates,
    });
  },
};

export default function TemplatesPage({ data }: PageProps<TemplatesPageData>) {
  const { user, templates } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <Header user={user} />
      <main class="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div class="text-sm text-gray-500 mb-4">
          <a href="/dashboard" class="hover:text-brand-600">設定</a>
          <span class="mx-1">/</span>
          <span class="text-gray-700">テンプレート管理</span>
        </div>

        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p class="text-gray-500 mt-1">
            レポート生成に使用するテンプレートを管理します
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <TemplateManager initialTemplates={templates} />
        </div>
      </main>
    </div>
  );
}
