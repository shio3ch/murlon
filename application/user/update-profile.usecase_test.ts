import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { User } from "../../domain/user/user.entity.ts";
import type { IUserRepository } from "../../domain/user/user.repository.ts";
import { updateProfileUseCase } from "./update-profile.usecase.ts";

const sampleUser: User = {
  id: "user-1",
  email: "test@example.com",
  name: "テストユーザー",
  avatarUrl: null,
  authProvider: "LOCAL",
  externalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function stubUserRepository(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findById: () => Promise.resolve(null),
    findByEmail: () => Promise.resolve(null),
    findByExternalId: () => Promise.resolve(null),
    updateProfile: (id, params) =>
      Promise.resolve({
        ...sampleUser,
        ...params,
        id,
        updatedAt: new Date(),
      }),
    ...overrides,
  };
}

Deno.test("updateProfileUseCase - 名前を更新できる", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  const result = await updateProfileUseCase(deps, {
    userId: "user-1",
    name: "新しい名前",
  });
  assertEquals(result.name, "新しい名前");
});

Deno.test("updateProfileUseCase - 存在しないユーザーはエラー", async () => {
  const deps = { userRepository: stubUserRepository() };
  await assertRejects(
    () => updateProfileUseCase(deps, { userId: "nonexistent", name: "テスト" }),
    DomainError,
    "ユーザーが見つかりません",
  );
});

Deno.test("updateProfileUseCase - 空の名前はエラー", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", name: "   " }),
    DomainError,
    "名前を入力してください",
  );
});

Deno.test("updateProfileUseCase - 50文字超の名前はエラー", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", name: "あ".repeat(51) }),
    DomainError,
    "50文字以内",
  );
});

Deno.test("updateProfileUseCase - 不正なURLのアバターはエラー", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  await assertRejects(
    () => updateProfileUseCase(deps, { userId: "user-1", avatarUrl: "not-a-url" }),
    DomainError,
    "形式が正しくありません",
  );
});

Deno.test("updateProfileUseCase - ftp://プロトコルのアバターURLはエラー", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "ftp://example.com/avatar.png",
      }),
    DomainError,
    "http/https形式",
  );
});

Deno.test("updateProfileUseCase - https URLのアバターは受け入れられる", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  const result = await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: "https://example.com/avatar.png",
  });
  assertEquals(result.avatarUrl, "https://example.com/avatar.png");
});

Deno.test("updateProfileUseCase - avatarUrlをnullにリセットできる", async () => {
  const userWithAvatar = { ...sampleUser, avatarUrl: "https://example.com/old.png" };
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(userWithAvatar),
      updateProfile: (id, params) =>
        Promise.resolve({
          ...userWithAvatar,
          ...params,
          id,
          updatedAt: new Date(),
        }),
    }),
  };
  const result = await updateProfileUseCase(deps, {
    userId: "user-1",
    avatarUrl: null,
  });
  assertEquals(result.avatarUrl, null);
});

Deno.test("updateProfileUseCase - 不正なdata URLはエラー", async () => {
  const deps = {
    userRepository: stubUserRepository({
      findById: () => Promise.resolve(sampleUser),
    }),
  };
  await assertRejects(
    () =>
      updateProfileUseCase(deps, {
        userId: "user-1",
        avatarUrl: "data:image/jpeg;base64,abc",
      }),
    DomainError,
    "PNG形式",
  );
});
