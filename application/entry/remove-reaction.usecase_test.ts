import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Reaction } from "../../domain/reaction/reaction.entity.ts";
import type { IReactionRepository } from "../../domain/reaction/reaction.repository.ts";
import { removeReactionUseCase } from "./remove-reaction.usecase.ts";

function stubReactionRepository(
  overrides: Partial<IReactionRepository> = {},
): IReactionRepository {
  return {
    findById: () => Promise.resolve(null),
    findByEntryId: () => Promise.resolve([]),
    findByEntryAndUser: () => Promise.resolve(null),
    summarizeByEntry: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

const sampleReaction: Reaction = {
  id: "reaction-1",
  entryId: "entry-1",
  userId: "user-1",
  emoji: "👍",
  createdAt: new Date(),
};

Deno.test("removeReactionUseCase - 正常に削除できる", async () => {
  let deletedId: string | null = null;
  const deps = {
    reactionRepository: stubReactionRepository({
      findById: () => Promise.resolve(sampleReaction),
      delete: (id) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };
  await removeReactionUseCase(deps, { reactionId: "reaction-1", userId: "user-1" });
  assertEquals(deletedId, "reaction-1");
});

Deno.test("removeReactionUseCase - 存在しないリアクションはエラー", async () => {
  const deps = { reactionRepository: stubReactionRepository() };
  await assertRejects(
    () => removeReactionUseCase(deps, { reactionId: "nonexistent", userId: "user-1" }),
    DomainError,
    "リアクションが見つかりません",
  );
});

Deno.test("removeReactionUseCase - 他ユーザーのリアクションは削除不可", async () => {
  const deps = {
    reactionRepository: stubReactionRepository({
      findById: () => Promise.resolve(sampleReaction),
    }),
  };
  await assertRejects(
    () => removeReactionUseCase(deps, { reactionId: "reaction-1", userId: "other-user" }),
    DomainError,
    "Forbidden",
  );
});
