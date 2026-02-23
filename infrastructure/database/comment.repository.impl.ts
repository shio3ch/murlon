import type { PrismaClient } from "@prisma/client";
import type { Comment } from "../../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../../domain/comment/comment.repository.ts";

function toComment(record: {
  id: string;
  entryId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): Comment {
  return {
    id: record.id,
    entryId: record.entryId,
    userId: record.userId,
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaCommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEntryId(entryId: string): Promise<Comment[]> {
    const records = await this.prisma.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toComment);
  }

  async findByEntryIdWithUsers(entryId: string): Promise<Comment[]> {
    const records = await this.prisma.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });
    return records.map((r) => ({ ...toComment(r), user: r.user }));
  }

  async findById(id: string): Promise<Comment | null> {
    const record = await this.prisma.comment.findUnique({ where: { id } });
    return record ? toComment(record) : null;
  }

  async save(params: { entryId: string; userId: string; content: string }): Promise<Comment> {
    const record = await this.prisma.comment.create({ data: params });
    return toComment(record);
  }

  async update(id: string, content: string): Promise<Comment> {
    const record = await this.prisma.comment.update({ where: { id }, data: { content } });
    return toComment(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.comment.delete({ where: { id } });
  }
}
