import { DomainError } from "../../domain/shared/domain-error.ts";
import type { IReactionRepository } from "../../domain/reaction/reaction.repository.ts";

export interface RemoveReactionDeps {
  reactionRepository: IReactionRepository;
}

export async function removeReactionUseCase(
  deps: RemoveReactionDeps,
  input: { reactionId: string; userId: string },
): Promise<void> {
  const reaction = await deps.reactionRepository.findById(input.reactionId);
  if (!reaction) {
    throw new DomainError("リアクションが見つかりません", "NOT_FOUND");
  }
  if (reaction.userId !== input.userId) {
    throw new DomainError("Forbidden", "FORBIDDEN");
  }
  await deps.reactionRepository.delete(input.reactionId);
}
