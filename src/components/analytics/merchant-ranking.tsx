type MerchantRank = { merchantId: string; merchantName: string; city: string; bdName: string; meituan: number; bJia: number; difference: number; unit: "money" | "percent" };
type MerchantRankingProps = { rows: MerchantRank[]; metricLabel: string; format: (value: number, unit: MerchantRank["unit"]) => string };

export function MerchantRanking({ rows, metricLabel, format }: MerchantRankingProps) {
  return <section className="analytics-panel analytics-ranking">
    <div className="analytics-panel-heading"><div><p>MERCHANTS</p><h2>商家差异排行</h2></div><span>绝对差异</span></div>
    <p className="analytics-ranking-note">按“{metricLabel}”的绝对差异排序，优先定位需要跟进的商家。</p>
    {rows.length ? <div className="analytics-table-scroll"><table><thead><tr><th>#</th><th>商家</th><th>城市 / BD</th><th>美团</th><th>B家</th><th>差异</th></tr></thead><tbody>
      {rows.slice(0, 20).map((row, index) => <tr key={row.merchantId}><td>{String(index + 1).padStart(2, "0")}</td><td><strong>{row.merchantName}</strong><small>{row.merchantId}</small></td><td>{row.city}<small>{row.bdName}</small></td><td>{format(row.meituan, row.unit)}</td><td>{format(row.bJia, row.unit)}</td><td data-outcome={row.difference >= 0 ? "good" : "risk"}>{row.difference > 0 ? "+" : ""}{format(row.difference, row.unit)}</td></tr>)}
    </tbody></table></div> : <p className="analytics-empty">暂无可比较的商家数据</p>}
  </section>;
}
