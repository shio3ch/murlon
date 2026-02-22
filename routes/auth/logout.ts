import { type Handlers } from "$fresh/server.ts";
import { clearSessionCookie, deleteSession } from "../../lib/auth.ts";

export const handler: Handlers = {
  async POST(req) {
    await deleteSession(req);
    const headers = new Headers({ Location: "/auth/login" });
    clearSessionCookie(headers);
    return new Response(null, { status: 302, headers });
  },
};
