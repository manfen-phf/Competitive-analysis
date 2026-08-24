type DataQuality = {
  validCount: number;
  pendingCount: number;
  failedCount: number;
  averageConfidence: number;
};

export function DataQualitySummary({ data }: { data: DataQuality }) {
  const cards = [
    { label: "已识别", value: data.validCount, note: "已进入结构化订单库", tone: "positive" },
    { label: "待确认", value: data.pendingCount, note: "等待识别或人工校对", tone: "pending" },
    { label: "识别失败", value: data.failedCount, note: "需要补传或重试", tone: "risk" },
    { label: "平均置信度", value: `${Math.round(data.averageConfidence * 100)}%`, note: "仅统计返回置信度的识别", tone: "neutral" },
  ];
  return <section className="data-quality-grid" aria-label="数据质量摘要">
    {cards.map((card) => <article key={card.label} className="data-quality-card" data-tone={card.tone}>
      <p>{card.label}</p><strong>{card.value}</strong><small>{card.note}</small>
    </article>)}
  </section>;
}
