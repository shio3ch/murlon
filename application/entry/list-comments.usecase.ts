import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Comment } from "../../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../../domain/comment/comment.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface ListCommentsDeps {
  commentRepository: ICommentRepository;
  entryRepository: IEntryRepository;
}

export async function listCommentsUseCase(
  deps: ListCommentsDeps,
  input: { entryId: string },
): Promise<Comment[]> {
  const entry = await deps.entryRepository.findById(input.entryId);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }
  return await deps.commentRepository.findByEntryId(input.entryId);
}
