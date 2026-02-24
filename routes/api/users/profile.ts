import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { domainErrorResponse, unauthorized } from "../../../lib/http.ts";
import { userRepository } from "../../../lib/repositories.ts";
import { updateProfileUseCase } from "../../../application/user/update-profile.usecase.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const user = await userRepository.findById(session.userId);
    if (!user) {
      return Response.json(
        { success: false, error: "ユーザーが見つかりません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return Response.json({ success: true, data: user } satisfies ApiResponse);
  },

  async PUT(req) {
    const session = await getSession(req);
    if (!session) return unauthorized();

    let body: { name?: string; avatarUrl?: string | null };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "リクエストボディが不正です" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    try {
      const user = await updateProfileUseCase(
        { userRepository },
        { userId: session.userId, name: body.name, avatarUrl: body.avatarUrl },
      );
      return Response.json({ success: true, data: user } satisfies ApiResponse);
    } catch (e) {
      if (e instanceof DomainError) return domainErrorResponse(e);
      throw e;
    }
  },
};
