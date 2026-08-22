import type { MetricKey } from "@/lib/analytics";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  tone?: "neutral" | "meituan" | "bjia" | "outcome";
  outcome?: "good" | "risk" | "neutral";
  metric?: MetricKey;
};

export function MetricCard({ label, value, description, tone = "neutral", outcome = "neutral", metric }: MetricCardProps) {
  return <article className="analytics-metric-card" data-tone={tone} data-outcome={outcome} data-metric={metric}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{description}</small>
  </article>;
}
