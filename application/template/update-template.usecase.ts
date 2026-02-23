import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ReportTemplate } from "../../domain/template/template.entity.ts";
import type { ITemplateRepository } from "../../domain/template/template.repository.ts";
import type { ReportType } from "../../domain/report/report.entity.ts";

export interface UpdateTemplateDeps {
  templateRepository: ITemplateRepository;
}

export async function updateTemplateUseCase(
  deps: UpdateTemplateDeps,
  input: { id: string; userId: string; name?: string; type?: string; prompt?: string },
): Promise<ReportTemplate> {
  const template = await deps.templateRepository.findById(input.id);
  if (!template) {
    throw new DomainError("テンプレートが見つかりません", "NOT_FOUND");
  }
  if (template.userId !== null && template.userId !== input.userId) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }

  const params: { name?: string; type?: ReportType; prompt?: string } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new DomainError("テンプレート名を入力してください");
    params.name = name;
  }
  if (input.type !== undefined) {
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(input.type)) {
      throw new DomainError("type は DAILY, WEEKLY, MONTHLY のいずれかを指定してください");
    }
    params.type = input.type as ReportType;
  }
  if (input.prompt !== undefined) {
    const prompt = input.prompt.trim();
    if (!prompt) throw new DomainError("プロンプトを入力してください");
    params.prompt = prompt;
  }

  return await deps.templateRepository.update(input.id, params);
}
