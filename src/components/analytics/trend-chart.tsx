type TrendPoint = { label: string; meituan: number | null; bJia: number | null; meituanObservationCount: number; bJiaObservationCount: number };
type TrendChartProps = { title: string; periodLabel: string; data: TrendPoint[]; format: (value: number | null) => string };

/** Missing observations and observed zeroes must not imply a visible bar. */
export function trendBarHeight(value: number | null, maximum: number) {
  return `${value && value > 0 && maximum > 0 ? value / maximum * 100 : 0}%`;
}

export function TrendChart({ title, periodLabel, data, format }: TrendChartProps) {
  const max = Math.max(...data.flatMap((point) => [point.meituan ?? 0, point.bJia ?? 0]), 1);
  return <section className="analytics-panel analytics-trend" aria-label={`${title}趋势`}>
    <div className="analytics-panel-heading"><div><p>TREND</p><h2>{title}趋势</h2></div><span>{periodLabel}</span></div>
    {data.length ? <>
      <div className="analytics-chart-scroll"><div className="analytics-chart">
        {data.map((point) => <div className="analytics-trend-column" key={point.label}>
          <div className="analytics-bars" aria-label={`${point.label}：美团 ${format(point.meituan)}（${point.meituanObservationCount} 条），B家 ${format(point.bJia)}（${point.bJiaObservationCount} 条）`}>
            <i className="analytics-bar platform-meituan" data-empty={point.meituan === null || point.meituan === 0} style={{ height: trendBarHeight(point.meituan, max) }} title={`美团 ${format(point.meituan)}`} />
            <i className="analytics-bar platform-bjia" data-empty={point.bJia === null || point.bJia === 0} style={{ height: trendBarHeight(point.bJia, max) }} title={`B家 ${format(point.bJia)}`} />
          </div><small>{point.label}</small>
        </div>)}
      </div></div>
      <div className="analytics-platform-legend"><span><i className="platform-meituan" />美团</span><span><i className="platform-bjia" />B家</span></div>
    </> : <p className="analytics-empty">当前筛选暂无趋势数据</p>}
  </section>;
}
