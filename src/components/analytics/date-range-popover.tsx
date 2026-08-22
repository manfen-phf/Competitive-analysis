"use client";

import { useMemo, useState } from "react";

import { periodLabel, type PeriodKey } from "@/lib/analytics";

export type DateSelection = { period: PeriodKey; start?: string; end?: string };

const periodLabels: Record<PeriodKey, string> = { DAY: "日", WEEK: "周", MONTH: "月", YEAR: "年" };
const pad = (value: number) => String(value).padStart(2, "0");
const asValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromValue = (value?: string) => value ? new Date(`${value}T12:00:00`) : undefined;
const monthName = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;

function daysForMonth(view: Date) {
  const start = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const first = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
}

function weekRange(date: Date) {
  const year = date.getFullYear();
  const firstMondayOffset = (8 - new Date(year, 0, 1).getDay()) % 7;
  const local = new Date(year, date.getMonth(), date.getDate());
  const dayIndex = Math.round((local.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000);
  if (dayIndex < firstMondayOffset) return [new Date(year, 0, 1), new Date(year, 0, firstMondayOffset)] as const;
  const startDay = firstMondayOffset + Math.floor((dayIndex - firstMondayOffset) / 7) * 7;
  return [new Date(year, 0, 1 + startDay), new Date(year, 0, 1 + startDay + 6)] as const;
}

type DateRangePopoverProps = { value: DateSelection; onChange: (value: DateSelection) => void; onClose: () => void };

export function DateRangePopover({ value, onChange, onClose }: DateRangePopoverProps) {
  const [view, setView] = useState(() => fromValue(value.start) ?? new Date());
  const [draft, setDraft] = useState<DateSelection>(value);
  const months = useMemo(() => [new Date(view.getFullYear(), view.getMonth(), 1), new Date(view.getFullYear(), view.getMonth() + 1, 1)], [view]);
  const selectDay = (date: Date) => {
    const next = asValue(date);
    if (!draft.start || (draft.start && draft.end)) setDraft({ ...draft, start: next, end: undefined });
    else if (next < draft.start) setDraft({ ...draft, start: next, end: draft.start });
    else setDraft({ ...draft, end: next });
  };
  const apply = () => { onChange(draft); onClose(); };
  const selectPeriod = (period: PeriodKey) => setDraft({ ...draft, period, start: undefined, end: undefined });
  const currentYear = view.getFullYear();
  return <div className="analytics-date-popover" role="dialog" aria-label="选择分析时间范围">
    <div className="analytics-period-tabs">{(Object.keys(periodLabels) as PeriodKey[]).map((period) => <button type="button" key={period} onClick={() => selectPeriod(period)} data-active={draft.period === period}>{periodLabels[period]}</button>)}</div>
    {draft.period === "DAY" ? <div className="analytics-calendar-pair">
      {months.map((month) => <section key={month.toISOString()} className="analytics-month"><header><strong>{monthName(month)}</strong></header><div className="analytics-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div><div className="analytics-days">{daysForMonth(month).map((date) => {
        const dateValue = asValue(date); const selected = dateValue === draft.start || dateValue === draft.end; const inRange = Boolean(draft.start && draft.end && dateValue >= draft.start && dateValue <= draft.end);
        return <button type="button" key={dateValue} onClick={() => selectDay(date)} data-current-month={date.getMonth() === month.getMonth()} data-selected={selected} data-in-range={inRange}>{date.getDate()}</button>;
      })}</div></section>)}
    </div> : null}
    {draft.period === "WEEK" ? <div className="analytics-week-list">{Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentYear, 0, 1 + index * 7); const [start, end] = weekRange(date); const startValue = asValue(start); const endValue = asValue(end);
      return <button type="button" key={index} data-selected={draft.start === startValue && draft.end === endValue} onClick={() => setDraft({ ...draft, start: startValue, end: endValue })}><strong>{periodLabel(date, "WEEK")}</strong><span>{`${startValue.slice(5).replace("-", "/")}–${endValue.slice(5).replace("-", "/")}`}</span></button>;
    })}</div> : null}
    {draft.period === "MONTH" ? <div className="analytics-period-grid">{Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentYear, index, 1); const start = `${currentYear}-${pad(index + 1)}-01`; const end = asValue(new Date(currentYear, index + 1, 0));
      return <button type="button" key={start} data-selected={draft.start === start} onClick={() => setDraft({ ...draft, start, end })}>{index + 1}月</button>;
    })}</div> : null}
    {draft.period === "YEAR" ? <div className="analytics-period-grid">{Array.from({ length: 8 }, (_, index) => currentYear - 3 + index).map((year) => <button type="button" key={year} data-selected={draft.start === `${year}-01-01`} onClick={() => setDraft({ ...draft, start: `${year}-01-01`, end: `${year}-12-31` })}>{year}年</button>)}</div> : null}
    <footer><button type="button" onClick={() => setDraft({ period: draft.period })}>清除</button><button type="button" onClick={apply} className="analytics-primary">应用时间</button></footer>
  </div>;
}
