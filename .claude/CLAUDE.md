# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

murlon は「書くだけで日報が完成する」Webアプリ。分報（短い投稿）をAnthropic Claude APIで自動集約し、日報・週報・月報を生成する。

## 仕様書

詳細な仕様は `spec/` 配下に分割管理している。目次は `spec/README.md` を参照。

| ファイル | 内容 |
| --- | --- |
| `spec/01-product-overview.md` | プロダクト概要 |
| `spec/02-features.md` | 機能一覧 |
| `spec/03-screens.md` | 画面構成 |
| `spec/04-data-model.md` | データモデル |
| `spec/05-tech-stack.md` | 技術スタック |
| `spec/06-architecture.md` | アーキテクチャ方針（DDD） |
| `spec/07-non-functional.md` | 非機能要件 |
| `spec/08-development-phases.md` | 開発フェーズ |

## 技術スタック

- **ランタイム**: Deno v2.x
- **フレームワーク**: Fresh 1.7.3 (Preact + Island Architecture)
- **CSS**: Tailwind CSS 3.4.1
- **ORM**: Prisma 5.10.2 (PostgreSQL, preview feature "deno")
- **セッション管理**: Deno KV + WebCrypto (PBKDF2)
- **AI**: Anthropic Claude API (直接HTTP fetch、SDK不使用)

## 開発コマンド

```bash
deno task dev          # 開発サーバー起動（ホットリロード）
deno task build        # プロダクションビルド
deno task start        # プロダクション起動
deno task check        # 型チェック + Lint + フォーマット確認
deno task db:push      # DBスキーマ反映
deno task db:migrate   # Prismaマイグレーション実行
deno task db:generate  # Prismaクライアント生成
deno task db:studio    # Prisma Studio起動
```

## アーキテクチャ

### ディレクトリ構成の役割

- `routes/` - ファイルベースルーティング（Fresh）。ページとAPIエンドポイント
- `islands/` - クライアントサイドでhydrateされるインタラクティブコンポーネント
- `components/` - サーバーサイドのみでレンダリングされるコンポーネント
- `lib/` - 共通ロジック（DB, 認証, AI連携, 型定義）
- `prisma/` - データベーススキーマ定義
- `generated/client` - Prisma自動生成クライアント（gitignore対象）

### データモデル

- **User** → **Entry**（分報）: 1対多
- **User** → **Report**（日報/週報/月報）: 1対多
- **Report** ↔ **Entry**: ReportEntry経由の多対多

### 認証フロー

Deno KVにセッショントークン（7日間有効）を保存し、httpOnly Cookie `murlon_session` で管理。`lib/auth.ts` の `getSession(req)` でリクエストごとに認証確認。

### AI連携

`lib/ai.ts` で期間内のEntry一覧をフォーマットし、Claude API (`claude-sonnet-4-6`) へ直接HTTP fetchでリクエスト。Markdown形式のレポートを生成。

### API統一レスポンス型

`lib/types.ts` の `ApiResponse<T>` 型（`{ success, data?, error? }`）で統一。

## コーディング規約

- フォーマット: インデント2スペース、セミコロンあり、ダブルクォート、行幅100
- JSX: `react-jsx` mode、jsxImportSource は `preact`
- ロケール: 日付表示は `ja-JP` 統一
- エラーメッセージ: 日本語

## 環境変数

`.env.example` を参照。`DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY`, `DENO_ENV` が必要。
