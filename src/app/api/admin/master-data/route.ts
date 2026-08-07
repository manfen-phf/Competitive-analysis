import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getPrisma } from "@/lib/db";
import { parseMasterDataRows } from "@/lib/master-data";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

export async function POST(request: NextRequest) {
  const passcode = await getRuntimeSecret("ADMIN_IMPORT_PASSCODE");
  if (!passcode) return NextResponse.json({ error: "服务端未配置管理员口令，请联系管理员" }, { status: 503 });
  const form = await request.formData();
  if (form.get("passcode") !== passcode) return NextResponse.json({ error: "管理员口令错误" }, { status: 401 });
  if (form.get("verifyOnly") === "true") return NextResponse.json({ valid: true });

  const prisma = await getPrisma();

  const file = form.get("file");
  const effectiveFromText = String(form.get("effectiveFrom") ?? "");
  const defaultEffectiveFrom = effectiveFromText ? new Date(`${effectiveFromText}T00:00:00+08:00`) : new Date();
  if (defaultEffectiveFrom && Number.isNaN(defaultEffectiveFrom.valueOf())) return NextResponse.json({ error: "导入生效开始日无效" }, { status: 400 });
  if (!file || typeof file === "string") return NextResponse.json({ error: "请选择 Excel 文件" }, { status: 400 });

  const book = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]]);
  const result = parseMasterDataRows(rows, defaultEffectiveFrom);
  if (!result.valid) return NextResponse.json(result, { status: 400 });

  const version = await prisma.$transaction(async (tx) => {
    await tx.masterDataVersion.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const created = await tx.masterDataVersion.create({ data: { isActive: true } });
    await tx.merchantAssignment.createMany({ data: result.rows.map((row) => ({ ...row, versionId: created.id })) });
    return created;
  });
  return NextResponse.json({ valid: true, imported: result.rows.length, versionId: version.id });
}
