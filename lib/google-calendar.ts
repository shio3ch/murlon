export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

interface CalendarListResponse {
  items?: CalendarEvent[];
  error?: { message: string; code: number };
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * 指定日のカレンダーイベント一覧を取得
 */
export async function fetchEvents(
  accessToken: string,
  date: string,
): Promise<CalendarEvent[]> {
  const timeMin = new Date(`${date}T00:00:00`).toISOString();
  const timeMax = new Date(`${date}T23:59:59`).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar APIエラー: ${res.status} ${errorBody}`);
  }

  const data: CalendarListResponse = await res.json();
  return data.items ?? [];
}

/**
 * リフレッシュトークンを使ってアクセストークンを更新
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_IDまたはGOOGLE_CLIENT_SECRETが設定されていません");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data: TokenResponse = await res.json();

  if (data.error) {
    throw new Error(
      `トークン更新エラー: ${data.error} - ${data.error_description}`,
    );
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

/**
 * カレンダーイベントを "HH:mm タイトル" 形式の文字列に変換
 */
export function formatEventForDisplay(event: CalendarEvent): string {
  const startStr = event.start.dateTime ?? event.start.date;
  if (!startStr) return event.summary || "(無題)";

  if (event.start.dateTime) {
    const date = new Date(event.start.dateTime);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes} ${event.summary || "(無題)"}`;
  }

  // 終日イベント
  return `終日 ${event.summary || "(無題)"}`;
}

/**
 * 認可コードをトークンに交換
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_IDまたはGOOGLE_CLIENT_SECRETが設定されていません");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const data: TokenResponse = await res.json();

  if (data.error) {
    throw new Error(
      `トークン交換エラー: ${data.error} - ${data.error_description}`,
    );
  }

  if (!data.refresh_token) {
    throw new Error("リフレッシュトークンが取得できませんでした");
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}
