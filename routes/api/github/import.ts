import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import { fetchCommits, formatCommitAsEntry } from "../../../lib/github.ts";
import type { ApiResponse } from "../../../lib/types.ts";

export const handler: Handlers = {
  async POST(req) {
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: "認証が必要です" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    let body: {
      owner?: string;
      repo?: string;
      since?: string;
      until?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: "無効なリクエストです" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.owner || !body.repo) {
      return Response.json(
        {
          success: false,
          error: "ownerとrepoは必須です",
        } satisfies ApiResponse,
        { status: 400 },
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
      const commits = await fetchCommits(
        connection.accessToken,
        body.owner,
        body.repo,
        body.since,
        body.until,
      );

      // 各コミットをEntryとして保存
      let importedCount = 0;
      for (const commit of commits) {
        const content = formatCommitAsEntry(
          commit,
          `${body.owner}/${body.repo}`,
        );
        await prisma.entry.create({
          data: {
            content,
            userId: session.userId,
          },
        });
        importedCount++;
      }

      // lastImportedAtを更新
      await prisma.gitHubConnection.update({
        where: { userId: session.userId },
        data: { lastImportedAt: new Date() },
      });

      return Response.json(
        {
          success: true,
          data: { importedCount },
        } satisfies ApiResponse<{ importedCount: number }>,
      );
    } catch (err) {
      console.error("GitHub import error:", err);
      return Response.json(
        {
          success: false,
          error: "コミットのインポートに失敗しました",
        } satisfies ApiResponse,
        { status: 500 },
      );
    }
  },
};
