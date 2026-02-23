import type { PrismaClient } from "@prisma/client";
import type { User } from "../../domain/user/user.entity.ts";
import type { IUserRepository } from "../../domain/user/user.repository.ts";

function toUser(record: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toUser(record) : null;
  }

  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;
    return { ...toUser(record), passwordHash: record.passwordHash };
  }
}
