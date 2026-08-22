import type { MetricKey } from "@/lib/analytics";

type Row = { key: MetricKey; label: string; meituan: number; bJia: number; difference: number; unit: "money" | "percent" };
type ComparisonMatrixProps = { rows: Row[]; activeMetric: MetricKey; onSelect: (metric: MetricKey) => void; format: (value: number, unit: Row["unit"]) => string };

export function ComparisonMatrix({ rows, activeMetric, onSelect, format }: ComparisonMatrixProps) {
  return <section className="analytics-panel analytics-matrix">
    <div className="analytics-panel-heading"><div><p>MATRIX</p><h2>指标对比矩阵</h2></div><span>{rows.length} 项</span></div>
    <div className="analytics-matrix-head"><span>指标</span><span>美团</span><span>B家</span><span>差异</span></div>
    <div className="analytics-matrix-rows">{rows.map((row) => <button type="button" key={row.key} className="analytics-matrix-row" data-active={row.key === activeMetric} onClick={() => onSelect(row.key)}>
      <strong>{row.label}</strong><span>{format(row.meituan, row.unit)}</span><span>{format(row.bJia, row.unit)}</span><b data-outcome={row.difference >= 0 ? "good" : "risk"}>{row.difference > 0 ? "+" : ""}{format(row.difference, row.unit)}</b>
    </button>)}</div>
  </section>;
}
