"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Platform = "MEITUAN" | "B_JIA";
type PlatformData = { validOrderCount: number; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
type Ranking = { merchantId: string; merchantName: string; meituanUserPaid: number; bJiaUserPaid: number; userPaidDifference: number };
const metricDefinitions = [{ key: "dishPrice", label: "鑿滃搧鍘熶环", rate: false }, { key: "packagingFee", label: "椁愮洅璐?, rate: false }, { key: "platformRedPacket", label: "鍒告姷鎵?, rate: false }, { key: "originalDeliveryFee", label: "鍘熶环閰嶉€佽垂", rate: false }, { key: "deliveryFeeReduction", label: "鍑忛厤閫佽垂", rate: false }, { key: "paidDeliveryFee", label: "瀹炰粯閰嶉€佽垂", rate: false }, { key: "merchantSettlementAmount", label: "鍟嗗缁撶畻閲戦", rate: false }, { key: "userPaidAmount", label: "鐢ㄦ埛瀹炰粯", rate: false }, { key: "otherPromotion", label: "鍏朵粬娲诲姩", rate: false }, { key: "technicalServiceFee", label: "鎶€鏈湇鍔¤垂", rate: false }, { key: "deliveryServiceFee", label: "閰嶉€佹湇鍔¤垂", rate: false }, { key: "merchantRate", label: "鍟嗗璐圭巼", rate: true }] as const;
type MetricKey = typeof metricDefinitions[number]["key"];
type Metrics = Record<MetricKey, number>;
type Trend = { label: string; platforms: Record<Platform, PlatformData>; userPaidDifference: number };
type PriceBand = { label: string; platforms: Record<Platform, { validOrderCount:number; userPaidAmount:number }> };
type Data = { platforms: Record<Platform, PlatformData>; userPaidDifference: number; merchantRanking: Ranking[]; trend: Trend[]; metrics: Record<Platform, Metrics>; priceBands: PriceBand[]; bdSummary: any[]; citySummary: any[] };
type Merchant = { merchantId: string; merchantName: string; bdName: string };

const blank: PlatformData = { validOrderCount: 0, userPaidAmount: 0, platformRedPacket: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0 };
const zeroMetrics = Object.fromEntries(metricDefinitions.map((item) => [item.key, 0])) as Metrics;
const empty: Data = { platforms: { MEITUAN: blank, B_JIA: blank }, userPaidDifference: 0, merchantRanking: [], trend: [], metrics: { MEITUAN: zeroMetrics, B_JIA: zeroMetrics }, priceBands: [], bdSummary: [], citySummary: [] };
const money = (value: number) => `楼${value.toFixed(2)}`;

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

  const card = (name: Platform, label: string) => <article><h3>{label}</h3><strong>{money(data.platforms[name].userPaidAmount)}</strong><p>鐢ㄦ埛瀹炰粯锛堟瘡鍗曞钩鍧囷級</p><dl><div><dt>骞冲彴绾㈠寘</dt><dd>{money(data.platforms[name].platformRedPacket)}</dd></div><div><dt>瀹炰粯閰嶉€佽垂</dt><dd>{money(data.platforms[name].paidDeliveryFee)}</dd></div><div><dt>鍟嗗缁撶畻</dt><dd>{money(data.platforms[name].merchantSettlementAmount)}</dd></div><div><dt>鏈夋晥璁㈠崟</dt><dd>{data.platforms[name].validOrderCount}</dd></div></dl></article>;

  return <main className="insight-canvas">
    <header><h1>绔炰簤浠锋牸鍔涚湅鏉?/h1><nav><Link href="/">棣栭〉</Link><Link href="/upload">涓婁紶鎴浘</Link><Link href="/admin/import">涓绘暟鎹鍏?/Link><Link href="/stat">涓婁紶缁熻</Link></nav></header>
    <section className="insight-brief"><div><p>{"AI \u6d1e\u5bdf"}</p><h2>{data.userPaidDifference > 0 ? "\u7f8e\u56e2\u7528\u6237\u5b9e\u4ed8\u66f4\u9ad8\uff0c\u5efa\u8bae\u5148\u5904\u7406\u5dee\u5f02\u5546\u5bb6" : "\u5f53\u524d\u7ade\u4e89\u4ef7\u683c\u529b\u5904\u4e8e\u53ef\u8ddf\u8e2a\u72b6\u6001"}</h2><span>{"\u7ed3\u8bba\u57fa\u4e8e\u5f53\u524d\u7b5b\u9009\u7684\u6709\u6548\u8ba2\u5355\u5e73\u5747\u503c\uff0c\u4e0d\u865a\u6784\u57ce\u5e02\u6216 BD \u5f52\u5c5e\u3002"}</span></div><Link className="secondary" href="/upload">{"\u8865\u5145\u8ba2\u5355\u8bc1\u636e"}</Link></section>
    <p className="muted">鎵€鏈夐噾棰濆潎涓烘湁鏁堣鍗曠殑姣忓崟骞冲潎鍊硷紱骞冲彴浠呭睍绀虹編鍥笌 B 瀹躲€?/p>
    <section className="filters dashboard-filters">
      <label>鏃ユ湡绮掑害<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="DAY">鏃?/option><option value="WEEK">鍛?/option><option value="MONTH">鏈?/option><option value="YEAR">骞?/option></select></label>
      <label>寮€濮嬫棩鏈?input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label>缁撴潫鏃ユ湡<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label>鍩庡競<select value={city} onChange={(e) => { setCity(e.target.value); setBd(""); setMerchantId(""); }}><option value="">鍏ㄩ儴鍩庡競</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>BD<select value={bd} onChange={(e) => setBd(e.target.value)} disabled={!city}><option value="">鍏ㄩ儴 BD</option>{bds.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>鍟嗗鎼滅储<input value={query} placeholder="ID 鎴栧悕绉? onChange={(e) => setQuery(e.target.value)} disabled={!city} /></label>
      <label>鍟嗗<select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} disabled={!city}><option value="">鍏ㄩ儴鍟嗗</option>{merchants.map((item) => <option key={item.merchantId} value={item.merchantId}>{item.merchantName}锛坽item.merchantId}锛?/option>)}</select></label>
    </section>
    {period === "WEEK" && <p className="hint">鑷劧鍛ㄨ鍒欙細褰撳勾 1 鏈?1 鏃ヨ嚦棣栦釜鍛ㄦ棩涓?W1锛岄殢鍚庢瘡鍛ㄤ竴鑷冲懆鏃ヤ緷娆＄紪鍙枫€?/p>}
    <section className="grid">{card("MEITUAN", "缇庡洟")}{card("B_JIA", "B 瀹?)}<article><h3>鐢ㄦ埛瀹炰粯宸紓</h3><strong>{money(data.userPaidDifference)}</strong><p>缇庡洟 鈭?B 瀹讹紱姝ｆ暟琛ㄧず缇庡洟骞冲潎鐢ㄦ埛瀹炰粯鏇撮珮銆?/p></article></section>
    <section className="metric-section"><h2>鍏ㄦ寚鏍囧钩鍙板姣?/h2><p className="muted">閲戦鍧囦负姣忓崟骞冲潎锛涘晢瀹惰垂鐜囦负骞冲潎璐圭巼銆?/p><div className="metric-grid">{metricDefinitions.map((metric) => <article key={metric.key}><h3>{metric.label}/鍗?/h3><dl><div><dt>缇庡洟</dt><dd>{metric.rate ? `${(data.metrics.MEITUAN[metric.key] * 100).toFixed(1)}%` : money(data.metrics.MEITUAN[metric.key])}</dd></div><div><dt>B 瀹?/dt><dd>{metric.rate ? `${(data.metrics.B_JIA[metric.key] * 100).toFixed(1)}%` : money(data.metrics.B_JIA[metric.key])}</dd></div></dl><p>缇庡洟 鈭?B 瀹讹細{metric.rate ? `${((data.metrics.MEITUAN[metric.key] - data.metrics.B_JIA[metric.key]) * 100).toFixed(1)} 涓櫨鍒嗙偣` : money(data.metrics.MEITUAN[metric.key] - data.metrics.B_JIA[metric.key])}</p></article>)}</div></section>
    <section className="ranking"><h2>涓嶅悓浠蜂綅娈电珵浜夊姏</h2><p className="muted">鎸夎彍鍝佸師浠峰垎娈碉紝瀵规瘮涓ゅ钩鍙扮敤鎴峰疄浠樹笌璁㈠崟閲忋€?/p><div className="band-grid">{data.priceBands.map((band) => <article key={band.label}><h3>{band.label}</h3><p>璁㈠崟锛氱編鍥?{band.platforms.MEITUAN.validOrderCount}锝淏 瀹?{band.platforms.B_JIA.validOrderCount}</p><dl><div><dt>缇庡洟鐢ㄦ埛瀹炰粯</dt><dd>{money(band.platforms.MEITUAN.userPaidAmount)}</dd></div><div><dt>B 瀹剁敤鎴峰疄浠?/dt><dd>{money(band.platforms.B_JIA.userPaidAmount)}</dd></div></dl></article>)}</div></section>
    <section className="ranking"><h2>绔炰簤浠锋牸鍔涜秼鍔?/h2><p className="muted">鏍规嵁鎵€閫夋棩銆佸懆銆佹湀鎴栧勾鍒嗙粍锛屽睍绀轰袱骞冲彴鐢ㄦ埛瀹炰粯鐨勫钩鍧囧€笺€?/p>{data.trend.length ? <table><thead><tr><th>鍛ㄦ湡</th><th>缇庡洟鐢ㄦ埛瀹炰粯</th><th>B 瀹剁敤鎴峰疄浠?/th><th>宸紓</th><th>鏈夋晥璁㈠崟</th></tr></thead><tbody>{data.trend.map((item) => <tr key={item.label}><td>{item.label}</td><td>{money(item.platforms.MEITUAN.userPaidAmount)}</td><td>{money(item.platforms.B_JIA.userPaidAmount)}</td><td>{money(item.userPaidDifference)}</td><td>{item.platforms.MEITUAN.validOrderCount + item.platforms.B_JIA.validOrderCount}</td></tr>)}</tbody></table> : <p className="empty-state">鏆傛棤绗﹀悎绛涢€夋潯浠剁殑瓒嬪娍鏁版嵁</p>}</section>
    <section className="ranking"><h2>BD 缁村害鏁版嵁鍛堢幇</h2><table><thead><tr><th>BD</th><th>涓婁紶鏁?/th><th>缇庡洟瀹炰粯</th><th>B瀹跺疄浠?/th><th>鍒稿樊寮?/th><th>閰嶉€佽垂宸紓</th></tr></thead><tbody>{data.bdSummary.map((r:any)=><tr key={r.label}><td>{r.label}</td><td>{r.platforms.MEITUAN.validOrderCount+r.platforms.B_JIA.validOrderCount}</td><td>{money(r.platforms.MEITUAN.userPaidAmount)}</td><td>{money(r.platforms.B_JIA.userPaidAmount)}</td><td>{money(r.platforms.MEITUAN.platformRedPacket-r.platforms.B_JIA.platformRedPacket)}</td><td>{money(r.platforms.MEITUAN.paidDeliveryFee-r.platforms.B_JIA.paidDeliveryFee)}</td></tr>)}</tbody></table></section><section className="ranking"><h2>鍩庡競缁村害鏁版嵁鍛堢幇</h2><table><thead><tr><th>鍩庡競</th><th>涓婁紶鏁?/th><th>缇庡洟瀹炰粯</th><th>B瀹跺疄浠?/th><th>鍒稿樊寮?/th><th>閰嶉€佽垂宸紓</th></tr></thead><tbody>{data.citySummary.map((r:any)=><tr key={r.label}><td>{r.label}</td><td>{r.platforms.MEITUAN.validOrderCount+r.platforms.B_JIA.validOrderCount}</td><td>{money(r.platforms.MEITUAN.userPaidAmount)}</td><td>{money(r.platforms.B_JIA.userPaidAmount)}</td><td>{money(r.platforms.MEITUAN.platformRedPacket-r.platforms.B_JIA.platformRedPacket)}</td><td>{money(r.platforms.MEITUAN.paidDeliveryFee-r.platforms.B_JIA.paidDeliveryFee)}</td></tr>)}</tbody></table></section>    <section className="ranking"><h2>鍟嗗浠锋牸宸紓鎺掑悕</h2><p className="muted">浠呯粺璁″悓鏃跺叿澶囩編鍥㈠拰 B 瀹舵湁鏁堣鍗曠殑鍟嗗锛屾寜鐢ㄦ埛瀹炰粯宸紓浠庨珮鍒颁綆鎺掑垪銆?/p>{data.merchantRanking.length ? <table><thead><tr><th>鎺掑悕</th><th>鍟嗗</th><th>鍟嗗 ID</th><th>缇庡洟鐢ㄦ埛瀹炰粯</th><th>B 瀹剁敤鎴峰疄浠?/th><th>宸紓</th></tr></thead><tbody>{data.merchantRanking.map((item, index) => <tr key={item.merchantId}><td>{index + 1}</td><td>{item.merchantName}</td><td>{item.merchantId}</td><td>{money(item.meituanUserPaid)}</td><td>{money(item.bJiaUserPaid)}</td><td>{money(item.userPaidDifference)}</td></tr>)}</tbody></table> : <p className="empty-state">鏆傛棤鍙瘮鍟嗗鏁版嵁</p>}</section>
  </main>;
}