import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import { hasProjectAccess } from "../../domain/project/project.entity.ts";

export interface CreateEntryInput {
  content: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  tension?: number | null;
  templateType?: string;
}

export interface CreateEntryDeps {
  entryRepository: IEntryRepository;
  projectRepository: IProjectRepository;
}

export async function createEntryUseCase(
  deps: CreateEntryDeps,
  input: CreateEntryInput,
): Promise<Entry> {
  const content = input.content.trim();
  if (!content) {
    throw new DomainError("内容を入力してください");
  }
  if (content.length > 5000) {
    throw new DomainError("内容は5000文字以内で入力してください");
  }

  if (input.tension !== undefined && input.tension !== null) {
    if (!Number.isInteger(input.tension) || input.tension < 1 || input.tension > 5) {
      throw new DomainError("テンションは1〜5の整数で指定してください");
    }
  }

  if (input.projectId) {
    const project = await deps.projectRepository.findById(input.projectId);
    if (!project) {
      throw new DomainError("プロジェクトが見つかりません", "NOT_FOUND");
    }
    if (!hasProjectAccess(project, input.userId)) {
      throw new DomainError("このプロジェクトへのアクセス権がありません", "FORBIDDEN");
    }
  }

  return await deps.entryRepository.save({
    id: crypto.randomUUID(),
    content,
    userId: input.userId,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    tension: input.tension ?? null,
    templateType: input.templateType ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
