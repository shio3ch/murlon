import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Report, ReportType } from "../../domain/report/report.entity.ts";
import type { IReportRepository } from "../../domain/report/report.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";
import type { AIProvider } from "../../infrastructure/ai/provider.ts";

export interface GenerateReportInput {
  userId: string;
  type: ReportType;
  startDate: Date;
  endDate: Date;
  projectId?: string;
  promptTemplate?: string;
}

export interface GenerateReportDeps {
  reportRepository: IReportRepository;
  entryRepository: IEntryRepository;
  projectRepository: IProjectRepository;
  aiProvider: AIProvider;
}

export async function generateReportUseCase(
  deps: GenerateReportDeps,
  input: GenerateReportInput,
): Promise<Report> {
  let projectName: string | undefined;

  if (input.projectId) {
    const project = await deps.projectRepository.findById(input.projectId);
    if (!project) {
      throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
    }
    if (!hasProjectAccess(project, input.userId)) {
      throw new DomainError("このプロジェクトへのアクセス権がありません", "FORBIDDEN");
    }
    projectName = project.name;
  }

  const entries = await deps.entryRepository.findByUserId(input.userId, {
    dateRange: { from: input.startDate, to: input.endDate },
    projectId: input.projectId,
    orderBy: "asc",
  });

  if (entries.length === 0) {
    throw new DomainError("指定した期間に分報がありません");
  }

  const content = await generateReportContent(
    deps.aiProvider,
    entries.map((e) => ({
      content: e.content,
      tension: e.tension,
      createdAt: e.createdAt,
    })),
    input.type,
    input.startDate,
    input.endDate,
    { projectName, promptTemplate: input.promptTemplate },
  );

  // 既存レポートがあれば削除してから再作成（upsert相当）
  const existing = await deps.reportRepository.findFirst({
    userId: input.userId,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    projectId: input.projectId,
  });
  if (existing) {
    await deps.reportRepository.delete(existing.id);
  }

  return await deps.reportRepository.save({
    type: input.type,
    content,
    startDate: input.startDate,
    endDate: input.endDate,
    userId: input.userId,
    projectId: input.projectId ?? null,
    promptTemplate: input.promptTemplate ?? null,
    entryIds: entries.map((e) => e.id),
  });
}

function formatEntries(
  entries: Array<{ content: string; tension: number | null; createdAt: Date }>,
): string {
  return entries
    .map((e) => {
      const time = new Date(e.createdAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const tensionTag = e.tension ? ` (テンション: ${e.tension}/5)` : "";
      return `[${time}]${tensionTag} ${e.content}`;
    })
    .join("\n");
}

function buildDateLabel(startDate: Date, endDate: Date, type: ReportType): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  switch (type) {
    case "DAILY":
      return fmt(startDate);
    case "WEEKLY":
      return `${fmt(startDate)} 〜 ${fmt(endDate)}`;
    case "MONTHLY":
      return startDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  }
}

async function generateReportContent(
  aiProvider: AIProvider,
  entries: Array<{ content: string; tension: number | null; createdAt: Date }>,
  type: ReportType,
  startDate: Date,
  endDate: Date,
  options?: { projectName?: string; promptTemplate?: string },
): Promise<string> {
  const reportTypeLabel = type === "DAILY" ? "日報" : type === "WEEKLY" ? "週報" : "月報";
  const dateLabel = buildDateLabel(startDate, endDate, type);
  const entryList = formatEntries(entries);
  const projectContext = options?.projectName ? `プロジェクト「${options.projectName}」の` : "";

  const defaultFormat = `## ${reportTypeLabel}のフォーマット要件
- 本日（または期間）の作業サマリー
- 完了したタスク（箇条書き）
- 課題・懸念事項（あれば）
- 明日（または次の期間）の予定
- 所感・メモ（あれば）`;

  const formatSection = options?.promptTemplate || defaultFormat;

  const prompt = `以下は、${projectContext}${dateLabel}の作業ログ（分報）です。
この内容をもとに、ビジネスで使える${reportTypeLabel}を日本語で作成してください。

## 分報一覧
${entryList}

${formatSection}

読みやすく、プロフェッショナルなビジネス文書として整形してください。
Markdownフォーマットで出力してください。`;

  return await aiProvider.generateText(prompt);
}
