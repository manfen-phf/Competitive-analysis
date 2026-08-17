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
      <div><p className="eyebrow">{"\u6982\u89c8"}</p><h1>{"\u4eca\u65e5\u91c7\u96c6\u6982\u89c8"}</h1><p>{overview.collection.uploadImageCount ? "\u67e5\u770b\u4e0a\u4f20\u3001\u8bc6\u522b\u548c\u786e\u8ba4\u7684\u771f\u5b9e\u8fdb\u5ea6\uff0c\u4ece\u7b49\u5f85\u5904\u7406\u7684\u56fe\u7247\u5f00\u59cb\u3002" : "\u9009\u62e9\u4e00\u5bb6\u5546\u5bb6\uff0c\u4e0a\u4f20\u7f8e\u56e2\u4e0e B \u5bb6\u622a\u56fe\uff0c\u786e\u8ba4\u8bc6\u522b\u540e\u5373\u53ef\u8fdb\u5165\u5bf9\u6bd4\u5206\u6790\u3002"}</p></div>
      <div className="score-orbit" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}><strong>{score}</strong><span>采集健康度</span><small>{overview.collection.uploadImageCount ? `已确认 ${overview.collection.confirmedImageCount} 张` : "等待采集"}</small></div>
    </header>
    <section className="home-actions" aria-label="快速操作">
      <Link href="/collect"><i className="action-icon upload">↑</i><span><b>{"\u5f00\u59cb\u91c7\u96c6"}</b><small>{"\u9009\u62e9\u5546\u5bb6\uff0c\u4e0a\u4f20\u53cc\u5e73\u53f0\u8ba2\u5355\u622a\u56fe"}</small></span><em>→</em></Link>
      <Link href="/records"><i className="action-icon progress">↗</i><span><b>{"\u5f85\u786e\u8ba4\u8bc6\u522b"}</b><small>{"\u590d\u6838 AI \u7ed3\u679c\uff0c\u5b8c\u6210\u5165\u5e93"}</small></span><em>→</em></Link>
      <Link href="/dashboard"><i className="action-icon merchants">◌</i><span><b>{"\u67e5\u770b\u4ef7\u683c\u5206\u6790"}</b><small>{"\u6839\u636e\u5df2\u786e\u8ba4\u6570\u636e\u67e5\u770b\u7ade\u5bf9\u5dee\u5f02"}</small></span><em>→</em></Link>
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
