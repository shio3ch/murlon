import { DomainError } from "../../domain/shared/domain-error.ts";
import type {
  IReactionRepository,
  ReactionSummary,
} from "../../domain/reaction/reaction.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";

const ALLOWED_EMOJIS = new Set(["👍", "❤️", "🎉", "😊", "🤔"]);

export interface ToggleReactionDeps {
  reactionRepository: IReactionRepository;
  entryRepository: IEntryRepository;
  projectRepository: IProjectRepository;
}

async function assertCanAccessEntry(
  deps: Pick<ToggleReactionDeps, "entryRepository" | "projectRepository">,
  entryId: string,
  userId: string,
): Promise<void> {
  const entry = await deps.entryRepository.findById(entryId);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }
  if (entry.userId === userId) return;

  if (entry.projectId) {
    const project = await deps.projectRepository.findById(entry.projectId);
    if (project) {
      if (project.visibility === "PUBLIC") return;
      if (
        project.visibility === "LIMITED" &&
        (project.ownerId === userId || project.members.some((m) => m.userId === userId))
      ) return;
    }
  }

  throw new DomainError("この分報へのアクセス権がありません", "FORBIDDEN");
}

export async function toggleReactionUseCase(
  deps: ToggleReactionDeps,
  input: { entryId: string; userId: string; emoji: string },
): Promise<ReactionSummary[]> {
  if (!ALLOWED_EMOJIS.has(input.emoji)) {
    throw new DomainError("許可されていない絵文字です");
  }

  await assertCanAccessEntry(deps, input.entryId, input.userId);

  const existing = await deps.reactionRepository.findByEntryAndUser(
    input.entryId,
    input.userId,
    input.emoji,
  );

  if (existing) {
    await deps.reactionRepository.delete(existing.id);
  } else {
    await deps.reactionRepository.save(input);
  }

  return await deps.reactionRepository.summarizeByEntry(input.entryId, input.userId);
}

export async function listReactionsUseCase(
  deps: Pick<ToggleReactionDeps, "reactionRepository" | "entryRepository" | "projectRepository">,
  input: { entryId: string; userId: string },
): Promise<ReactionSummary[]> {
  await assertCanAccessEntry(deps, input.entryId, input.userId);
  return await deps.reactionRepository.summarizeByEntry(input.entryId, input.userId);
}
