export type AuthProvider = "LOCAL" | "GOOGLE" | "GITHUB";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly authProvider: AuthProvider;
  readonly externalId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
