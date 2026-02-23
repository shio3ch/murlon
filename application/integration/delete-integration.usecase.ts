import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IIntegrationRepository } from "../../domain/integration/integration.repository.ts";

export interface DeleteIntegrationDeps {
  integrationRepository: IIntegrationRepository;
}

export async function deleteIntegrationUseCase(
  deps: DeleteIntegrationDeps,
  input: { id: string; userId: string },
): Promise<void> {
  const setting = await deps.integrationRepository.findById(input.id);
  if (!setting) {
    throw new DomainError("連携設定が見つかりません", "NOT_FOUND");
  }
  if (setting.userId !== input.userId) {
    throw new DomainError("権限がありません", "FORBIDDEN");
  }
  await deps.integrationRepository.delete(input.id);
}
