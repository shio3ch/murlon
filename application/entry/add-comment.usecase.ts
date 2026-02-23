import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Comment } from "../../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../../domain/comment/comment.repository.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface AddCommentDeps {
  commentRepository: ICommentRepository;
  entryRepository: IEntryRepository;
}

export async function addCommentUseCase(
  deps: AddCommentDeps,
  input: { entryId: string; userId: string; content: string },
): Promise<Comment> {
  const entry = await deps.entryRepository.findById(input.entryId);
  if (!entry) {
    throw new DomainError("分報が見つかりません", "NOT_FOUND");
  }

  const content = input.content.trim();
  if (!content) {
    throw new DomainError("コメントを入力してください");
  }

  return await deps.commentRepository.save({ entryId: input.entryId, userId: input.userId, content });
}
