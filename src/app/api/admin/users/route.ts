import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession, hashPassword } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

const createUserInput = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "CITY_ADMIN", "BD"]),
  city: z.string().trim().optional(),
  bdName: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const actor = await getSession();
  if (!actor) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "无权创建账号" }, { status: 403 });

  const parsed = createUserInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "账号信息无效" }, { status: 400 });

  const { username, password, role } = parsed.data;
  const city = parsed.data.city || undefined;
  const bdName = parsed.data.bdName || undefined;
  if (role === "CITY_ADMIN" && !city) return NextResponse.json({ error: "城市管理员必须指定城市" }, { status: 400 });
  if (role === "BD" && (!city || !bdName || username !== bdName)) {
    return NextResponse.json({ error: "BD 账号必须指定城市、BD 姓名，且用户名须与 BD 姓名一致" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const user = await prisma.appUser.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role,
        city: role === "SUPER_ADMIN" ? null : city ?? null,
        bdName: role === "BD" ? bdName : null,
      },
    });
    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role, city: user.city, bdName: user.bdName } }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }
    throw error;
  }
}
