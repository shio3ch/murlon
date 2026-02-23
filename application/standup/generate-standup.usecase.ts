import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Standup } from "../../domain/standup/standup.entity.ts";
import type { IStandupRepository } from "../../domain/standup/standup.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";
import type { AIProvider } from "../../infrastructure/ai/provider.ts";

export interface GenerateStandupInput {
  userId: string;
  projectId?: string;
  date?: string; // YYYY-MM-DD
}

export interface GenerateStandupDeps {
  standupRepository: IStandupRepository;
  entryRepository: IEntryRepository;
  projectRepository: IProjectRepository;
  aiProvider: AIProvider;
}

export async function generateStandupUseCase(
  deps: GenerateStandupDeps,
  input: GenerateStandupInput,
): Promise<Standup> {
  const targetDate = input.date ? new Date(input.date) : new Date();
  if (isNaN(targetDate.getTime())) {
    throw new DomainError("日付形式が正しくありません (YYYY-MM-DD)");
  }

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

  const startDate = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    0, 0, 0,
  );
  const endDate = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    23, 59, 59,
  );

  const entries = await deps.entryRepository.findByUserId(input.userId, {
    dateRange: { from: startDate, to: endDate },
    projectId: input.projectId,
    orderBy: "asc",
  });

  if (entries.length === 0) {
    throw new DomainError("指定した日付の分報がありません");
  }

  const entryList = entries
    .map((e) => {
      const time = new Date(e.createdAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const tensionTag = e.tension ? ` (テンション: ${e.tension}/5)` : "";
      return `[${time}]${tensionTag} ${e.content}`;
    })
    .join("\n");

  const projectContext = projectName ? `プロジェクト「${projectName}」の` : "";
  const prompt = `以下は、${projectContext}作業ログ（分報）です。
この内容をもとに、Scrum形式のスタンドアップを日本語で生成してください。

## 分報一覧
${entryList}

## 出力形式
**昨日やったこと**
- ...

**今日やること**
- ...

**ブロッカー**
- ...（なければ「なし」と記載）

簡潔でチームに共有しやすい文体でMarkdownフォーマットで出力してください。`;

  const content = await deps.aiProvider.generateText(prompt);

  const existing = await deps.standupRepository.findByUserAndDate(
    input.userId,
    targetDate,
    input.projectId,
  );

  if (existing) {
    return await deps.standupRepository.update(existing.id, content);
  }

  return await deps.standupRepository.save({
    userId: input.userId,
    projectId: input.projectId ?? null,
    content,
    date: targetDate,
  });
}
