"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Platform = "MEITUAN" | "B_JIA";
type PlatformSummary = { orderCount: number; averageUserPaidAmount: number; averageMerchantSettlementAmount: number; averageMerchantRate: number; averageGoodsTotal: number; averageOtherActivityAmount: number };
type Overview = { collection: { uploadImageCount: number; confirmedImageCount: number; pairedCollectionCount: number }; orders: { confirmedOrderCount: number; platforms: Record<Platform, PlatformSummary>; merchantRanking: Array<{ merchantId: string; merchantName: string; cityName: string; bdName: string; userPaidDifference: number; meituanUserPaid: number; bJiaUserPaid: number }>; citySummary: Array<{ label: string; confirmedOrderCount: number; userPaidDifference: number }> } };
type Options = { cities: string[]; bds: string[]; merchants: Array<{ merchantId: string; merchantName: string; cityName: string; bdName: string }> };
const platformZero: PlatformSummary = { orderCount: 0, averageUserPaidAmount: 0, averageMerchantSettlementAmount: 0, averageMerchantRate: 0, averageGoodsTotal: 0, averageOtherActivityAmount: 0 };
const empty: Overview = { collection: { uploadImageCount: 0, confirmedImageCount: 0, pairedCollectionCount: 0 }, orders: { confirmedOrderCount: 0, platforms: { MEITUAN: platformZero, B_JIA: platformZero }, merchantRanking: [], citySummary: [] } };
const currency = (value: number) => `¥${Math.abs(value).toFixed(2)}`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function Dashboard() {
  const [options, setOptions] = useState<Options>({ cities: [], bds: [], merchants: [] });
  const [city, setCity] = useState("");
  const [bd, setBd] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/filter-options").then((response) => response.ok ? response.json() : { cities: [], bds: [], merchants: [] }).then(setOptions).catch(() => undefined); }, []);
  const search = useMemo(() => new URLSearchParams(Object.entries({ city, bd, merchantId }).filter(([, value]) => value)), [city, bd, merchantId]);
  useEffect(() => { setLoading(true); fetch(`/api/analytics?${search}`).then((response) => response.ok ? response.json() : empty).then(setData).catch(() => setData(empty)).finally(() => setLoading(false)); }, [search]);
  const overview = data ?? empty;
  const meituan = overview.orders.platforms.MEITUAN;
  const bJia = overview.orders.platforms.B_JIA;
  const gap = meituan.averageUserPaidAmount - bJia.averageUserPaidAmount;
  const visibleMerchants = options.merchants.filter((merchant) => (!city || merchant.cityName === city) && (!bd || merchant.bdName === bd));

  return <main className="insight-canvas management-page">
    <header className="management-heading"><div><p>价格洞察</p><h1>竞争定价分析</h1><span>仅基于已由 BD 确认的美团与 B 家订单数据计算。</span></div><Link className="primary compact" href="/upload">补充订单证据</Link></header>
    <section className="management-filters" aria-label="数据筛选"><label>城市<select value={city} onChange={(event) => { setCity(event.target.value); setMerchantId(""); }}><option value="">全部城市</option>{options.cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>BD<select value={bd} onChange={(event) => { setBd(event.target.value); setMerchantId(""); }}><option value="">全部 BD</option>{options.bds.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>商家<select value={merchantId} onChange={(event) => setMerchantId(event.target.value)}><option value="">全部商家</option>{visibleMerchants.map((item) => <option key={item.merchantId} value={item.merchantId}>{item.merchantName}</option>)}</select></label><button className="secondary" type="button" onClick={() => { setCity(""); setBd(""); setMerchantId(""); }}>重置筛选</button></section>
    <section className="insight-brief"><div><p>当前价格判断</p><h2>{overview.orders.confirmedOrderCount ? (gap > 0 ? "美团平均用户实付更高" : gap < 0 ? "B 家平均用户实付更高" : "两平台用户实付持平") : "等待已确认订单数据"}</h2><span>{overview.orders.confirmedOrderCount ? "以每单平均用户实付作为基础对比口径。" : "完成至少一组双平台订单确认后，这里会自动出现真实对比。"}</span></div><strong className={gap > 0 ? "positive" : gap < 0 ? "negative" : ""}>{overview.orders.confirmedOrderCount ? `${gap > 0 ? "+" : gap < 0 ? "−" : ""}${currency(gap)}` : "—"}</strong></section>
    <section className="comparison-grid"><PlatformCard name="美团" tint="meituan" value={meituan} /><PlatformCard name="B家" tint="bjia" value={bJia} /></section>
    <section className="dashboard-lower-grid"><article className="analysis-panel"><div className="section-title"><h2>商家价格差异</h2><span>{overview.orders.merchantRanking.length} 个可对比商家</span></div>{overview.orders.merchantRanking.length ? <div className="analysis-list">{overview.orders.merchantRanking.slice(0, 8).map((item) => <Link href={`/dashboard?merchantId=${encodeURIComponent(item.merchantId)}`} key={item.merchantId}><div><b>{item.merchantName}</b><small>{item.cityName} · {item.bdName}</small></div><span>美团 {currency(item.meituanUserPaid)} · B家 {currency(item.bJiaUserPaid)}</span><strong className={item.userPaidDifference > 0 ? "positive" : item.userPaidDifference < 0 ? "negative" : ""}>{item.userPaidDifference > 0 ? "+" : item.userPaidDifference < 0 ? "−" : ""}{currency(item.userPaidDifference)}</strong></Link>)}</div> : <Empty copy="暂无可对比商家。需要同一商家的美团与 B 家订单均完成确认。" />}</article><article className="analysis-panel"><div className="section-title"><h2>城市信号</h2><Link href="/health">采集健康度 →</Link></div>{overview.orders.citySummary.length ? <div className="city-analysis-list">{overview.orders.citySummary.map((item) => <div key={item.label}><span><b>{item.label}</b><small>{item.confirmedOrderCount} 笔已确认</small></span><strong className={item.userPaidDifference > 0 ? "positive" : item.userPaidDifference < 0 ? "negative" : ""}>{item.userPaidDifference === 0 ? "稳定" : `${item.userPaidDifference > 0 ? "+" : "−"}${currency(item.userPaidDifference)}`}</strong></div>)}</div> : <Empty copy="当前筛选范围内尚无城市级已确认订单。" />}</article></section>
    {loading ? <p className="data-loading">正在更新实时数据…</p> : null}
  </main>;
}

function PlatformCard({ name, tint, value }: { name: string; tint: string; value: PlatformSummary }) { return <article className={`platform-card ${tint}`}><div><p>{name}</p><span>{value.orderCount} 笔已确认订单</span></div><strong>{currency(value.averageUserPaidAmount)}</strong><small>平均用户实付</small><dl><div><dt>平均商品总价</dt><dd>{currency(value.averageGoodsTotal)}</dd></div><div><dt>平均商家结算</dt><dd>{currency(value.averageMerchantSettlementAmount)}</dd></div><div><dt>平均实际费率</dt><dd>{percent(value.averageMerchantRate)}</dd></div><div><dt>平均其他活动</dt><dd>{currency(value.averageOtherActivityAmount)}</dd></div></dl></article>; }
function Empty({ copy }: { copy: string }) { return <div className="analysis-empty">{copy}</div>; }
