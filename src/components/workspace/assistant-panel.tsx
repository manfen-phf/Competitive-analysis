import Link from "next/link";

export function WorkspaceAssistant() {
  return <div className="assistant-panel">
    <header><div><p>AI 协作</p><span>定价分析助手</span></div><button type="button" aria-label="查看协作历史">↻</button></header>
    <section className="assistant-intro"><strong>早上好！我是你的 AI 分析师。</strong><p>完成一组双平台订单采集后，这里会根据已确认数据提示价差与覆盖情况。</p><time>实时数据</time></section>
    <div className="assistant-cues">
      <Link href="/dashboard"><b>分析竞争价格力</b><span>查看美团与 B 家的已确认数据对比 →</span></Link>
      <Link href="/health"><b>查看采集完成情况</b><span>按上传、识别与确认状态跟进 →</span></Link>
      <Link href="/upload"><b>补充订单证据</b><span>开始一组商家双平台采集 →</span></Link>
    </div>
    <div className="assistant-composer"><span>选择下一步工作…</span><Link href="/dashboard" aria-label="打开分析页面">↗</Link></div>
  </div>;
}
