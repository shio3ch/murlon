import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";

export const handler: Handlers = {
  async GET(req) {
    const session = await getSession(req);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/login" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");

    if (!clientId || !redirectUri) {
      return new Response("Google Calendar連携が設定されていません", {
        status: 500,
      });
    }

    // stateパラメータとしてランダムトークンを生成し、KVにユーザーIDを紐付けて保存
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const kv = await Deno.openKv();
    await kv.set(["google_oauth_state", state], session.userId, {
      expireIn: 10 * 60 * 1000, // 10分間有効
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  },
};
