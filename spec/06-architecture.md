# 5.5 アーキテクチャ方針（DDD）

DDDに基づいたレイヤードアーキテクチャを採用し、ビジネスロジックをドメイン層に集約する。

## ディレクトリ構成

```
src/
├── domain/                  # ドメイン層（ビジネスロジックの核心）
│   ├── post/
│   │   ├── post.entity.ts        # Postエンティティ
│   │   ├── post.repository.ts    # リポジトリインターフェース
│   │   └── post.value-object.ts  # 値オブジェクト（Tension など）
│   ├── project/
│   ├── task/
│   ├── report/
│   └── user/
├── application/             # アプリケーション層（ユースケース）
│   ├── post/
│   │   ├── create-post.usecase.ts
│   │   └── list-posts.usecase.ts
│   ├── report/
│   │   └── generate-report.usecase.ts
│   └── task/
├── infrastructure/          # インフラ層（外部依存の実装）
│   ├── prisma/
│   │   ├── schema.prisma         # Prismaスキーマ（ドメインモデルをDBに写像）
│   │   └── post.repository.impl.ts
│   ├── ai/
│   │   └── claude.service.ts     # Claude API呼び出し
│   └── notification/
│       └── slack.service.ts
└── presentation/            # プレゼンテーション層（Fresh Routes / API）
    ├── routes/
    └── islands/
```

## 設計方針

- **エンティティ**: 同一性（ID）で識別されるオブジェクト。`Post`・`Task`・`Project` など
- **値オブジェクト**: 同一性を持たない不変オブジェクト。`Tension(1〜5)`・`Visibility`・`Role` など
- **リポジトリ**: ドメイン層はインターフェースのみ定義し、実装はインフラ層に委譲（依存性逆転の原則）
- **ユースケース**: 1クラス1ユースケースを原則とし、アプリケーション層に配置
- **ドメインイベント**: `PostCreated`・`ReportGenerated` などのイベントを活用してAI生成処理を非同期化

## PrismaとDDDの関係

Prismaのモデルはあくまで**永続化スキーマ**として扱い、ドメインエンティティとは分離する。

```
Prismaモデル（DB） ←→ リポジトリ実装（マッピング） ←→ ドメインエンティティ（ビジネスロジック）
```

DBの都合でドメインモデルが汚染されることを防ぎ、テスト時はリポジトリをモックに差し替えられる。
