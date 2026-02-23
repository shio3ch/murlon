# Murlon プロジェクト概要

## 目的

「書くだけで日報が完成する」Webアプリ。分報（短い投稿）をAI（Claude API / Ollama）で自動集約し、日報・週報・月報を生成する。

## 技術スタック

- **ランタイム**: Deno v2.x
- **フレームワーク**: Fresh 1.7.3 (Preact + Island Architecture)
- **CSS**: Tailwind CSS 3.4.1
- **ORM**: Prisma 5.10.2 (PostgreSQL, preview feature "deno")
- **セッション管理**: Deno KV + WebCrypto (PBKDF2)
- **AI**: Anthropic Claude API / OpenAI互換API (Ollama等)

## コーディング規約

- インデント2スペース、セミコロンあり、ダブルクォート、行幅100
- JSX: react-jsx mode, jsxImportSource: preact
- ロケール: ja-JP統一
- エラーメッセージ: 日本語

## 現在のディレクトリ構成

```
routes/           - ファイルベースルーティング（Fresh）
  auth/           - login, register, logout
  api/entries/    - Entry CRUD API
  api/reports/    - レポート生成API
  reports/        - レポート表示ページ
islands/          - Preact Islands (EntryForm, DashboardIsland, EntryList, ReportView)
components/       - サーバーコンポーネント (Header)
lib/              - 共通ロジック (db, auth, ai, types)
  ai/             - AIプロバイダー抽象化
prisma/           - schema.prisma
```

## 現在のDBスキーマ

- User (id, email, passwordHash, name)
- Entry (id, content, userId) - 分報
- Report (id, type, content, startDate, endDate, userId)
- ReportEntry (reportId, entryId) - 多対多中間テーブル
