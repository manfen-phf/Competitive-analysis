export type WorkspaceRole = "OPERATOR" | "MANAGER" | "HQ";
export type AnalyticsPlatform = { validOrderCount: number; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
export type AnalyticsInput = {
  platforms: Record<"MEITUAN" | "B_JIA", AnalyticsPlatform>;
  userPaidDifference: number;
  merchantRanking: Array<{ merchantId: string; merchantName: string; meituanUserPaid: number; bJiaUserPaid: number; userPaidDifference: number }>;
};
export type OperationsOverview = {
  healthScore: number | null;
  brief: { tone: "neutral" | "positive" | "warning"; title: string; detail: string };
  actions: Array<{ id: "upload-order" | "review-anomalies" | "review-city-signal"; label: string; href: string }>;
  signals: Array<{ id: string; label: string; value: string; detail: string; tone: "neutral" | "positive" | "warning" }>;
  anomalies: Array<{ merchantId: string; merchantName: string; difference: number }>;
  cityStatus: { state: "empty" | "ready"; detail: string };
};

const copy = {
  emptyTitle: "\u6682\u65e0\u53ef\u7528\u8fd0\u8425\u4fe1\u53f7",
  emptyDetail: "\u5b8c\u6210\u4e24\u4e2a\u5e73\u53f0\u7684\u6709\u6548\u8ba2\u5355\u4e0a\u4f20\u540e\uff0c\u7cfb\u7edf\u4f1a\u751f\u6210\u7ade\u4e89\u4ef7\u683c\u529b\u6d1e\u5bdf\u3002",
  warningTitle: "\u4eca\u65e5\u4ef7\u683c\u529b\u5b58\u5728\u5f85\u5904\u7406\u5dee\u5f02",
  positiveTitle: "\u4eca\u65e5\u7ade\u4e89\u4ef7\u683c\u529b\u4fdd\u6301\u7a33\u5b9a",
};

function money(value: number) { return `\u00a5${Math.abs(value).toFixed(2)}`; }
function action(id: OperationsOverview["actions"][number]["id"]): OperationsOverview["actions"][number] {
  const actions = {
    "upload-order": { label: "\u4e0a\u4f20\u8ba2\u5355\u622a\u56fe", href: "/upload" },
    "review-anomalies": { label: "\u67e5\u770b\u91cd\u70b9\u5546\u5bb6", href: "/dashboard" },
    "review-city-signal": { label: "\u67e5\u770b\u57ce\u5e02\u4fe1\u53f7", href: "/dashboard" },
  } as const;
  return { id, ...actions[id] };
}

export function toOperationsOverview(data: AnalyticsInput, role: WorkspaceRole): OperationsOverview {
  const meituan = data.platforms.MEITUAN;
  const bJia = data.platforms.B_JIA;
  const totalOrders = meituan.validOrderCount + bJia.validOrderCount;
  const hasComparableOrders = meituan.validOrderCount > 0 && bJia.validOrderCount > 0;
  if (!hasComparableOrders) return {
    healthScore: null,
    brief: { tone: "neutral", title: copy.emptyTitle, detail: copy.emptyDetail },
    actions: [action("upload-order"), action("review-anomalies"), action("review-city-signal")],
    signals: [], anomalies: [], cityStatus: { state: "empty", detail: copy.emptyDetail },
  };

  const adverseDifference = Math.max(data.userPaidDifference, 0);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - adverseDifference * 4 - (totalOrders < 6 ? 10 : 0))));
  const tone = adverseDifference > 0 ? "warning" : "positive";
  const actions = role === "OPERATOR" ? [action("upload-order"), action("review-anomalies"), action("review-city-signal")] : role === "HQ" ? [action("review-city-signal"), action("review-anomalies"), action("upload-order")] : [action("review-anomalies"), action("review-city-signal"), action("upload-order")];
  const rankedAnomalies = data.merchantRanking.filter((merchant) => merchant.userPaidDifference > 0).slice(0, 3).map((merchant) => ({ merchantId: merchant.merchantId, merchantName: merchant.merchantName, difference: merchant.userPaidDifference }));

  return {
    healthScore,
    brief: {
      tone,
      title: tone === "warning" ? copy.warningTitle : copy.positiveTitle,
      detail: tone === "warning" ? `\u7f8e\u56e2\u5e73\u5747\u7528\u6237\u5b9e\u4ed8\u9ad8\u4e8e B\u5bb6 ${money(adverseDifference)}\uff0c\u5efa\u8bae\u4f18\u5148\u5904\u7406\u5dee\u5f02\u6700\u9ad8\u7684\u5546\u5bb6\u3002` : "\u5f53\u524d\u5df2\u6709\u53ef\u6bd4\u8ba2\u5355\u6570\u636e\uff0c\u53ef\u7ee7\u7eed\u5173\u6ce8\u914d\u9001\u8d39\u4e0e\u7ea2\u5305\u7684\u53d8\u5316\u3002",
    },
    actions,
    signals: [
      { id: "user-paid", label: "\u7528\u6237\u5b9e\u4ed8\u5dee\u5f02", value: money(data.userPaidDifference), detail: "\u7f8e\u56e2 - B\u5bb6\uff0c\u6bcf\u5355\u5e73\u5747", tone },
      { id: "order-coverage", label: "\u6709\u6548\u8ba2\u5355\u8986\u76d6", value: String(totalOrders), detail: "\u5df2\u7528\u4e8e\u5e73\u53f0\u6bd4\u8f83\u7684\u6709\u6548\u8ba2\u5355", tone: totalOrders < 6 ? "warning" : "neutral" },
      { id: "delivery-fee", label: "\u914d\u9001\u8d39\u5dee\u5f02", value: money(meituan.paidDeliveryFee - bJia.paidDeliveryFee), detail: "\u5b9e\u4ed8\u914d\u9001\u8d39\uff0c\u6bcf\u5355\u5e73\u5747", tone: "neutral" },
    ],
    anomalies: rankedAnomalies,
    cityStatus: { state: "ready", detail: `\u5df2\u5206\u6790 ${totalOrders} \u7b14\u53ef\u6bd4\u8ba2\u5355\uff0c\u672a\u865a\u6784\u57ce\u5e02\u6216 BD \u5f52\u5c5e\u3002` },
  };
}