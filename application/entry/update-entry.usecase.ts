import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface UpdateEntryInput {
  id: string;
  userId: string;
  content?: string;
  projectId?: string | null;
  taskId?: string | null;
  tension?: number | null;
  templateType?: string | null;
}

export interface UpdateEntryDeps {
  entryRepository: IEntryRepository;
}

export async function updateEntryUseCase(
  deps: UpdateEntryDeps,
  input: UpdateEntryInput,
): Promise<Entry> {
  const entry = await deps.entryRepository.findById(input.id);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }
  if (entry.userId !== input.userId) {
    throw new DomainError("Forbidden", "FORBIDDEN");
  }

  if (input.content !== undefined) {
    const content = input.content.trim();
    if (!content) {
      throw new DomainError("内容を入力してください");
    }
    if (content.length > 5000) {
      throw new DomainError("内容は5000文字以内で入力してください");
    }
    input.content = content;
  }

  if (input.tension !== undefined && input.tension !== null) {
    if (!Number.isInteger(input.tension) || input.tension < 1 || input.tension > 5) {
      throw new DomainError("テンションは1〜5の整数で指定してください");
    }
  }

  return await deps.entryRepository.update({
    id: input.id,
    ...(input.content !== undefined && { content: input.content }),
    ...("projectId" in input && { projectId: input.projectId }),
    ...("taskId" in input && { taskId: input.taskId }),
    ...("tension" in input && { tension: input.tension }),
    ...("templateType" in input && { templateType: input.templateType }),
  });
}
