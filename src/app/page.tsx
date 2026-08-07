"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toOperationsOverview, type AnalyticsInput, type OperationsOverview } from "@/lib/operations-view-model";

const emptyAnalytics: AnalyticsInput = { platforms: { MEITUAN: { validOrderCount: 0, userPaidAmount: 0, platformRedPacket: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0 }, B_JIA: { validOrderCount: 0, userPaidAmount: 0, platformRedPacket: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0 } }, userPaidDifference: 0, merchantRanking: [] };

export default function Home() {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  useEffect(() => { fetch("/api/analytics").then((response) => response.ok ? response.json() : emptyAnalytics).then((data: AnalyticsInput) => setOverview(toOperationsOverview(data, "OPERATOR"))).catch(() => setOverview(toOperationsOverview(emptyAnalytics, "OPERATOR"))); }, []);
  if (!overview) return <main className="operations-home"><p className="muted">{"\u6b63\u5728\u6574\u7406\u4eca\u65e5\u8fd0\u8425\u4fe1\u53f7\u2026"}</p></main>;
  return <main className="operations-home"><OperationsBrief overview={overview} /></main>;
}

function OperationsBrief({ overview }: { overview: OperationsOverview }) {
  return <><header className="operations-heading"><div><p>{"\u4eca\u65e5\u8fd0\u8425"}</p><h1>{overview.brief.title}</h1><span>{overview.brief.detail}</span></div><div className="health-orbit"><strong>{overview.healthScore ?? "—"}</strong><small>{"\u8fd0\u8425\u5065\u5eb7\u5ea6"}</small></div></header><section className="action-strip">{overview.actions.map((action) => <Link href={action.href} key={action.id}><span>{action.label}</span><b>→</b></Link>)}</section><section className="signal-grid">{overview.signals.map((signal) => <article key={signal.id} data-tone={signal.tone}><p>{signal.label}</p><strong>{signal.value}</strong><span>{signal.detail}</span></article>)}</section><section className="operations-evidence"><div><h2>{"\u5f85\u5904\u7406\u5546\u5bb6"}</h2><p>{overview.cityStatus.detail}</p></div>{overview.anomalies.length ? <div className="anomaly-list">{overview.anomalies.map((item) => <Link href={`/dashboard?merchantId=${encodeURIComponent(item.merchantId)}`} key={item.merchantId}><span>{item.merchantName}</span><strong>{`\u00a5${item.difference.toFixed(2)}`}</strong></Link>)}</div> : <Link className="secondary" href="/upload">{"\u4e0a\u4f20\u9996\u5f20\u5bf9\u6bd4\u8ba2\u5355"}</Link>}</section></>;
}