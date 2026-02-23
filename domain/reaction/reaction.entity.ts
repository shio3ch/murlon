export interface Reaction {
  readonly id: string;
  readonly entryId: string;
  readonly userId: string;
  readonly emoji: string;
  readonly createdAt: Date;
}
