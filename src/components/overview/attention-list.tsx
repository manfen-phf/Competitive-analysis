import type { OverviewSnapshot } from "@/lib/overview";

function signedMoney(value: number) { return `${value > 0 ? "+" : ""}¥${value.toFixed(2)}`; }

export function AttentionList({ merchants }: { merchants: OverviewSnapshot["attentionMerchants"] }) {
  return <section className="overview-panel" aria-labelledby="attention-merchants-title">
    <header><div><p>需要关注</p><h2 id="attention-merchants-title">用户实付差异最大商家</h2></div><span>美团 − B家</span></header>
    {merchants.length ? <ol className="overview-attention-list">{merchants.map((merchant) => <li key={merchant.merchantId}>
      <div><strong>{merchant.merchantName}</strong><small>{merchant.city} · {merchant.bdName}</small></div>
      <b data-outcome="neutral">{signedMoney(merchant.userPaidGap)}</b>
    </li>)}</ol> : <p className="overview-empty">同一商家完成美团与 B家采集后，才会在这里显示可比较的差异。</p>}
  </section>;
}
