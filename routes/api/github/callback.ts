import { type Handlers } from "$fresh/server.ts";
import { prisma } from "../../../lib/db.ts";
import { exchangeCodeForToken, fetchGitHubUser } from "../../../lib/github.ts";

const KV_GITHUB_STATE_PREFIX = "github_oauth_state:";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("無効なリクエストです", { status: 400 });
    }

    // state検証
    const kv = await Deno.openKv();
    const stateResult = await kv.get<string>([KV_GITHUB_STATE_PREFIX + state]);
    const userId = stateResult.value;

    if (!userId) {
      return new Response("認証セッションが無効または期限切れです", { status: 400 });
    }

    // state消費（再利用防止）
    await kv.delete([KV_GITHUB_STATE_PREFIX + state]);

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response("GitHub連携が設定されていません", { status: 500 });
    }

    try {
      // codeをアクセストークンに交換
      const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);

      // GitHubユーザー情報取得
      const ghUser = await fetchGitHubUser(accessToken);

      // GitHubConnectionをDB保存（upsert）
      await prisma.gitHubConnection.upsert({
        where: { userId },
        create: {
          userId,
          accessToken,
          githubUserId: String(ghUser.id),
          githubLogin: ghUser.login,
        },
        update: {
          accessToken,
          githubUserId: String(ghUser.id),
          githubLogin: ghUser.login,
        },
      });

      return new Response(null, {
        status: 302,
        headers: { Location: "/settings/github" },
      });
    } catch (err) {
      console.error("GitHub OAuth callback error:", err);
      return new Response("GitHub認証に失敗しました", { status: 500 });
    }
  },
};
