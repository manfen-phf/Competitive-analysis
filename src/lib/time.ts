export type ReportPeriod = { year: number; weekKey: string };

export function getReportPeriod(date: Date): ReportPeriod {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const year = local.getFullYear();
  const start = new Date(year, 0, 1);
  const day = Math.floor((Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()) - Date.UTC(year, 0, 1)) / 86_400_000);
  const firstSundayOffset = (7 - start.getDay()) % 7;
  const week = day <= firstSundayOffset ? 1 : 2 + Math.floor((day - firstSundayOffset - 1) / 7);
  return { year, weekKey: `${year}-W${week}` };
}
