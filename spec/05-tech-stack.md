# 5. 技術スタック

## ランタイム

- **Deno** (v2.x)
  - TypeScriptをネイティブで実行できるため設定が不要
  - 標準ライブラリが充実しており依存関係を最小化できる
  - `deno.json` でワークスペース管理

## フロントエンド

- **フレームワーク**: Fresh（DenoネイティブなフルスタックWebフレームワーク）
  - ファイルベースルーティング
  - Islands Architecture（部分的クライアントハイドレーション）
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS（Freshに標準統合）
- **UIコンポーネント**: Preact（Freshのデフォルト）ベースで自作 or daisyUI

## バックエンド

- **フレームワーク**: Fresh API Routes（またはHono on Deno）
- **ORM**: Prisma（スキーマファーストでエンティティ定義を一元管理。`prisma/schema.prisma` をドメインモデルの起点として扱う。Deno向けには `npm:@prisma/client` で利用）
- **認証**: 自前JWT実装 or Deno KV セッション管理

## データベース・インフラ

- **DB**: PostgreSQL（Supabase 推奨）
  - Deno用 `postgres` ドライバ（`deno-postgres`）を使用
- **KVストア**: Deno KV（セッション・キャッシュ用途）
- **ファイルストレージ**: Supabase Storage（または Cloudflare R2）
- **ホスティング**: Deno Deploy（Freshとの相性が最良）

## AI

- **LLM**: Anthropic Claude API（claude-sonnet-4-6 推奨）
- **SDKなし直接呼び出し**: DenoのfetchでAnthropicのREST APIを直接叩く（または npm:@anthropic-ai/sdk）
- **用途**: レポート生成・インサイト分析・スタンドアップ生成
