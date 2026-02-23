import { type Handlers } from "$fresh/server.ts";
import { prisma } from "../../../lib/db.ts";
import { exchangeCodeForTokens } from "../../../lib/google-calendar.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/settings/google-calendar?error=${
            encodeURIComponent(
              "Google認証がキャンセルされました",
            )
          }`,
        },
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/settings/google-calendar?error=${
            encodeURIComponent(
              "不正なリクエストです",
            )
          }`,
        },
      });
    }

    // stateを検証してユーザーIDを取得
    const kv = await Deno.openKv();
    const stateResult = await kv.get<string>(["google_oauth_state", state]);
    const userId = stateResult.value;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/settings/google-calendar?error=${
            encodeURIComponent(
              "認証セッションが期限切れです。もう一度お試しください",
            )
          }`,
        },
      });
    }

    // 使用済みのstateを削除
    await kv.delete(["google_oauth_state", state]);

    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
    if (!redirectUri) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/settings/google-calendar?error=${
            encodeURIComponent(
              "サーバー設定エラーです",
            )
          }`,
        },
      });
    }

    try {
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      // GoogleCalendarConnectionをupsert（既存の場合は更新）
      await prisma.googleCalendarConnection.upsert({
        where: { userId },
        update: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
        create: {
          userId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });

      return new Response(null, {
        status: 302,
        headers: { Location: "/settings/google-calendar" },
      });
    } catch (err) {
      console.error("Google Calendar OAuth callback error:", err);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/settings/google-calendar?error=${
            encodeURIComponent(
              "トークンの取得に失敗しました",
            )
          }`,
        },
      });
    }
  },
};
