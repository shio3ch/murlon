import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import type { Project } from "../../domain/project/project.entity.ts";
import { createEntryUseCase, type CreateEntryDeps } from "./create-entry.usecase.ts";

function stubEntryRepository(overrides: Partial<IEntryRepository> = {}): IEntryRepository {
  return {
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: (entry: Entry) => Promise.resolve(entry),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
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

function createDeps(overrides: Partial<CreateEntryDeps> = {}): CreateEntryDeps {
  return {
    entryRepository: stubEntryRepository(),
    projectRepository: stubProjectRepository(),
    ...overrides,
  };
}

Deno.test("createEntryUseCase - 正常に分報を作成できる", async () => {
  let savedEntry: Entry | null = null;
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      save: (entry) => {
        savedEntry = entry;
        return Promise.resolve(entry);
      },
    }),
  });

  const result = await createEntryUseCase(deps, {
    content: "テスト投稿",
    userId: "user-1",
  });

  assertEquals(result.content, "テスト投稿");
  assertEquals(result.userId, "user-1");
  assertEquals(result.projectId, null);
  assertEquals(savedEntry !== null, true);
});

Deno.test("createEntryUseCase - 空の内容はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () => createEntryUseCase(deps, { content: "   ", userId: "user-1" }),
    DomainError,
    "内容を入力してください",
  );
});

Deno.test("createEntryUseCase - 5000文字超はエラー", async () => {
  const deps = createDeps();
  const longContent = "あ".repeat(5001);
  await assertRejects(
    () => createEntryUseCase(deps, { content: longContent, userId: "user-1" }),
    DomainError,
    "5000文字以内",
  );
});

Deno.test("createEntryUseCase - テンション範囲外はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      createEntryUseCase(deps, { content: "テスト", userId: "user-1", tension: 0 }),
    DomainError,
    "テンションは1〜5",
  );
  await assertRejects(
    () =>
      createEntryUseCase(deps, { content: "テスト", userId: "user-1", tension: 6 }),
    DomainError,
    "テンションは1〜5",
  );
});

Deno.test("createEntryUseCase - 小数のテンションはエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      createEntryUseCase(deps, { content: "テスト", userId: "user-1", tension: 2.5 }),
    DomainError,
    "テンションは1〜5",
  );
});

Deno.test("createEntryUseCase - 存在しないプロジェクトIDはエラー", async () => {
  const deps = createDeps({
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(null),
    }),
  });
  await assertRejects(
    () =>
      createEntryUseCase(deps, {
        content: "テスト",
        userId: "user-1",
        projectId: "nonexistent",
      }),
    DomainError,
    "プロジェクトが見つかりません",
  );
});

Deno.test("createEntryUseCase - プロジェクトへのアクセス権がないとエラー", async () => {
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
      createEntryUseCase(deps, {
        content: "テスト",
        userId: "user-1",
        projectId: "proj-1",
      }),
    DomainError,
    "アクセス権がありません",
  );
});

Deno.test("createEntryUseCase - プロジェクトオーナーは投稿できる", async () => {
  const project: Project = {
    id: "proj-1",
    name: "テスト",
    description: null,
    visibility: "PRIVATE",
    ownerId: "user-1",
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      save: (entry) => Promise.resolve(entry),
    }),
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(project),
    }),
  });
  const result = await createEntryUseCase(deps, {
    content: "テスト",
    userId: "user-1",
    projectId: "proj-1",
  });
  assertEquals(result.projectId, "proj-1");
});

Deno.test("createEntryUseCase - 有効なテンション値は受け入れられる", async () => {
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      save: (entry) => Promise.resolve(entry),
    }),
  });
  for (const tension of [1, 2, 3, 4, 5]) {
    const result = await createEntryUseCase(deps, {
      content: "テスト",
      userId: "user-1",
      tension,
    });
    assertEquals(result.tension, tension);
  }
});

Deno.test("createEntryUseCase - nullテンションは受け入れられる", async () => {
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      save: (entry) => Promise.resolve(entry),
    }),
  });
  const result = await createEntryUseCase(deps, {
    content: "テスト",
    userId: "user-1",
    tension: null,
  });
  assertEquals(result.tension, null);
});
