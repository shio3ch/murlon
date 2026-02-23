import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface DeleteEntryDeps {
  entryRepository: IEntryRepository;
}

export async function deleteEntryUseCase(
  deps: DeleteEntryDeps,
  input: { id: string; userId: string },
): Promise<void> {
  const entry = await deps.entryRepository.findById(input.id);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }
  if (entry.userId !== input.userId) {
    throw new DomainError("Forbidden", "FORBIDDEN");
  }
  await deps.entryRepository.delete(input.id);
}
