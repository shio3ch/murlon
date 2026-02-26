import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import { deleteEntryUseCase } from "./delete-entry.usecase.ts";

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

const sampleEntry: Entry = {
  id: "entry-1",
  content: "テスト",
  userId: "user-1",
  projectId: null,
  taskId: null,
  tension: null,
  templateType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

Deno.test("deleteEntryUseCase - 正常に削除できる", async () => {
  let deletedId: string | null = null;
  const deps = {
    entryRepository: stubEntryRepository({
      findById: (id) => Promise.resolve(id === "entry-1" ? sampleEntry : null),
      delete: (id) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await deleteEntryUseCase(deps, { id: "entry-1", userId: "user-1" });
  assertEquals(deletedId, "entry-1");
});

Deno.test("deleteEntryUseCase - 存在しない分報はエラー", async () => {
  const deps = { entryRepository: stubEntryRepository() };
  await assertRejects(
    () => deleteEntryUseCase(deps, { id: "nonexistent", userId: "user-1" }),
    DomainError,
    "分報が見つかりません",
  );
});

Deno.test("deleteEntryUseCase - 他ユーザーの分報は削除不可", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
  };
  await assertRejects(
    () => deleteEntryUseCase(deps, { id: "entry-1", userId: "other-user" }),
    DomainError,
    "Forbidden",
  );
});
