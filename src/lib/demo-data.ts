import type { ComparableRecord, Platform } from "./analytics";

export const DEMO_CITIES = ["玉林", "南宁", "柳州", "桂林", "梧州", "北海"] as const;

const names = ["禾木轻食", "城南小馆", "桂香米粉", "青藤餐厅", "拾光茶饮", "邻里快餐", "山水烧烤", "一碗好饭", "悦食家", "日常便当"];
const bds = ["林晓", "周宁", "陈璇"];

function amount(value: number) { return Math.round(value * 100) / 100; }

function makeRow(city: string, merchantIndex: number, platform: Platform, date: Date): ComparableRecord {
  const base = 18 + merchantIndex * 1.7 + DEMO_CITIES.indexOf(city as typeof DEMO_CITIES[number]) * 1.3;
  const isB = platform === "B_JIA";
  const dishPrice = amount(base + (isB ? 2.8 : 0));
  const packagingFee = amount(1.5 + (merchantIndex % 3) * 0.5);
  const otherPromotion = amount(isB ? (merchantIndex % 4 === 0 ? 3 : 0) : 0);
  const platformRedPacket = amount((isB ? 3.2 : 2.1) + (merchantIndex % 3) * 0.8);
  const paidDeliveryFee = amount(Math.max(0, 4.5 - (merchantIndex % 4) * 0.8));
  const technicalServiceFee = amount(dishPrice * (isB ? 0.072 : 0.068));
  const deliveryServiceFee = amount(2.4 + (merchantIndex % 5) * 0.55);
  const merchantRate = amount((technicalServiceFee + deliveryServiceFee) / dishPrice);
  const userPaidAmount = amount(dishPrice + packagingFee + paidDeliveryFee - otherPromotion - platformRedPacket);
  const merchantSettlementAmount = amount(userPaidAmount - technicalServiceFee - deliveryServiceFee);
  return {
    platform,
    merchantId: `DEMO-${city}-${String(merchantIndex + 1).padStart(2, "0")}`,
    merchantName: `${names[merchantIndex]} · ${city}`,
    city,
    bdName: bds[(merchantIndex + DEMO_CITIES.indexOf(city as typeof DEMO_CITIES[number])) % bds.length],
    uploadedAt: date,
    userPaidAmount,
    platformRedPacket,
    paidDeliveryFee,
    merchantSettlementAmount,
    dishPrice,
    packagingFee,
    otherPromotion,
    technicalServiceFee,
    deliveryServiceFee,
    merchantRate,
  };
}

const baseDate = new Date("2026-08-20T10:00:00");
export const DEMO_RECORDS: ComparableRecord[] = DEMO_CITIES.flatMap((city, cityIndex) => Array.from({ length: 10 }, (_, merchantIndex) => {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() - ((cityIndex * 3 + merchantIndex * 2) % 31));
  return [makeRow(city, merchantIndex, "MEITUAN", date), makeRow(city, merchantIndex, "B_JIA", date)];
})).flat();

export const DEMO_BDS = [...new Set(DEMO_RECORDS.map((row) => row.bdName))];
