export interface Comment {
  readonly id: string;
  readonly entryId: string;
  readonly userId: string;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // リポジトリが任意でセットするプレゼンテーション用フィールド
  readonly user?: { id: string; name: string };
}
