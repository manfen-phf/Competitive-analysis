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

const updateUserInput = z.object({
  id: z.string().trim().min(1),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => value.password !== undefined || value.isActive !== undefined, { message: "至少修改一项账号设置" });

async function requireSuperAdministrator() {
  const actor = await getSession();
  if (!actor) return { actor: null, response: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  if (actor.role !== "SUPER_ADMIN") return { actor: null, response: NextResponse.json({ error: "无权管理账号" }, { status: 403 }) };
  return { actor, response: null };
}

function safeUser(user: { id: string; username: string; role: string; city: string | null; bdName: string | null; isActive: boolean }) {
  return { id: user.id, username: user.username, role: user.role, city: user.city, bdName: user.bdName, isActive: user.isActive };
}

export async function GET() {
  const access = await requireSuperAdministrator();
  if (access.response) return access.response;
  const prisma = await getPrisma();
  const users = await prisma.appUser.findMany({
    select: { id: true, username: true, role: true, city: true, bdName: true, isActive: true },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });
  return NextResponse.json({ users: users.map(safeUser) });
}

export async function POST(request: Request) {
  const access = await requireSuperAdministrator();
  if (access.response) return access.response;

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

export async function PATCH(request: Request) {
  const access = await requireSuperAdministrator();
  if (access.response) return access.response;
  const parsed = updateUserInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "账号更新信息无效" }, { status: 400 });
  if (parsed.data.id === access.actor!.id && parsed.data.isActive === false) {
    return NextResponse.json({ error: "不能停用当前登录账号" }, { status: 400 });
  }
  const data: { passwordHash?: string; isActive?: boolean } = {};
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  try {
    const prisma = await getPrisma();
    const user = await prisma.appUser.update({ where: { id: parsed.data.id }, data });
    return NextResponse.json({ user: safeUser(user) });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    throw error;
  }
}
