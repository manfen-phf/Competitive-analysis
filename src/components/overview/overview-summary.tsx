import Link from "next/link";

import type { OverviewSnapshot } from "@/lib/overview";

export function OverviewSummary({ snapshot }: { snapshot: OverviewSnapshot }) {
  const cards = [
    { label: "今日采集商家", value: snapshot.todayMerchantCount, note: "按今日创建的采集任务去重" },
    { label: "今日上传截图", value: snapshot.capturedOrderCount, note: "美团与 B 家截图合计" },
    { label: "待人工确认", value: snapshot.pendingConfirmationCount, note: "双平台均已识别，等待校对" },
    { label: "识别失败", value: snapshot.failedRecognitionCount, note: "需补传或重新采集", tone: "risk" },
  ];

  return <>
    <section className="overview-summary-grid" aria-label="今日采集概览">
      {cards.map((card) => <article className="overview-summary-card" data-tone={card.tone ?? "neutral"} key={card.label}>
        <p>{card.label}</p><strong>{card.value}</strong><small>{card.note}</small>
      </article>)}
    </section>
    <nav className="overview-quick-actions" aria-label="快捷操作">
      <Link href="/upload" className="overview-action-primary">继续采集</Link>
      <Link href="/upload" className="overview-action-secondary">查看待确认</Link>
      <Link href="/dashboard" className="overview-action-secondary">进入竞争分析</Link>
    </nav>
  </>;
}
