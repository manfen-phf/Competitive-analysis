import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, getSessionCookieOptions, hasValidAccountScope, SESSION_COOKIE_NAME, verifyPassword } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

const loginInput = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "用户名或密码格式无效" }, { status: 400 });

  const prisma = await getPrisma();
  await prisma.appSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const user = await prisma.appUser.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.isActive || !hasValidAccountScope(user.role, user.city, user.bdName) || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role, city: user.city, bdName: user.bdName },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}
