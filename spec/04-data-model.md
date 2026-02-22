# 4. データモデル

## User

| フィールド | 型       | 説明            |
| ---------- | -------- | --------------- |
| id         | UUID     | 主キー          |
| email      | string   | メールアドレス  |
| name       | string   | 表示名          |
| avatar_url | string   | アバター画像URL |
| created_at | datetime | 作成日時        |

## Project

| フィールド  | 型       | 説明                             |
| ----------- | -------- | -------------------------------- |
| id          | UUID     | 主キー                           |
| owner_id    | UUID     | オーナーユーザーID               |
| name        | string   | プロジェクト名                   |
| description | string   | 説明                             |
| visibility  | enum     | `private` / `limited` / `public` |
| created_at  | datetime | 作成日時                         |

## ProjectMember

| フィールド | 型   | 説明                                             |
| ---------- | ---- | ------------------------------------------------ |
| id         | UUID | 主キー                                           |
| project_id | UUID | プロジェクトID                                   |
| user_id    | UUID | ユーザーID                                       |
| role       | enum | `viewer` / `commenter` / `contributor` / `admin` |

## Post（分報）

| フィールド    | 型       | 説明                     |
| ------------- | -------- | ------------------------ |
| id            | UUID     | 主キー                   |
| project_id    | UUID     | プロジェクトID           |
| user_id       | UUID     | 投稿者ID                 |
| content       | text     | 本文                     |
| task_id       | UUID     | 紐づけタスクID（任意）   |
| tension       | integer  | テンション（1〜5、任意） |
| template_type | string   | 使用テンプレート（任意） |
| posted_at     | datetime | 投稿日時                 |

## Task

| フィールド  | 型     | 説明                                     |
| ----------- | ------ | ---------------------------------------- |
| id          | UUID   | 主キー                                   |
| project_id  | UUID   | プロジェクトID                           |
| title       | string | タスク名                                 |
| description | text   | 詳細                                     |
| status      | enum   | `todo` / `in_progress` / `done` / `hold` |
| priority    | enum   | `high` / `medium` / `low`                |
| due_date    | date   | 期限日                                   |
| assignee_id | UUID   | 担当者ID                                 |

## Report（レポート）

| フィールド      | 型       | 説明                           |
| --------------- | -------- | ------------------------------ |
| id              | UUID     | 主キー                         |
| project_id      | UUID     | プロジェクトID                 |
| user_id         | UUID     | 生成者ID                       |
| type            | enum     | `daily` / `weekly` / `monthly` |
| content         | text     | 生成されたレポート本文         |
| period_start    | date     | 対象期間（開始）               |
| period_end      | date     | 対象期間（終了）               |
| prompt_template | text     | 使用したプロンプト             |
| generated_at    | datetime | 生成日時                       |

## ReportTemplate

| フィールド | 型     | 説明                                       |
| ---------- | ------ | ------------------------------------------ |
| id         | UUID   | 主キー                                     |
| user_id    | UUID   | 作成者ID（nullの場合はシステムプリセット） |
| name       | string | テンプレート名                             |
| type       | enum   | `daily` / `weekly` / `monthly`             |
| prompt     | text   | AIへのプロンプト                           |
