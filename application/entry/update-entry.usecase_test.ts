import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import { updateEntryUseCase } from "./update-entry.usecase.ts";

function stubEntryRepository(overrides: Partial<IEntryRepository> = {}): IEntryRepository {
  return {
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    update: (partial) =>
      Promise.resolve({
        ...sampleEntry,
        ...partial,
        updatedAt: new Date(),
      }),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

const sampleEntry: Entry = {
  id: "entry-1",
  content: "元のテスト",
  userId: "user-1",
  projectId: null,
  taskId: null,
  tension: null,
  templateType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

Deno.test("updateEntryUseCase - 内容を更新できる", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  const result = await updateEntryUseCase(deps, {
    id: "entry-1",
    userId: "user-1",
    content: "更新後",
  });
  assertEquals(result.content, "更新後");
});

Deno.test("updateEntryUseCase - 存在しない分報はエラー", async () => {
  const deps = { entryRepository: stubEntryRepository() };
  await assertRejects(
    () => updateEntryUseCase(deps, { id: "nonexistent", userId: "user-1", content: "更新" }),
    DomainError,
    "分報が見つかりません",
  );
});

Deno.test("updateEntryUseCase - 他ユーザーの分報は更新不可", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  await assertRejects(
    () => updateEntryUseCase(deps, { id: "entry-1", userId: "other-user", content: "更新" }),
    DomainError,
    "Forbidden",
  );
});

Deno.test("updateEntryUseCase - 空の内容はエラー", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  await assertRejects(
    () => updateEntryUseCase(deps, { id: "entry-1", userId: "user-1", content: "   " }),
    DomainError,
    "内容を入力してください",
  );
});

Deno.test("updateEntryUseCase - 5000文字超はエラー", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  await assertRejects(
    () =>
      updateEntryUseCase(deps, {
        id: "entry-1",
        userId: "user-1",
        content: "あ".repeat(5001),
      }),
    DomainError,
    "5000文字以内",
  );
});

Deno.test("updateEntryUseCase - テンション範囲外はエラー", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  await assertRejects(
    () => updateEntryUseCase(deps, { id: "entry-1", userId: "user-1", tension: 0 }),
    DomainError,
    "テンションは1〜5",
  );
  await assertRejects(
    () => updateEntryUseCase(deps, { id: "entry-1", userId: "user-1", tension: 6 }),
    DomainError,
    "テンションは1〜5",
  );
});
