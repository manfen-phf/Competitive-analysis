"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlatformData = { validOrderCount: number; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
type Ranking = { merchantId: string; merchantName: string; meituanUserPaid: number; bJiaUserPaid: number; userPaidDifference: number };
type Data = { platforms: Record<"MEITUAN" | "B_JIA", PlatformData>; userPaidDifference: number; merchantRanking: Ranking[] };
type Merchant = { merchantId: string; merchantName: string; bdName: string };
const blank: PlatformData = { validOrderCount: 0, userPaidAmount: 0, platformRedPacket: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0 };
const empty: Data = { platforms: { MEITUAN: blank, B_JIA: blank }, userPaidDifference: 0, merchantRanking: [] };
const money = (value: number) => `¥${value.toFixed(2)}`;

export default function Dashboard() {
  const [cities, setCities] = useState<string[]>([]); const [bds, setBds] = useState<string[]>([]); const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [city, setCity] = useState(""); const [bd, setBd] = useState(""); const [query, setQuery] = useState(""); const [merchantId, setMerchantId] = useState("");
  const [period, setPeriod] = useState("DAY"); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [data, setData] = useState<Data>(empty);
  useEffect(() => { fetch("/api/filter-options").then((r) => r.json()).then((x) => setCities(x.values ?? [])); }, []);
  useEffect(() => { if (!city) { setBds([]); setMerchants([]); return; } fetch(`/api/filter-options?city=${encodeURIComponent(city)}`).then((r) => r.json()).then((x) => setBds(x.values ?? [])); }, [city]);
  useEffect(() => { if (!city) return; fetch(`/api/merchants?city=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}`).then((r) => r.json()).then((x) => setMerchants(x.merchants ?? [])); }, [city, query]);
  const search = useMemo(() => new URLSearchParams(Object.entries({ city, bd, merchantId, start, end }).filter(([, value]) => value)), [city, bd, merchantId, start, end]);
  useEffect(() => { fetch(`/api/analytics?${search}`).then((r) => r.ok ? r.json() : empty).then(setData).catch(() => setData(empty)); }, [search]);
  const card = (name: "MEITUAN" | "B_JIA", label: string) => <article><h3>{label}</h3><strong>{money(data.platforms[name].userPaidAmount)}</strong><p>用户实付（每单平均）</p><dl><div><dt>平台红包</dt><dd>{money(data.platforms[name].platformRedPacket)}</dd></div><div><dt>实付配送费</dt><dd>{money(data.platforms[name].paidDeliveryFee)}</dd></div><div><dt>商家结算</dt><dd>{money(data.platforms[name].merchantSettlementAmount)}</dd></div><div><dt>有效订单</dt><dd>{data.platforms[name].validOrderCount}</dd></div></dl></article>;
  return <main><Link href="/">← 首页</Link><h1>竞争价格力看板</h1><p className="muted">所有金额均为有效订单的每单平均值；平台仅展示美团与 B家。</p>
    <section className="filters dashboard-filters"><label>日期粒度<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="DAY">日</option><option value="WEEK">周</option><option value="MONTH">月</option><option value="YEAR">年</option></select></label><label>开始日期<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>结束日期<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label><label>城市<select value={city} onChange={(e) => { setCity(e.target.value); setBd(""); setMerchantId(""); }}><option value="">全部城市</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label><label>BD<select value={bd} onChange={(e) => setBd(e.target.value)} disabled={!city}><option value="">全部 BD</option>{bds.map((item) => <option key={item}>{item}</option>)}</select></label><label>商家搜索<input value={query} placeholder="ID 或名称" onChange={(e) => setQuery(e.target.value)} disabled={!city} /></label><label>商家<select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} disabled={!city}><option value="">全部商家</option>{merchants.map((item) => <option key={item.merchantId} value={item.merchantId}>{item.merchantName}（{item.merchantId}）</option>)}</select></label></section>
    {period === "WEEK" && <p className="hint">周按自然周拆分：当年 1 月 1 日至首个周日为 W1，随后每周一至周日依次编号。</p>}
    <section className="grid">{card("MEITUAN", "美团")}{card("B_JIA", "B家")}<article><h3>用户实付差异</h3><strong>{money(data.userPaidDifference)}</strong><p>美团 − B家；正数表示美团平均用户实付更高。</p></article></section>
    <section className="ranking"><h2>商家价格差异排名</h2><p className="muted">仅统计同时具备美团和 B家有效订单的商家，按用户实付差异从高到低排列。</p>{data.merchantRanking.length ? <table><thead><tr><th>排名</th><th>商家</th><th>商家 ID</th><th>美团用户实付</th><th>B家用户实付</th><th>差异</th></tr></thead><tbody>{data.merchantRanking.map((item, index) => <tr key={item.merchantId}><td>{index + 1}</td><td>{item.merchantName}</td><td>{item.merchantId}</td><td>{money(item.meituanUserPaid)}</td><td>{money(item.bJiaUserPaid)}</td><td>{money(item.userPaidDifference)}</td></tr>)}</tbody></table> : <p className="empty-state">暂无可比商家数据</p>}</section>
  </main>;
}
