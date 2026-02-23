import type { Reaction } from "./reaction.entity.ts";

export interface ReactionSummary {
  emoji: string;
  count: number;
  myReaction: boolean;
}

export interface IReactionRepository {
  findById(id: string): Promise<Reaction | null>;
  findByEntryId(entryId: string): Promise<Reaction[]>;
  findByEntryAndUser(entryId: string, userId: string, emoji: string): Promise<Reaction | null>;
  summarizeByEntry(entryId: string, userId: string): Promise<ReactionSummary[]>;
  save(params: { entryId: string; userId: string; emoji: string }): Promise<Reaction>;
  delete(id: string): Promise<void>;
}
