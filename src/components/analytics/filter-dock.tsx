"use client";

import { useEffect, useMemo, useState } from "react";

import { metricLabels, type MetricKey, type PeriodKey } from "@/lib/analytics";
import { DateRangePopover, type DateSelection } from "./date-range-popover";

export type FilterValue = DateSelection & { city?: string; bd?: string; merchantId?: string; metric: MetricKey };
export type MerchantOption = { merchantId: string; merchantName: string; bdName: string };

type FilterDockProps = { value: FilterValue; cities: string[]; bds: string[]; merchants: MerchantOption[]; onChange: (value: FilterValue) => void; onMerchantQueryChange: (query: string) => void; lockedCity?: string; lockedBd?: string };

const periodText: Record<PeriodKey, string> = { DAY: "日", WEEK: "周", MONTH: "月", YEAR: "年" };
const conditionLabel = (value: FilterValue) => value.start && value.end ? `${periodText[value.period]} · ${value.start.replaceAll("-", "/")} – ${value.end.replaceAll("-", "/")}` : `按${periodText[value.period]}查看`;

export function FilterDock({ value, cities, bds, merchants, onChange, onMerchantQueryChange, lockedCity, lockedBd }: FilterDockProps) {
  const [isDatePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isMobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileDraft, setMobileDraft] = useState(value);
  useEffect(() => setMobileDraft(value), [value]);
  const selectedMerchant = useMemo(() => merchants.find((merchant) => merchant.merchantId === value.merchantId), [merchants, value.merchantId]);
  const set = (patch: Partial<FilterValue>) => onChange({ ...value, ...patch });
  const remove = (key: keyof FilterValue) => {
    if (key === "start" || key === "end") onChange({ ...value, start: undefined, end: undefined });
    else if (key === "city") onChange({ ...value, city: undefined, bd: undefined, merchantId: undefined });
    else if (key === "bd") onChange({ ...value, bd: undefined });
    else if (key === "merchantId") onChange({ ...value, merchantId: undefined });
  };
  const controls = (draft: FilterValue, setDraft: (next: FilterValue) => void) => <>
    <div className="analytics-field analytics-date-field"><span>时间</span><button type="button" className="analytics-control" onClick={() => setDatePopoverOpen((state) => !state)} aria-expanded={isDatePopoverOpen}>{conditionLabel(draft)} <i>⌄</i></button>{isDatePopoverOpen ? <DateRangePopover value={draft} onChange={(next) => setDraft({ ...draft, ...next })} onClose={() => setDatePopoverOpen(false)} /> : null}</div>
    <label className="analytics-field"><span>城市</span><select className="analytics-control" value={draft.city ?? ""} disabled={Boolean(lockedCity)} onChange={(event) => setDraft({ ...draft, city: event.target.value || undefined, bd: undefined, merchantId: undefined })}><option value="">全部城市</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
    <label className="analytics-field"><span>BD</span><select className="analytics-control" value={draft.bd ?? ""} disabled={Boolean(lockedBd) || !draft.city} onChange={(event) => setDraft({ ...draft, bd: event.target.value || undefined, merchantId: undefined })}><option value="">全部 BD</option>{bds.map((bd) => <option key={bd} value={bd}>{bd}</option>)}</select></label>
    <label className="analytics-field analytics-merchant-search"><span>商家</span><input className="analytics-control" placeholder="名称或 ID" onChange={(event) => onMerchantQueryChange(event.target.value)} /></label>
    <label className="analytics-field analytics-merchant-select"><span>选择商家</span><select className="analytics-control" value={draft.merchantId ?? ""} disabled={!draft.city} onChange={(event) => setDraft({ ...draft, merchantId: event.target.value || undefined })}><option value="">全部商家</option>{merchants.map((merchant) => <option key={merchant.merchantId} value={merchant.merchantId}>{merchant.merchantName} · {merchant.merchantId}</option>)}</select></label>
    <label className="analytics-field"><span>重点指标</span><select className="analytics-control" value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value as MetricKey })}>{Object.entries(metricLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
  </>;
  return <section className="analytics-filter-dock" aria-label="竞争分析筛选器">
    <div className="analytics-filter-desktop">{controls(value, onChange)}</div>
    <button className="analytics-filter-mobile-trigger" type="button" onClick={() => setMobileSheetOpen(true)}>筛选与时间 <span>{conditionLabel(value)}</span></button>
    {isMobileSheetOpen ? <div className="analytics-mobile-sheet" role="dialog" aria-label="筛选条件"><div className="analytics-mobile-sheet-inner"><header><strong>筛选条件</strong><button type="button" onClick={() => setMobileSheetOpen(false)}>关闭</button></header><div className="analytics-filter-mobile-controls">{controls(mobileDraft, setMobileDraft)}</div><footer><button type="button" className="analytics-primary" onClick={() => { onChange(mobileDraft); setMobileSheetOpen(false); setDatePopoverOpen(false); }}>应用筛选</button></footer></div></div> : null}
    <div className="analytics-filter-chips"><span>已选</span><button type="button" onClick={() => remove("start")}>{conditionLabel(value)} ×</button>{value.city ? <button type="button" onClick={() => remove("city")}>城市：{value.city} ×</button> : null}{value.bd ? <button type="button" onClick={() => remove("bd")}>BD：{value.bd} ×</button> : null}{selectedMerchant ? <button type="button" onClick={() => remove("merchantId")}>商家：{selectedMerchant.merchantName} ×</button> : null}</div>
  </section>;
}
