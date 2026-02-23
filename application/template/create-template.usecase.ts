import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ReportTemplate } from "../../domain/template/template.entity.ts";
import type { ITemplateRepository } from "../../domain/template/template.repository.ts";
import type { ReportType } from "../../domain/report/report.entity.ts";

export interface CreateTemplateDeps {
  templateRepository: ITemplateRepository;
}

export async function createTemplateUseCase(
  deps: CreateTemplateDeps,
  input: { userId: string; name?: string; type?: string; prompt?: string },
): Promise<ReportTemplate> {
  const name = input.name?.trim();
  if (!name) throw new DomainError("テンプレート名を入力してください");

  if (!input.type || !["DAILY", "WEEKLY", "MONTHLY"].includes(input.type)) {
    throw new DomainError("type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください");
  }

  const prompt = input.prompt?.trim();
  if (!prompt) throw new DomainError("プロンプトを入力してください");

  return await deps.templateRepository.save({
    userId: input.userId,
    name,
    type: input.type as ReportType,
    prompt,
  });
}
