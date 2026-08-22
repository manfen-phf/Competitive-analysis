type TrendPoint = { label: string; meituan: number; bJia: number };
type TrendChartProps = { title: string; periodLabel: string; data: TrendPoint[]; format: (value: number) => string };

export function TrendChart({ title, periodLabel, data, format }: TrendChartProps) {
  const max = Math.max(...data.flatMap((point) => [point.meituan, point.bJia]), 1);
  return <section className="analytics-panel analytics-trend" aria-label={`${title}趋势`}>
    <div className="analytics-panel-heading"><div><p>TREND</p><h2>{title}趋势</h2></div><span>{periodLabel}</span></div>
    {data.length ? <>
      <div className="analytics-chart-scroll"><div className="analytics-chart">
        {data.map((point) => <div className="analytics-trend-column" key={point.label}>
          <div className="analytics-bars" aria-label={`${point.label}：美团 ${format(point.meituan)}，B家 ${format(point.bJia)}`}>
            <i className="analytics-bar platform-meituan" style={{ height: `${Math.max(5, point.meituan / max * 100)}%` }} title={`美团 ${format(point.meituan)}`} />
            <i className="analytics-bar platform-bjia" style={{ height: `${Math.max(5, point.bJia / max * 100)}%` }} title={`B家 ${format(point.bJia)}`} />
          </div><small>{point.label}</small>
        </div>)}
      </div></div>
      <div className="analytics-platform-legend"><span><i className="platform-meituan" />美团</span><span><i className="platform-bjia" />B家</span></div>
    </> : <p className="analytics-empty">当前筛选暂无趋势数据</p>}
  </section>;
}
