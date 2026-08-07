import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getPrisma } from "@/lib/db";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

const headers = [
  "订单号", "平台", "城市", "商家ID", "商家名称", "BD名称", "上传时间",
  "菜品原价", "餐盒费", "平台红包", "原价配送费", "减配送费", "实付配送费",
  "商家结算金额", "用户实付", "其他活动", "技术服务费", "配送服务费", "商家费率", "原始识别JSON",
];

export async function POST(request: NextRequest) {
  const passcode = await getRuntimeSecret("ADMIN_IMPORT_PASSCODE");
  const body = await request.json().catch(() => ({}));
  if (!passcode) return NextResponse.json({ error: "服务端未配置管理员口令" }, { status: 503 });
  if (body.passcode !== passcode) return NextResponse.json({ error: "管理员口令错误" }, { status: 401 });

  const prisma = await getPrisma();
  const uploads = await prisma.upload.findMany({
    where: { order: { isNot: null } },
    include: { order: true },
    orderBy: { uploadedAt: "desc" },
  });

  const rows = uploads.flatMap(({ uploadedAt, recognitionJson, order }) => {
    if (!order) return [];
    return [[
      order.orderNumber, order.platform === "B_JIA" ? "B家" : "美团", order.city, order.merchantId,
      order.merchantName, order.bdName, uploadedAt.toISOString(), order.dishPrice, order.packagingFee,
      order.platformRedPacket, order.originalDeliveryFee, order.deliveryFeeReduction, order.paidDeliveryFee,
      order.merchantSettlementAmount, order.userPaidAmount, order.otherPromotion, order.technicalServiceFee,
      order.deliveryServiceFee, order.merchantRate, JSON.stringify(recognitionJson ?? {}),
    ]];
  });

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((header) => ({ wch: header === "原始识别JSON" ? 60 : 15 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "识别订单数据");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=recognized-orders.xlsx",
    },
  });
}