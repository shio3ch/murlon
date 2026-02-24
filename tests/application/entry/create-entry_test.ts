import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { createEntryUseCase } from "../../../application/entry/create-entry.usecase.ts";
import {
  createEntry,
  createProject,
  createProjectMember,
  mockEntryRepository,
  mockProjectRepository,
} from "../../helpers.ts";

Deno.test("createEntry - 正常にエントリを作成できる", async () => {
  const saved = createEntry({ content: "新しい分報" });
  const deps = {
    entryRepository: mockEntryRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository(),
  };

  const result = await createEntryUseCase(deps, {
    content: "新しい分報",
    userId: "user-1",
  });
  assertEquals(result.content, "新しい分報");
});

Deno.test("createEntry - 空の内容はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createEntryUseCase(deps, { content: "", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "VALIDATION");
  assertEquals(err.message, "内容を入力してください");
});

Deno.test("createEntry - 空白のみの内容はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createEntryUseCase(deps, { content: "   ", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.message, "内容を入力してください");
});

Deno.test("createEntry - 5000文字を超える内容はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const longContent = "あ".repeat(5001);
  const err = await assertRejects(
    () => createEntryUseCase(deps, { content: longContent, userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.message, "内容は5000文字以内で入力してください");
});

Deno.test("createEntry - 5000文字ちょうどは許容される", async () => {
  const saved = createEntry();
  const deps = {
    entryRepository: mockEntryRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository(),
  };

  const result = await createEntryUseCase(deps, {
    content: "あ".repeat(5000),
    userId: "user-1",
  });
  assertEquals(result.id, saved.id);
});

Deno.test("createEntry - テンションが0はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createEntryUseCase(deps, { content: "test", userId: "user-1", tension: 0 }),
    DomainError,
  );
  assertEquals(err.message, "テンションは1〜5の整数で指定してください");
});

Deno.test("createEntry - テンションが6はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => createEntryUseCase(deps, { content: "test", userId: "user-1", tension: 6 }),
    DomainError,
  );
  assertEquals(err.message, "テンションは1〜5の整数で指定してください");
});

Deno.test("createEntry - テンションが小数はバリデーションエラー", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  await assertRejects(
    () => createEntryUseCase(deps, { content: "test", userId: "user-1", tension: 2.5 }),
    DomainError,
  );
});

Deno.test("createEntry - テンション1〜5の整数は有効", async () => {
  const saved = createEntry();
  const deps = {
    entryRepository: mockEntryRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository(),
  };

  for (const tension of [1, 2, 3, 4, 5]) {
    const result = await createEntryUseCase(deps, {
      content: "test",
      userId: "user-1",
      tension,
    });
    assertEquals(result.id, saved.id);
  }
});

Deno.test("createEntry - テンション null / undefined は許容", async () => {
  const saved = createEntry();
  const deps = {
    entryRepository: mockEntryRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository(),
  };

  await createEntryUseCase(deps, { content: "test", userId: "user-1", tension: null });
  await createEntryUseCase(deps, { content: "test", userId: "user-1" });
});

Deno.test("createEntry - 存在しないプロジェクトIDは NOT_FOUND", async () => {
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () =>
      createEntryUseCase(deps, {
        content: "test",
        userId: "user-1",
        projectId: "nonexistent",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("createEntry - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      createEntryUseCase(deps, {
        content: "test",
        userId: "user-1",
        projectId: project.id,
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("createEntry - プロジェクトメンバーはエントリを作成できる", async () => {
  const project = createProject({
    ownerId: "other-user",
    members: [createProjectMember({ userId: "user-1" })],
  });
  const saved = createEntry();
  const deps = {
    entryRepository: mockEntryRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const result = await createEntryUseCase(deps, {
    content: "test",
    userId: "user-1",
    projectId: project.id,
  });
  assertEquals(result.id, saved.id);
});
