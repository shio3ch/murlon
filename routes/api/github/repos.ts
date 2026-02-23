import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import { fetchRepos } from "../../../lib/github.ts";
import type { ApiResponse } from "../../../lib/types.ts";

interface RepoData {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
}

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: session.userId },
    });

    if (!connection) {
      return Response.json(
        { success: false, error: "GitHub連携が設定されていません" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    try {
      const repos = await fetchRepos(connection.accessToken);
      const data: RepoData[] = repos.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        description: r.description,
        private: r.private,
        updatedAt: r.updated_at,
      }));

      return Response.json(
        { success: true, data } satisfies ApiResponse<RepoData[]>,
      );
    } catch (err) {
      console.error("GitHub repos fetch error:", err);
      return Response.json(
        {
          success: false,
          error: "リポジトリの取得に失敗しました",
        } satisfies ApiResponse,
        { status: 500 },
      );
    }
  },
};
