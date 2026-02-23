# murlon

> 書くだけで日報が完成する

ひとりごとのような気軽な分報を積み重ねて、AIが自動的に日報・週報・月報へ集約するWebアプリケーション。

## 技術スタック

| カテゴリ       | 技術                                                     |
| -------------- | -------------------------------------------------------- |
| ランタイム     | [Deno](https://deno.land/) v2.x                          |
| フロントエンド | [Fresh](https://fresh.deno.dev/) + Preact + Tailwind CSS |
| バックエンド   | Fresh API Routes                                         |
| ORM            | [Prisma](https://www.prisma.io/)                         |
| 認証           | Deno KV セッション管理 + WebCrypto (PBKDF2)              |
| データベース   | PostgreSQL (Supabase 推奨)                               |
| KVストア       | Deno KV (セッション・キャッシュ)                         |
| AI             | Anthropic Claude API (claude-sonnet-4-6)                 |

## 機能

- 📝 **分報投稿** - ひとことから始まる気軽な作業ログ
- 📋 **日報生成** - 1日の分報をAIが自動まとめ
- 📅 **週報生成** - 1週間の活動をAIが集約
- 📆 **月報生成** - 月次の振り返りをAIが作成
- 🔐 **認証** - メールアドレス・パスワードによるログイン

## セットアップ

### 必要環境

- Deno v2.x
- PostgreSQL (またはSupabaseアカウント)
- Anthropic APIキー

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/shio3ch/murlon.git
cd murlon

# 環境変数を設定
cp .env.example .env
# .env を編集して DATABASE_URL と ANTHROPIC_API_KEY を設定

# DBマイグレーション
deno task db:push

# 開発サーバー起動
deno task dev
```

### 環境変数

| 変数名              | 説明                                |
| ------------------- | ----------------------------------- |
| `DATABASE_URL`      | PostgreSQL接続URL                   |
| `DIRECT_URL`        | PostgreSQL直接接続URL (Supabase用)  |
| `ANTHROPIC_API_KEY` | Anthropic Claude APIキー            |
| `DENO_ENV`          | 環境 (`development` / `production`) |

## 開発コマンド

```bash
deno task dev          # 開発サーバー起動
deno task build        # プロダクションビルド
deno task start        # プロダクション起動
deno task check        # 型チェック + Lint + フォーマット確認
deno task db:push      # DBスキーマを反映
deno task db:migrate   # マイグレーション実行
deno task db:studio    # Prisma Studio起動
```

## アーキテクチャ

```
murlon/
├── routes/              # ファイルベースルーティング
│   ├── _app.tsx         # アプリケーションラッパー
│   ├── index.tsx        # ダッシュボード (分報一覧)
│   ├── auth/            # 認証ページ
│   ├── reports/         # レポートページ (日報/週報/月報)
│   └── api/             # API エンドポイント
├── islands/             # クライアントサイドコンポーネント
│   ├── EntryForm.tsx    # 分報投稿フォーム
│   ├── EntryList.tsx    # 分報一覧
│   └── ReportView.tsx   # レポート表示・生成
├── components/          # サーバーサイドコンポーネント
│   └── Header.tsx       # ナビゲーションヘッダー
├── lib/                 # ユーティリティ
│   ├── db.ts            # Prismaクライアント
│   ├── auth.ts          # 認証 (セッション管理・パスワードハッシュ)
│   ├── ai.ts            # Anthropic Claude API連携
│   └── types.ts         # 共通型定義
└── prisma/
    └── schema.prisma    # データベーススキーマ
```

## デプロイ

[Deno Deploy](https://deno.com/deploy) へのデプロイを推奨します。

```bash
deno task build
deployctl deploy --project=murlon main.ts
```
