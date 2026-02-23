import type { Entry } from "./entry.entity.ts";

export interface FindEntriesOptions {
  limit?: number;
  cursor?: string;
  date?: string; // YYYY-MM-DD
  dateRange?: { from: Date; to: Date };
  projectId?: string;
  orderBy?: "asc" | "desc";
}

export interface IEntryRepository {
  findById(id: string): Promise<Entry | null>;
  findByUserId(userId: string, options?: FindEntriesOptions): Promise<Entry[]>;
  save(entry: Entry): Promise<Entry>;
  update(entry: Partial<Entry> & { id: string }): Promise<Entry>;
  delete(id: string): Promise<void>;
}
