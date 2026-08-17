"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { utils, writeFileXLSX } from "xlsx";

type RecordItem = {
  uploadImageId: string; platform: "MEITUAN" | "B_JIA"; uploadedAt: string; recognitionStatus: string | null; failureReason: string | null;
  merchantName: string; cityName: string; bdName: string; confirmedOrderId: string | null;
  goodsTotal: number | null; dishPrice: number | null; packagingFee: number | null; merchantActivityAmount: number | null; otherActivityAmount: number | null;
  originalDeliveryFee: number | null; deliveryFeeReduction: number | null; paidDeliveryFee: number | null; platformRedPacketAmount: number | null; platformRedPacketMerchantShare: number | null;
  merchantSettlementAmount: number | null; userPaidAmount: number | null; technicalServiceFee: number | null; deliveryServiceFee: number | null; merchantRate: number | null;
};
type Options = { cities: string[]; bds: string[] };
const money = (value: number | null) => value == null ? "—" : `¥${value.toFixed(2)}`;
const statusLabel = (item: RecordItem) => item.recognitionStatus === "SUCCESS" ? (item.confirmedOrderId ? "已确认" : "待确认") : item.recognitionStatus === "FAILED" ? "识别失败" : "处理中";

function exportRecords(records: RecordItem[]) {
  const rows = records.map((item) => ({
    "上传时间": new Date(item.uploadedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }),
    "识别状态": statusLabel(item), "平台": item.platform === "MEITUAN" ? "美团" : "B家", "城市": item.cityName, "商家": item.merchantName, "BD": item.bdName,
    "商品总价": item.goodsTotal, "菜品原价": item.dishPrice, "打包费": item.packagingFee, "商家活动款": item.merchantActivityAmount, "其他活动": item.otherActivityAmount,
    "原价配送费": item.originalDeliveryFee, "减配送费": item.deliveryFeeReduction, "实付配送费": item.paidDeliveryFee,
    "平台红包抵扣金额": item.platformRedPacketAmount, "平台红包商家承担": item.platformRedPacketMerchantShare,
    "商家结算金额": item.merchantSettlementAmount, "用户实付": item.userPaidAmount, "技术服务费": item.technicalServiceFee, "配送服务费": item.deliveryServiceFee,
    "实际费率": item.merchantRate == null ? null : Number((item.merchantRate * 100).toFixed(2)) / 100,
  }));
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.json_to_sheet(rows), "识别数据");
  writeFileXLSX(workbook, `识别数据-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function Records() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [options, setOptions] = useState<Options>({ cities: [], bds: [] });
  const [city, setCity] = useState("");
  const [bd, setBd] = useState("");
  const [platform, setPlatform] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => { fetch("/api/filter-options").then((response) => response.ok ? response.json() : { cities: [], bds: [] }).then(setOptions).catch(() => undefined); }, []);
  const search = useMemo(() => new URLSearchParams(Object.entries({ city, bd, platform }).filter(([, value]) => value)), [city, bd, platform]);
  useEffect(() => { fetch(`/api/records?${search}`).then((response) => response.ok ? response.json() : { records: [] }).then((payload) => setRecords(payload.records ?? [])).catch(() => setRecords([])); }, [search]);

  return <main className="management-page records-page">
    <header className="management-heading"><div><p>数据中心</p><h1>{"\u8bc6\u522b\u6570\u636e\u7ba1\u7406"}</h1><span>所有记录都可追溯至平台、商家、BD 和上传时间；订单号不会被展示或导出。</span></div><div className="management-heading-actions"><button className="secondary compact" type="button" disabled={!records.length} onClick={() => exportRecords(records)}>{"\u5bfc\u51fa\u5f53\u524d\u7b5b\u9009"}</button><Link className="secondary compact" href="/dashboard">打开定价分析</Link></div></header>
    <section className="management-filters records-filters"><label>城市<select value={city} onChange={(event) => setCity(event.target.value)}><option value="">全部城市</option>{options.cities.map((item) => <option key={item}>{item}</option>)}</select></label><label>BD<select value={bd} onChange={(event) => setBd(event.target.value)}><option value="">全部 BD</option>{options.bds.map((item) => <option key={item}>{item}</option>)}</select></label><label>平台<select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">全部平台</option><option value="MEITUAN">美团</option><option value="B_JIA">B家</option></select></label><button className="secondary" type="button" onClick={() => { setCity(""); setBd(""); setPlatform(""); }}>重置筛选</button></section>
    <section className="records-table-wrap"><table><thead><tr><th>上传时间</th><th>状态</th><th>平台</th><th>城市</th><th>商家 / BD</th><th>商品总价</th><th>用户实付</th><th></th></tr></thead><tbody>{records.map((item) => <RecordRow key={item.uploadImageId} item={item} expanded={expanded === item.uploadImageId} onToggle={() => setExpanded(expanded === item.uploadImageId ? null : item.uploadImageId)} />)}</tbody></table>{!records.length ? <div className="records-empty">暂无符合筛选条件的上传记录。</div> : null}</section>
  </main>;
}

function RecordRow({ item, expanded, onToggle }: { item: RecordItem; expanded: boolean; onToggle: () => void }) {
  const success = item.recognitionStatus === "SUCCESS";
  return <><tr><td>{new Date(item.uploadedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</td><td><span className={`status-dot ${success ? "success" : item.recognitionStatus === "FAILED" ? "failed" : "pending"}`}>{statusLabel(item)}</span></td><td>{item.platform === "MEITUAN" ? "美团" : "B家"}</td><td>{item.cityName}</td><td><b>{item.merchantName}</b><small>{item.bdName}</small></td><td>{money(item.goodsTotal)}</td><td>{money(item.userPaidAmount)}</td><td><button className="secondary" type="button" onClick={onToggle}>{expanded ? "收起" : "明细"}</button></td></tr>{expanded ? <tr className="record-expanded"><td colSpan={8}>{success ? <><dl><div><dt>商家结算</dt><dd>{money(item.merchantSettlementAmount)}</dd></div><div><dt>实际费率</dt><dd>{item.merchantRate == null ? "—" : `${(item.merchantRate * 100).toFixed(2)}%`}</dd></div><div><dt>其他活动</dt><dd>{money(item.otherActivityAmount)}</dd></div><div><dt>确认状态</dt><dd>{item.confirmedOrderId ? "已写入竞争分析" : "等待 BD 确认"}</dd></div></dl><a className="record-source-link" href={`/api/records/${item.uploadImageId}/image`} target="_blank" rel="noreferrer">查看原图</a></> : <p>{item.failureReason || "识别未完成，请返回采集页面重新上传。"}</p>}</td></tr> : null}</>;
}
