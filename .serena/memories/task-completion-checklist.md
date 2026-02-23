# タスク完了時のチェックリスト

1. `deno fmt` でフォーマット確認
2. `deno lint` でLintチェック
3. `deno task check` で型チェック
4. DBスキーマ変更がある場合: `deno task db:generate` でクライアント再生成
5. git commitは明示的に指示された場合のみ
