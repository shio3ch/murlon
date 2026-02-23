import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";

const KV_GITHUB_STATE_PREFIX = "github_oauth_state:";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    if (!clientId) {
      return new Response("GitHub連携が設定されていません", { status: 500 });
    }

    // stateパラメータ生成・KV保存
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const kv = await Deno.openKv();
    await kv.set(
      [KV_GITHUB_STATE_PREFIX + state],
      session.userId,
      { expireIn: 10 * 60 * 1000 }, // 10分
    );

    const params = new URLSearchParams({
      client_id: clientId,
      scope: "repo",
      state,
      redirect_uri: new URL("/api/github/callback", req.url).toString(),
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://github.com/login/oauth/authorize?${params}`,
      },
    });
  },
};
