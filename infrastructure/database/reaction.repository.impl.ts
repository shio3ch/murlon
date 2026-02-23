import type { PrismaClient } from "@prisma/client";
import type { Reaction } from "../../domain/reaction/reaction.entity.ts";
import type { IReactionRepository, ReactionSummary } from "../../domain/reaction/reaction.repository.ts";

function toReaction(record: {
  id: string;
  entryId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}): Reaction {
  return {
    id: record.id,
    entryId: record.entryId,
    userId: record.userId,
    emoji: record.emoji,
    createdAt: record.createdAt,
  };
}

export class PrismaReactionRepository implements IReactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Reaction | null> {
    const record = await this.prisma.reaction.findUnique({ where: { id } });
    return record ? toReaction(record) : null;
  }

  async findByEntryId(entryId: string): Promise<Reaction[]> {
    const records = await this.prisma.reaction.findMany({ where: { entryId } });
    return records.map(toReaction);
  }

  async findByEntryAndUser(entryId: string, userId: string, emoji: string): Promise<Reaction | null> {
    const record = await this.prisma.reaction.findUnique({
      where: { entryId_userId_emoji: { entryId, userId, emoji } },
    });
    return record ? toReaction(record) : null;
  }

  async summarizeByEntry(entryId: string, userId: string): Promise<ReactionSummary[]> {
    const [grouped, myReactions] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ["emoji"],
        where: { entryId },
        _count: { emoji: true },
      }),
      this.prisma.reaction.findMany({
        where: { entryId, userId },
        select: { emoji: true },
      }),
    ]);
    const myEmojiSet = new Set(myReactions.map((r) => r.emoji));
    return grouped.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
      myReaction: myEmojiSet.has(r.emoji),
    }));
  }

  async save(params: { entryId: string; userId: string; emoji: string }): Promise<Reaction> {
    const record = await this.prisma.reaction.create({ data: params });
    return toReaction(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reaction.delete({ where: { id } });
  }
}
