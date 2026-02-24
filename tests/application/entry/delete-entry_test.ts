import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { deleteEntryUseCase } from "../../../application/entry/delete-entry.usecase.ts";
import { createEntry, mockEntryRepository } from "../../helpers.ts";

Deno.test("deleteEntry - 正常に削除できる", async () => {
  let deletedId: string | null = null;
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({
      findById: () => Promise.resolve(existing),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await deleteEntryUseCase(deps, { id: "entry-1", userId: "user-1" });
  assertEquals(deletedId, "entry-1");
});

Deno.test("deleteEntry - 存在しないエントリは NOT_FOUND", async () => {
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => deleteEntryUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("deleteEntry - 他人のエントリは FORBIDDEN", async () => {
  const existing = createEntry({ userId: "user-1" });
  const deps = {
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(existing) }),
  };

  const err = await assertRejects(
    () => deleteEntryUseCase(deps, { id: "entry-1", userId: "user-2" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});
