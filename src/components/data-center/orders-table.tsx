"use client";

export type DataCenterOrder = {
  id: string; uploadedAt: string; city: string; bdName: string; merchantId: string; merchantName: string; platform: string;
  goodsTotal: number; merchantSettlementAmount: number; userPaidAmount: number; merchantRate: number;
  upload: { recognitionStatus: string };
};

const money = (value: number) => `¥${Number(value ?? 0).toFixed(2)}`;
const statusText = (status: string) => status === "SUCCEEDED" ? "已识别" : status === "FAILED" ? "识别失败" : status === "PENDING" ? "待识别" : status;

export function OrdersTable({ orders, loading, canEdit, onOpen }: { orders: DataCenterOrder[]; loading: boolean; canEdit: (order: DataCenterOrder) => boolean; onOpen: (order: DataCenterOrder) => void }) {
  if (loading) return <div className="workspace-data-state" data-state="loading"><span className="workspace-data-state-icon" /><div><h2>正在载入订单</h2><p>正在按当前筛选条件整理数据。</p></div></div>;
  if (!orders.length) return <div className="workspace-data-state" data-state="empty"><span className="workspace-data-state-icon" /><div><h2>暂无符合条件的订单</h2><p>调整筛选条件，或先完成一组美团和 B 家截图采集。</p></div></div>;
  return <>
    <div className="data-orders-desktop"><table><thead><tr><th>采集时间</th><th>商家 / 城市</th><th>BD</th><th>平台</th><th>商品总价</th><th>用户实付</th><th>结算金额</th><th>状态</th><th><span className="sr-only">操作</span></th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.id}><td>{new Date(order.uploadedAt).toLocaleString("zh-CN", { hour12: false })}</td><td><strong>{order.merchantName}</strong><small>{order.merchantId} · {order.city}</small></td><td>{order.bdName}</td><td><span className={`data-platform-badge ${order.platform === "MEITUAN" ? "meituan" : "bjia"}`}>{order.platform === "MEITUAN" ? "美团" : "B家"}</span></td><td>{money(order.goodsTotal)}</td><td>{money(order.userPaidAmount)}</td><td>{money(order.merchantSettlementAmount)}</td><td><span className="data-status-pill" data-status={order.upload.recognitionStatus}>{statusText(order.upload.recognitionStatus)}</span></td><td><button type="button" className="data-row-action" onClick={() => onOpen(order)}>{canEdit(order) ? "查看 / 修改" : "查看"}</button></td></tr>)}</tbody>
    </table></div>
    <div className="data-orders-mobile">{orders.map((order) => <button type="button" className="data-order-mobile-card" key={order.id} onClick={() => onOpen(order)}><span className={`data-platform-badge ${order.platform === "MEITUAN" ? "meituan" : "bjia"}`}>{order.platform === "MEITUAN" ? "美团" : "B家"}</span><strong>{order.merchantName}</strong><small>{order.city} · {order.bdName} · {new Date(order.uploadedAt).toLocaleDateString("zh-CN")}</small><span><b>用户实付</b>{money(order.userPaidAmount)}</span></button>)}</div>
  </>;
}
