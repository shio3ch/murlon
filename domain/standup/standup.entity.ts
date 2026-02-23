export interface Standup {
  readonly id: string;
  readonly userId: string;
  readonly projectId: string | null;
  readonly content: string;
  readonly date: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
