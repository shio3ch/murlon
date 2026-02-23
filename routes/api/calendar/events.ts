import { type Handlers } from "$fresh/server.ts";
import { getSession } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/db.ts";
import {
  fetchEvents,
  formatEventForDisplay,
  refreshAccessToken,
} from "../../../lib/google-calendar.ts";
import type { ApiResponse } from "../../../lib/types.ts";

interface CalendarEventResponse {
  id: string;
  summary: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  description: string | null;
  location: string | null;
  displayText: string;
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

    const url = new URL(req.url);
    const date = url.searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    // YYYY-MM-DD形式の簡易バリデーション
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        {
          success: false,
          error: "日付はYYYY-MM-DD形式で指定してください",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: session.userId },
    });

    if (!connection) {
      return Response.json(
        {
          success: false,
          error: "Google Calendarが連携されていません",
        } satisfies ApiResponse,
        { status: 404 },
      );
    }

    let accessToken = connection.accessToken;

    // トークンが期限切れの場合はリフレッシュ
    if (new Date() >= connection.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(connection.refreshToken);
        accessToken = refreshed.accessToken;

        await prisma.googleCalendarConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt,
          },
        });
      } catch (err) {
        console.error("トークン更新エラー:", err);
        return Response.json(
          {
            success: false,
            error: "トークンの更新に失敗しました。再連携してください",
          } satisfies ApiResponse,
          { status: 401 },
        );
      }
    }

    try {
      const events = await fetchEvents(accessToken, date);

      const data: CalendarEventResponse[] = events.map((event) => ({
        id: event.id,
        summary: event.summary || "(無題)",
        startTime: event.start.dateTime ?? event.start.date ?? null,
        endTime: event.end.dateTime ?? event.end.date ?? null,
        isAllDay: !event.start.dateTime,
        description: event.description ?? null,
        location: event.location ?? null,
        displayText: formatEventForDisplay(event),
      }));

      return Response.json(
        { success: true, data } satisfies ApiResponse<CalendarEventResponse[]>,
      );
    } catch (err) {
      console.error("カレンダーイベント取得エラー:", err);
      return Response.json(
        {
          success: false,
          error: "カレンダーイベントの取得に失敗しました",
        } satisfies ApiResponse,
        { status: 500 },
      );
    }
  },
};
