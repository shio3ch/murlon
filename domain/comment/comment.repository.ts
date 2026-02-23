import type { Comment } from "./comment.entity.ts";

export interface ICommentRepository {
  findByEntryId(entryId: string): Promise<Comment[]>;
  findByEntryIdWithUsers(entryId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  save(params: { entryId: string; userId: string; content: string }): Promise<Comment>;
  update(id: string, content: string): Promise<Comment>;
  delete(id: string): Promise<void>;
}
