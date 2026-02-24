import type { AuthProvider, User } from "./user.entity.ts";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<(User & { passwordHash: string }) | null>;
  findByExternalId(
    provider: AuthProvider,
    externalId: string,
  ): Promise<User | null>;
  updateProfile(
    id: string,
    params: { name?: string; avatarUrl?: string | null },
  ): Promise<User>;
}
