export interface Entry {
  readonly id: string;
  readonly content: string;
  readonly userId: string;
  readonly projectId: string | null;
  readonly taskId: string | null;
  readonly tension: number | null;
  readonly templateType: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
