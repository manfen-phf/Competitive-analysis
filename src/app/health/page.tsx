"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HealthOverview = { collection: { uploadImageCount: number; recognizedImageCount: number; failedImageCount: number; confirmedImageCount: number; collectionCount: number; pairedCollectionCount: number; incompleteCollectionCount: number } };
const empty: HealthOverview = { collection: { uploadImageCount: 0, recognizedImageCount: 0, failedImageCount: 0, confirmedImageCount: 0, collectionCount: 0, pairedCollectionCount: 0, incompleteCollectionCount: 0 } };

export default function Health() {
  const [data, setData] = useState<HealthOverview | null>(null);
  useEffect(() => { fetch("/api/analytics").then((response) => response.ok ? response.json() : empty).then(setData).catch(() => setData(empty)); }, []);
  const collection = (data ?? empty).collection;
  const confirmationRate = collection.uploadImageCount ? Math.round(collection.confirmedImageCount / collection.uploadImageCount * 100) : 0;
  return <main className="management-page health-page"><header className="management-heading"><div><p>采集健康度</p><h1>每一张截图都能被追踪</h1><span>从上传、千问识别到人工确认，所有状态均来自 Cloudflare D1 的实时记录。</span></div><Link className="primary compact" href="/collect">开始采集</Link></header><section className="health-summary"><article className="health-ring"><div><strong>{confirmationRate}</strong><span>确认完成率</span></div></article><div className="health-summary-copy"><h2>{collection.failedImageCount ? "有识别失败需要处理" : "采集链路运行正常"}</h2><p>{collection.uploadImageCount ? `已接收 ${collection.uploadImageCount} 张订单截图，${collection.confirmedImageCount} 张已由 BD 完成人工确认。` : "尚未开始采集。上传同一商家的美团和 B 家截图即可生成第一组竞争数据。"}</p><Link href="/records">打开所有记录 →</Link></div></section><section className="health-stat-grid"><HealthStat label="上传截图" value={collection.uploadImageCount} detail="美团与 B 家原图" /><HealthStat label="识别成功" value={collection.recognizedImageCount} detail="千问返回结构化结果" /><HealthStat label="已人工确认" value={collection.confirmedImageCount} detail="正式进入分析口径" /><HealthStat label="成对采集" value={collection.pairedCollectionCount} detail={`${collection.incompleteCollectionCount} 组尚未成对`} /></section><section className="health-flow"><div className="section-title"><h2>当前采集链路</h2><span>实时口径</span></div><div className="flow-row"><Flow title="上传截图" value={collection.uploadImageCount} active={collection.uploadImageCount > 0} /><Flow title="AI 识别" value={collection.recognizedImageCount} active={collection.recognizedImageCount > 0} /><Flow title="BD 确认" value={collection.confirmedImageCount} active={collection.confirmedImageCount > 0} /><Flow title="平台对比" value={collection.pairedCollectionCount} active={collection.pairedCollectionCount > 0} /></div>{collection.failedImageCount ? <Link className="failure-callout" href="/records"><b>{collection.failedImageCount} 张截图识别失败</b><span>查看原因与原图 →</span></Link> : null}</section></main>;
}
function HealthStat({ label, value, detail }: { label: string; value: number; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Flow({ title, value, active }: { title: string; value: number; active: boolean }) { return <div className={active ? "active" : ""}><i>{active ? "✓" : "·"}</i><span>{title}</span><b>{value}</b></div>; }
