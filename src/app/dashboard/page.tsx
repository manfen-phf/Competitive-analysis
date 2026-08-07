"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Platform = "MEITUAN" | "B_JIA";
type PlatformData = { validOrderCount: number; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
type Ranking = { merchantId: string; merchantName: string; meituanUserPaid: number; bJiaUserPaid: number; userPaidDifference: number };
const metricDefinitions = [{ key: "dishPrice", label: "菜品原价", rate: false }, { key: "packagingFee", label: "餐盒费", rate: false }, { key: "platformRedPacket", label: "券抵扣", rate: false }, { key: "originalDeliveryFee", label: "原价配送费", rate: false }, { key: "deliveryFeeReduction", label: "减配送费", rate: false }, { key: "paidDeliveryFee", label: "实付配送费", rate: false }, { key: "merchantSettlementAmount", label: "商家结算金额", rate: false }, { key: "userPaidAmount", label: "用户实付", rate: false }, { key: "otherPromotion", label: "其他活动", rate: false }, { key: "technicalServiceFee", label: "技术服务费", rate: false }, { key: "deliveryServiceFee", label: "配送服务费", rate: false }, { key: "merchantRate", label: "商家费率", rate: true }] as const;
type MetricKey = typeof metricDefinitions[number]["key"];
type Metrics = Record<MetricKey, number>;
type Trend = { label: string; platforms: Record<Platform, PlatformData>; userPaidDifference: number };
type PriceBand = { label: string; platforms: Record<Platform, { validOrderCount:number; userPaidAmount:number }> };
type Data = { platforms: Record<Platform, PlatformData>; userPaidDifference: number; merchantRanking: Ranking[]; trend: Trend[]; metrics: Record<Platform, Metrics>; priceBands: PriceBand[]; bdSummary: any[]; citySummary: any[] };
type Merchant = { merchantId: string; merchantName: string; bdName: string };

const blank: PlatformData = { validOrderCount: 0, userPaidAmount: 0, platformRedPacket: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0 };
const zeroMetrics = Object.fromEntries(metricDefinitions.map((item) => [item.key, 0])) as Metrics;
const empty: Data = { platforms: { MEITUAN: blank, B_JIA: blank }, userPaidDifference: 0, merchantRanking: [], trend: [], metrics: { MEITUAN: zeroMetrics, B_JIA: zeroMetrics }, priceBands: [], bdSummary: [], citySummary: [] };
const money = (value: number) => `¥${value.toFixed(2)}`;

export default function Dashboard() {
  const [cities, setCities] = useState<string[]>([]);
  const [bds, setBds] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [city, setCity] = useState("");
  const [bd, setBd] = useState("");
  const [query, setQuery] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [period, setPeriod] = useState("DAY");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<Data>(empty);

  useEffect(() => { fetch("/api/filter-options").then((r) => r.json()).then((x) => setCities(x.values ?? [])); }, []);
  useEffect(() => {
    if (!city) { setBds([]); setMerchants([]); return; }
    fetch(`/api/filter-options?city=${encodeURIComponent(city)}`).then((r) => r.json()).then((x) => setBds(x.values ?? []));
  }, [city]);
  useEffect(() => {
    if (!city) return;
    fetch(`/api/merchants?city=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}`).then((r) => r.json()).then((x) => setMerchants(x.merchants ?? []));
  }, [city, query]);

  const search = useMemo(() => new URLSearchParams(Object.entries({ city, bd, merchantId, start, end, period }).filter(([, value]) => value)), [city, bd, merchantId, start, end, period]);
  useEffect(() => { fetch(`/api/analytics?${search}`).then((r) => r.ok ? r.json() : empty).then(setData).catch(() => setData(empty)); }, [search]);

  const card = (name: Platform, label: string) => <article><h3>{label}</h3><strong>{money(data.platforms[name].userPaidAmount)}</strong><p>用户实付（每单平均）</p><dl><div><dt>平台红包</dt><dd>{money(data.platforms[name].platformRedPacket)}</dd></div><div><dt>实付配送费</dt><dd>{money(data.platforms[name].paidDeliveryFee)}</dd></div><div><dt>商家结算</dt><dd>{money(data.platforms[name].merchantSettlementAmount)}</dd></div><div><dt>有效订单</dt><dd>{data.platforms[name].validOrderCount}</dd></div></dl></article>;

  return <main>
    <header><h1>竞争价格力看板</h1><nav><Link href="/">首页</Link><Link href="/upload">上传截图</Link><Link href="/admin/import">主数据导入</Link><Link href="/stat">上传统计</Link></nav></header>
    <p className="muted">所有金额均为有效订单的每单平均值；平台仅展示美团与 B 家。</p>
    <section className="filters dashboard-filters">
      <label>日期粒度<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="DAY">日</option><option value="WEEK">周</option><option value="MONTH">月</option><option value="YEAR">年</option></select></label>
      <label>开始日期<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label>结束日期<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label>城市<select value={city} onChange={(e) => { setCity(e.target.value); setBd(""); setMerchantId(""); }}><option value="">全部城市</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>BD<select value={bd} onChange={(e) => setBd(e.target.value)} disabled={!city}><option value="">全部 BD</option>{bds.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>商家搜索<input value={query} placeholder="ID 或名称" onChange={(e) => setQuery(e.target.value)} disabled={!city} /></label>
      <label>商家<select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} disabled={!city}><option value="">全部商家</option>{merchants.map((item) => <option key={item.merchantId} value={item.merchantId}>{item.merchantName}（{item.merchantId}）</option>)}</select></label>
    </section>
    {period === "WEEK" && <p className="hint">自然周规则：当年 1 月 1 日至首个周日为 W1，随后每周一至周日依次编号。</p>}
    <section className="grid">{card("MEITUAN", "美团")}{card("B_JIA", "B 家")}<article><h3>用户实付差异</h3><strong>{money(data.userPaidDifference)}</strong><p>美团 − B 家；正数表示美团平均用户实付更高。</p></article></section>
    <section className="metric-section"><h2>全指标平台对比</h2><p className="muted">金额均为每单平均；商家费率为平均费率。</p><div className="metric-grid">{metricDefinitions.map((metric) => <article key={metric.key}><h3>{metric.label}/单</h3><dl><div><dt>美团</dt><dd>{metric.rate ? `${(data.metrics.MEITUAN[metric.key] * 100).toFixed(1)}%` : money(data.metrics.MEITUAN[metric.key])}</dd></div><div><dt>B 家</dt><dd>{metric.rate ? `${(data.metrics.B_JIA[metric.key] * 100).toFixed(1)}%` : money(data.metrics.B_JIA[metric.key])}</dd></div></dl><p>美团 − B 家：{metric.rate ? `${((data.metrics.MEITUAN[metric.key] - data.metrics.B_JIA[metric.key]) * 100).toFixed(1)} 个百分点` : money(data.metrics.MEITUAN[metric.key] - data.metrics.B_JIA[metric.key])}</p></article>)}</div></section>
    <section className="ranking"><h2>不同价位段竞争力</h2><p className="muted">按菜品原价分段，对比两平台用户实付与订单量。</p><div className="band-grid">{data.priceBands.map((band) => <article key={band.label}><h3>{band.label}</h3><p>订单：美团 {band.platforms.MEITUAN.validOrderCount}｜B 家 {band.platforms.B_JIA.validOrderCount}</p><dl><div><dt>美团用户实付</dt><dd>{money(band.platforms.MEITUAN.userPaidAmount)}</dd></div><div><dt>B 家用户实付</dt><dd>{money(band.platforms.B_JIA.userPaidAmount)}</dd></div></dl></article>)}</div></section>
    <section className="ranking"><h2>竞争价格力趋势</h2><p className="muted">根据所选日、周、月或年分组，展示两平台用户实付的平均值。</p>{data.trend.length ? <table><thead><tr><th>周期</th><th>美团用户实付</th><th>B 家用户实付</th><th>差异</th><th>有效订单</th></tr></thead><tbody>{data.trend.map((item) => <tr key={item.label}><td>{item.label}</td><td>{money(item.platforms.MEITUAN.userPaidAmount)}</td><td>{money(item.platforms.B_JIA.userPaidAmount)}</td><td>{money(item.userPaidDifference)}</td><td>{item.platforms.MEITUAN.validOrderCount + item.platforms.B_JIA.validOrderCount}</td></tr>)}</tbody></table> : <p className="empty-state">暂无符合筛选条件的趋势数据</p>}</section>
    <section className="ranking"><h2>BD 维度数据呈现</h2><table><thead><tr><th>BD</th><th>上传数</th><th>美团实付</th><th>B家实付</th><th>券差异</th><th>配送费差异</th></tr></thead><tbody>{data.bdSummary.map((r:any)=><tr key={r.label}><td>{r.label}</td><td>{r.platforms.MEITUAN.validOrderCount+r.platforms.B_JIA.validOrderCount}</td><td>{money(r.platforms.MEITUAN.userPaidAmount)}</td><td>{money(r.platforms.B_JIA.userPaidAmount)}</td><td>{money(r.platforms.MEITUAN.platformRedPacket-r.platforms.B_JIA.platformRedPacket)}</td><td>{money(r.platforms.MEITUAN.paidDeliveryFee-r.platforms.B_JIA.paidDeliveryFee)}</td></tr>)}</tbody></table></section><section className="ranking"><h2>城市维度数据呈现</h2><table><thead><tr><th>城市</th><th>上传数</th><th>美团实付</th><th>B家实付</th><th>券差异</th><th>配送费差异</th></tr></thead><tbody>{data.citySummary.map((r:any)=><tr key={r.label}><td>{r.label}</td><td>{r.platforms.MEITUAN.validOrderCount+r.platforms.B_JIA.validOrderCount}</td><td>{money(r.platforms.MEITUAN.userPaidAmount)}</td><td>{money(r.platforms.B_JIA.userPaidAmount)}</td><td>{money(r.platforms.MEITUAN.platformRedPacket-r.platforms.B_JIA.platformRedPacket)}</td><td>{money(r.platforms.MEITUAN.paidDeliveryFee-r.platforms.B_JIA.paidDeliveryFee)}</td></tr>)}</tbody></table></section>    <section className="ranking"><h2>商家价格差异排名</h2><p className="muted">仅统计同时具备美团和 B 家有效订单的商家，按用户实付差异从高到低排列。</p>{data.merchantRanking.length ? <table><thead><tr><th>排名</th><th>商家</th><th>商家 ID</th><th>美团用户实付</th><th>B 家用户实付</th><th>差异</th></tr></thead><tbody>{data.merchantRanking.map((item, index) => <tr key={item.merchantId}><td>{index + 1}</td><td>{item.merchantName}</td><td>{item.merchantId}</td><td>{money(item.meituanUserPaid)}</td><td>{money(item.bJiaUserPaid)}</td><td>{money(item.userPaidDifference)}</td></tr>)}</tbody></table> : <p className="empty-state">暂无可比商家数据</p>}</section>
  </main>;
}