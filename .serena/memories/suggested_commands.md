# 開発コマンド

## 開発

```bash
deno task dev              # 開発サーバー起動（ホットリロード）
deno task build            # プロダクションビルド
deno task start            # プロダクション起動
```

## 品質チェック

```bash
deno task check            # 型チェック + Lint + フォーマット確認
deno fmt                   # フォーマット
deno lint                  # Lint
```

## データベース

```bash
deno task db:push          # DBスキーマ反映（開発用）
deno task db:migrate       # Prismaマイグレーション実行
deno task db:generate      # Prismaクライアント生成
deno task db:studio        # Prisma Studio起動
```

## Docker

```bash
deno task docker:up        # PostgreSQL + Ollama起動
deno task docker:down      # Docker停止
deno task docker:ollama:pull  # Ollamaモデルダウンロード
```

## システムコマンド (macOS/Darwin)

- git, ls, cd, grep, find: 標準Unix互換
