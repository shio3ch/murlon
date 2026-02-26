# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

murlon は「書くだけで日報が完成する」Webアプリ。分報（短い投稿）をAnthropic Claude APIで自動集約し、日報・週報・月報を生成する。

## 仕様書

詳細な仕様は `spec/` 配下に分割管理している。目次は `spec/README.md` を参照。

| ファイル                        | 内容                      |
| ------------------------------- | ------------------------- |
| `spec/01-product-overview.md`   | プロダクト概要            |
| `spec/02-features.md`           | 機能一覧                  |
| `spec/03-screens.md`            | 画面構成                  |
| `spec/04-data-model.md`         | データモデル              |
| `spec/05-tech-stack.md`         | 技術スタック              |
| `spec/06-architecture.md`       | アーキテクチャ方針（DDD） |
| `spec/07-non-functional.md`     | 非機能要件                |
| `spec/08-development-phases.md` | 開発フェーズ              |

## 技術スタック

- **ランタイム**: Deno v2.x
- **フレームワーク**: Fresh 1.7.3 (Preact + Island Architecture)
- **CSS**: Tailwind CSS 3.4.1
- **ORM**: Prisma 5.10.2 (PostgreSQL, preview feature "deno")
- **セッション管理**: Deno KV + WebCrypto (PBKDF2)
- **AI**: Anthropic Claude API (直接HTTP fetch、SDK不使用)

## 開発コマンド

```bash
deno task dev              # 開発サーバー起動（ホットリロード）
deno task build            # プロダクションビルド
deno task start            # プロダクション起動
deno task check            # 型チェック + Lint + フォーマット確認
deno task db:push          # DBスキーマ反映
deno task db:migrate       # Prismaマイグレーション実行
deno task db:generate      # Prismaクライアント生成
deno task db:studio        # Prisma Studio起動
deno task docker:up        # Docker Compose 起動（PostgreSQL + Ollama）
deno task docker:down      # Docker Compose 停止
deno task docker:ollama:pull  # Ollamaモデル（gemma3）ダウンロード
deno task test             # テスト実行
deno task test:watch       # ウォッチモードでテスト実行
```

## アーキテクチャ

### ディレクトリ構成の役割

DDDのレイヤードアーキテクチャを採用している。

- `domain/` - ドメイン層。エンティティ・リポジトリインターフェース・ドメインロジック
- `application/` - アプリケーション層。ユースケース関数（1ファイル1ユースケース）
- `infrastructure/` - インフラ層。Prismaリポジトリ実装・AIプロバイダー実装
- `routes/` - プレゼンテーション層。HTTPのglueコードのみ（ビジネスロジックを持たない）
- `islands/` - クライアントサイドでhydrateされるインタラクティブコンポーネント
- `components/` - サーバーサイドのみでレンダリングされるコンポーネント
- `lib/` - DDD の4層に属さない横断的関心事（セッション管理・DBシングルトン・HTTP共通レスポンス・型定義）
- `prisma/` - データベーススキーマ定義
- `generated/client` - Prisma自動生成クライアント（gitignore対象）

### データモデル

- **User** → **Entry**（分報）: 1対多
- **User** → **Report**（日報/週報/月報）: 1対多
- **Report** ↔ **Entry**: ReportEntry経由の多対多

### 認証フロー

Deno KVにセッショントークン（7日間有効）を保存し、httpOnly Cookie `murlon_session` で管理。`lib/auth.ts` の `getSession(req)` でリクエストごとに認証確認。

### AI連携

ユースケース（`application/report/`, `application/standup/`）が `AIProvider` インターフェース経由でAIを呼び出す。Markdown形式のレポートを生成。

AIプロバイダーは環境変数 `AI_PROVIDER` で切り替え可能:

- `infrastructure/ai/provider.ts` - AIProvider インターフェース
- `infrastructure/ai/anthropic.ts` - Anthropic Claude API 実装
- `infrastructure/ai/openai-compatible.ts` - OpenAI互換API実装（Ollama等）
- `infrastructure/ai/index.ts` - ファクトリー（環境変数に基づき切り替え）

### API統一レスポンス型

`lib/types.ts` の `ApiResponse<T>` 型（`{ success, data?, error? }`）で統一。

## テスト

### 必須ルール

- **機能の追加・変更時は、必ず対応するテストコードを実装すること**
- **テストが全件パスすることを確認してから作業完了とすること**（`deno task test` で確認）
- テストが失敗した場合は、原因を特定し修正してから次に進むこと

### テストコマンド

```bash
deno task test              # テスト実行
deno task test:watch        # ウォッチモードでテスト実行
```

### テスト方針

- **テストフレームワーク**: Deno 標準の `Deno.test` + `$std/assert`
- **ファイル命名**: ソースファイルと同階層に `*_test.ts` で配置（例: `create-entry.usecase.ts` → `create-entry.usecase_test.ts`）
- **テスト対象の優先順位**:
  1. ドメイン層（`domain/`）- 純粋なドメインロジック
  2. アプリケーション層（`application/`）- ユースケースのビジネスロジック
  3. lib層（`lib/`）- ユーティリティ関数
- **リポジトリはスタブで差し替え** - DDDのインターフェース依存を活用し、DB接続なしで高速に実行
- **AIプロバイダーもスタブ** - 外部API呼び出しなしでロジックをテスト
- **エラーケースも必ずテスト** - バリデーション、権限チェック、存在チェックなど
- `routes/` はテスト対象から除外（`--ignore=routes/`）

## コーディング規約

- フォーマット: インデント2スペース、セミコロンあり、ダブルクォート、行幅100
- JSX: `react-jsx` mode、jsxImportSource は `preact`
- ロケール: 日付表示は `ja-JP` 統一
- エラーメッセージ: 日本語

## Docker環境

`docker-compose.yml` で以下のサービスを管理:

- **PostgreSQL 16**: ポート5432、DB名/ユーザー/パスワード = murlon
- **Ollama**: ポート11434、ローカルLLM実行環境

初回セットアップ:

```bash
deno task docker:up          # コンテナ起動
deno task docker:ollama:pull # モデルダウンロード
deno task db:push            # DBスキーマ反映
```

## 環境変数

`.env.example` を参照。

### AI_PROVIDER

`AI_PROVIDER` 環境変数でAIバックエンドを切り替える:

- `"openai-compatible"` (デフォルト): Ollama等のOpenAI互換APIを使用。`OPENAI_API_BASE`, `OPENAI_MODEL` を設定
- `"anthropic"`: Anthropic Claude APIを使用。`ANTHROPIC_API_KEY` を設定

### 必須環境変数

`DATABASE_URL`, `DIRECT_URL`, `AI_PROVIDER`, `DENO_ENV` が必要。AIプロバイダーに応じて追加の環境変数が必要。
