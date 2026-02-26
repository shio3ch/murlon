import { assertRejects } from "$std/assert/mod.ts";
import { assertEquals } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { Standup } from "../../domain/standup/standup.entity.ts";
import type { IStandupRepository } from "../../domain/standup/standup.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import type { Project } from "../../domain/project/project.entity.ts";
import type { AIProvider } from "../../infrastructure/ai/provider.ts";
import {
  generateStandupUseCase,
  type GenerateStandupDeps,
} from "./generate-standup.usecase.ts";

const sampleEntries: Entry[] = [
  {
    id: "entry-1",
    content: "朝のタスク完了",
    userId: "user-1",
    projectId: null,
    taskId: null,
    tension: 3,
    templateType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function stubEntryRepository(overrides: Partial<IEntryRepository> = {}): IEntryRepository {
  return {
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

function stubStandupRepository(
  overrides: Partial<IStandupRepository> = {},
): IStandupRepository {
  return {
    findByUserAndDate: () => Promise.resolve(null),
    save: (params) =>
      Promise.resolve({
        id: "standup-1",
        userId: params.userId,
        projectId: params.projectId,
        content: params.content,
        date: params.date,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    update: (id, content) =>
      Promise.resolve({
        id,
        userId: "user-1",
        projectId: null,
        content,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ...overrides,
  };
}

function stubProjectRepository(
  overrides: Partial<IProjectRepository> = {},
): IProjectRepository {
  return {
    findById: () => Promise.resolve(null),
    findByIdWithMemberUsers: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

function stubAIProvider(response = "**昨日やったこと**\n- タスク完了"): AIProvider {
  return {
    generateText: () => Promise.resolve(response),
  };
}

function createDeps(overrides: Partial<GenerateStandupDeps> = {}): GenerateStandupDeps {
  return {
    standupRepository: stubStandupRepository(),
    entryRepository: stubEntryRepository(),
    projectRepository: stubProjectRepository(),
    aiProvider: stubAIProvider(),
    ...overrides,
  };
}

Deno.test("generateStandupUseCase - スタンドアップを生成できる", async () => {
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
  });

  const result = await generateStandupUseCase(deps, {
    userId: "user-1",
    date: "2026-02-25",
  });

  assertEquals(result.userId, "user-1");
  assertEquals(typeof result.content, "string");
});

Deno.test("generateStandupUseCase - 分報がない日はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () => generateStandupUseCase(deps, { userId: "user-1", date: "2026-02-25" }),
    DomainError,
    "分報がありません",
  );
});

Deno.test("generateStandupUseCase - 不正な日付形式はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () => generateStandupUseCase(deps, { userId: "user-1", date: "invalid" }),
    DomainError,
    "日付形式",
  );
});

Deno.test("generateStandupUseCase - 既存のスタンドアップがあれば更新する", async () => {
  let updatedContent: string | null = null;
  const existingStandup: Standup = {
    id: "standup-old",
    userId: "user-1",
    projectId: null,
    content: "古い内容",
    date: new Date("2026-02-25"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
    standupRepository: stubStandupRepository({
      findByUserAndDate: () => Promise.resolve(existingStandup),
      update: (id, content) => {
        updatedContent = content;
        return Promise.resolve({
          ...existingStandup,
          content,
          updatedAt: new Date(),
        });
      },
    }),
  });

  await generateStandupUseCase(deps, { userId: "user-1", date: "2026-02-25" });
  assertEquals(updatedContent !== null, true);
});

Deno.test("generateStandupUseCase - 存在しないプロジェクトはエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      generateStandupUseCase(deps, {
        userId: "user-1",
        date: "2026-02-25",
        projectId: "nonexistent",
      }),
    DomainError,
    "プロジェクトが見つかりません",
  );
});

Deno.test("generateStandupUseCase - プロジェクトへのアクセス権がないとエラー", async () => {
  const project: Project = {
    id: "proj-1",
    name: "テスト",
    description: null,
    visibility: "PRIVATE",
    ownerId: "other-user",
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const deps = createDeps({
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(project),
    }),
  });
  await assertRejects(
    () =>
      generateStandupUseCase(deps, {
        userId: "user-1",
        date: "2026-02-25",
        projectId: "proj-1",
      }),
    DomainError,
    "アクセス権がありません",
  );
});
