import { NextResponse } from "next/server";

import { clearSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  await clearSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
