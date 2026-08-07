"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecordItem = { id: string; uploadedAt: string; status: "SUCCESS" | "FAILED"; reason: string | null; imageUrl: string; orderNumber: string | null; platform: string | null; merchantId: string | null; merchantName: string | null; city: string | null; bdName: string | null; userPaidAmount: number | null; merchantSettlementAmount: number | null; platformRedPacket: number | null; paidDeliveryFee: number | null };
const money = (value: number | null) => value == null ? "-" : `¥${value.toFixed(2)}`;

export default function Records() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => { fetch("/api/records").then((r) => r.json()).then((data) => setRecords(data.records ?? [])); }, []);
  return <main>
    <header><h1>上传记录</h1><nav><Link href="/">首页</Link><Link href="/upload">上传截图</Link><Link href="/dashboard">数据看板</Link></nav></header>
    <p className="muted">最近 50 条截图记录。点击“查看明细”可回查原截图和核心识别结果。</p>
    <section className="ranking"><table><thead><tr><th>上传时间</th><th>状态</th><th>平台</th><th>城市</th><th>商家 / BD</th><th>用户实付</th><th>操作</th></tr></thead><tbody>{records.map((item) => <><tr key={item.id}><td>{new Date(item.uploadedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</td><td>{item.status === "SUCCESS" ? "识别成功" : "识别失败"}</td><td>{item.platform === "MEITUAN" ? "美团" : item.platform === "B_JIA" ? "B 家" : "-"}</td><td>{item.city ?? "-"}</td><td>{item.merchantName ? `${item.merchantName} / ${item.bdName}` : "-"}</td><td>{money(item.userPaidAmount)}</td><td><button className="secondary" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>{expanded === item.id ? "收起" : "查看明细"}</button></td></tr>{expanded === item.id && <tr key={`${item.id}-detail`}><td colSpan={7}><div className="record-detail"><img src={item.imageUrl} alt="订单截图" /><div>{item.status === "SUCCESS" ? <dl><div><dt>订单号</dt><dd>{item.orderNumber}</dd></div><div><dt>商家 ID</dt><dd>{item.merchantId}</dd></div><div><dt>平台红包</dt><dd>{money(item.platformRedPacket)}</dd></div><div><dt>实付配送费</dt><dd>{money(item.paidDeliveryFee)}</dd></div><div><dt>商家结算</dt><dd>{money(item.merchantSettlementAmount)}</dd></div></dl> : <p className="empty-state">失败原因：{item.reason}</p>}</div></div></td></tr>}</>)}</tbody></table>{!records.length && <p className="empty-state">暂无上传记录</p>}</section>
  </main>;
}