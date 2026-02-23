import type { Standup } from "./standup.entity.ts";

export interface IStandupRepository {
  findByUserAndDate(userId: string, date: Date, projectId?: string): Promise<Standup | null>;
  save(params: {
    userId: string;
    projectId: string | null;
    content: string;
    date: Date;
  }): Promise<Standup>;
  update(id: string, content: string): Promise<Standup>;
}
