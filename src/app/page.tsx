"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type PlatformSummary = { orderCount: number; averageUserPaidAmount: number };
type Overview = {
  collection: { uploadImageCount: number; recognizedImageCount: number; confirmedImageCount: number; failedImageCount: number; pairedCollectionCount: number; incompleteCollectionCount: number };
  orders: { confirmedOrderCount: number; platforms: Record<"MEITUAN" | "B_JIA", PlatformSummary>; merchantRanking: Array<{ merchantId: string; merchantName: string; userPaidDifference: number }>; citySummary: Array<{ label: string; confirmedOrderCount: number; userPaidDifference: number }> };
};
const empty: Overview = { collection: { uploadImageCount: 0, recognizedImageCount: 0, confirmedImageCount: 0, failedImageCount: 0, pairedCollectionCount: 0, incompleteCollectionCount: 0 }, orders: { confirmedOrderCount: 0, platforms: { MEITUAN: { orderCount: 0, averageUserPaidAmount: 0 }, B_JIA: { orderCount: 0, averageUserPaidAmount: 0 } }, merchantRanking: [], citySummary: [] } };
const money = (value: number) => `¥${Math.abs(value).toFixed(2)}`;

export default function Home() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => { fetch("/api/analytics").then((response) => response.ok ? response.json() : empty).then(setData).catch(() => setData(empty)); }, []);
  const overview = data ?? empty;
  const score = useMemo(() => {
    const total = overview.collection.uploadImageCount;
    if (!total) return 0;
    return Math.round(Math.min(100, overview.collection.recognizedImageCount / total * 55 + overview.collection.confirmedImageCount / total * 45));
  }, [overview]);
  const topMerchants = overview.orders.merchantRanking.filter((item) => item.userPaidDifference > 0).slice(0, 2);
  return <main className="operations-home workspace-home">
    <header className="home-hero">
      <div><h1>{overview.collection.uploadImageCount ? "今天，先处理三件重要的事。" : "从第一组商家订单开始。"}</h1><p>{overview.collection.uploadImageCount ? "基于已确认的双平台订单，为你整理采集进度、价差和需要关注的商家。" : "上传同一商家的美团与 B 家订单截图，确认识别结果后，竞争定价数据会在这里出现。"}</p></div>
      <div className="score-orbit" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}><strong>{score}</strong><span>采集健康度</span><small>{overview.collection.uploadImageCount ? `已确认 ${overview.collection.confirmedImageCount} 张` : "等待采集"}</small></div>
    </header>
    <section className="home-actions" aria-label="快速操作">
      <Link href="/dashboard"><i className="action-icon merchants">◌</i><span><b>查看重点商家</b><small>定位存在价格差异的商家</small></span><em>→</em></Link>
      <Link href="/health"><i className="action-icon progress">↗</i><span><b>查看采集进度</b><small>跟进识别、确认和成对完成情况</small></span><em>→</em></Link>
      <Link href="/upload"><i className="action-icon upload">↑</i><span><b>上传订单截图</b><small>开始一组美团与 B 家采集</small></span><em>→</em></Link>
    </section>
    <section className="home-core-grid">
      <article className="home-health"><div className="section-title"><h2>采集信号</h2><span>实时</span></div><div className="health-body"><div className="mini-orbit"><strong>{score}</strong><small>完成度</small></div><div className="signal-bars"><Signal label="识别成功" value={overview.collection.recognizedImageCount} total={overview.collection.uploadImageCount} /><Signal label="人工确认" value={overview.collection.confirmedImageCount} total={overview.collection.uploadImageCount} /><Signal label="成对采集" value={overview.collection.pairedCollectionCount} total={Math.max(overview.collection.pairedCollectionCount + overview.collection.incompleteCollectionCount, 1)} /></div></div></article>
      <article className="home-alerts"><div className="section-title"><h2>异常预警</h2><span>{topMerchants.length || overview.collection.failedImageCount}</span></div>{topMerchants.length ? topMerchants.map((item) => <Link className="alert-row" href={`/dashboard?merchantId=${encodeURIComponent(item.merchantId)}`} key={item.merchantId}><i>!</i><div><b>{item.merchantName}</b><small>美团用户实付高于 B 家 {money(item.userPaidDifference)}</small></div><em>›</em></Link>) : <div className="alert-empty"><b>{overview.collection.failedImageCount ? "存在识别失败待处理" : "暂无可确认的价格异常"}</b><small>{overview.collection.failedImageCount ? `有 ${overview.collection.failedImageCount} 张图片需要重新识别或上传。` : "完成双平台订单确认后，系统会显示同商家价差。"}</small></div>}</article>
    </section>
    <section className="home-metrics"><Metric label="上传图片" value={overview.collection.uploadImageCount} detail="美团与 B 家截图" /><Metric label="有效识别" value={overview.collection.recognizedImageCount} detail="千问结构化成功" /><Metric label="已确认订单" value={overview.collection.confirmedImageCount} detail="已写入竞对数据" /><Metric label="成对采集" value={overview.collection.pairedCollectionCount} detail="可用于平台对比" /></section>
    <section className="city-signal-section"><div className="section-title"><h2>重点城市</h2><Link href="/dashboard">查看洞察 →</Link></div><div className="city-signal-grid">{overview.orders.citySummary.length ? overview.orders.citySummary.slice(0, 6).map((city) => <article key={city.label}><b>{city.label}</b><span>已确认 {city.confirmedOrderCount} 笔</span><strong className={city.userPaidDifference > 0 ? "is-risk" : ""}>{city.userPaidDifference > 0 ? `价差 ${money(city.userPaidDifference)}` : "价格稳定"}</strong><i><u style={{ width: `${Math.min(100, city.confirmedOrderCount * 12)}%` }} /></i></article>) : <div className="city-empty">暂无确认数据。完成任一商家的双平台确认后，城市信号将自动生成。</div>}</div></section>
  </main>;
}

function Signal({ label, value, total }: { label: string; value: number; total: number }) { const percent = total ? Math.round(value / total * 100) : 0; return <div><span><b>{label}</b><small>{value} / {total}</small></span><i><u style={{ width: `${percent}%` }} /></i></div>; }
function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
