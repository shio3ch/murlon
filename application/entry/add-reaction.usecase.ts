import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Reaction } from "../../domain/reaction/reaction.entity.ts";
import type { IReactionRepository } from "../../domain/reaction/reaction.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface AddReactionDeps {
  reactionRepository: IReactionRepository;
  entryRepository: IEntryRepository;
}

export async function addReactionUseCase(
  deps: AddReactionDeps,
  input: { entryId: string; userId: string; emoji: string },
): Promise<Reaction> {
  const entry = await deps.entryRepository.findById(input.entryId);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }

  const existing = await deps.reactionRepository.findByEntryAndUser(
    input.entryId,
    input.userId,
    input.emoji,
  );
  if (existing) {
    throw new DomainError("既にリアクション済みです", "CONFLICT");
  }

  return await deps.reactionRepository.save(input);
}
