import type { OverviewSnapshot } from "@/lib/overview";

const collectionStatus: Record<string, string> = {
  DRAFT: "采集中",
  UPLOADING: "上传中",
  RECOGNIZING: "识别中",
  READY_TO_CONFIRM: "待确认",
  CONFIRMED: "已确认",
  FAILED: "需处理",
};

export function RecentCollectionList({ collections }: { collections: OverviewSnapshot["latestCollections"] }) {
  return <section className="overview-panel" aria-labelledby="recent-collections-title">
    <header><div><p>最近采集</p><h2 id="recent-collections-title">采集进度</h2></div><span>{collections.length} 项</span></header>
    {collections.length ? <ol className="overview-activity-list">{collections.map((collection) => <li key={collection.id}>
      <div><strong>{collection.merchantName}</strong><small>{collection.city} · {collection.bdName} · {new Date(collection.createdAt).toLocaleString("zh-CN", { hour12: false })}</small></div>
      <div className="overview-collection-state"><b data-status={collection.status}>{collectionStatus[collection.status] ?? collection.status}</b><small>{collection.recognitionSummary}</small></div>
    </li>)}</ol> : <p className="overview-empty">还没有采集记录。可从“继续采集”开始上传一组订单截图。</p>}
  </section>;
}
