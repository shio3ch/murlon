import { DomainError } from "../../domain/shared/domain-error.ts";
import type { ITemplateRepository } from "../../domain/template/template.repository.ts";

export interface DeleteTemplateDeps {
  templateRepository: ITemplateRepository;
}

export async function deleteTemplateUseCase(
  deps: DeleteTemplateDeps,
  input: { id: string; userId: string },
): Promise<void> {
  const template = await deps.templateRepository.findById(input.id);
  if (!template) {
    throw new DomainError("テンプレートが見つかりません", "NOT_FOUND");
  }
  if (template.userId !== null && template.userId !== input.userId) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }
  await deps.templateRepository.delete(input.id);
}
