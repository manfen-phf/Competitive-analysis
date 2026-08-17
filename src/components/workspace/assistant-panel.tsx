import Link from "next/link";

export function WorkspaceAssistant() {
  return <div className="assistant-panel collection-guide">
    <header><div><p>{"\u91c7\u96c6\u6307\u5f15"}</p><span>{"\u6bcf\u4e00\u7ec4\u5546\u5bb6\u6570\u636e\u53ea\u9700\u4e09\u6b65"}</span></div></header>
    <section className="assistant-intro"><strong>{"1. \u9009\u62e9\u5546\u5bb6\uff0c\u4e0a\u4f20\u7f8e\u56e2\u4e0e B \u5bb6\u622a\u56fe"}</strong><p>{"\u622a\u56fe\u5c06\u4f5c\u4e3a\u5f85\u8bc6\u522b\u8bb0\u5f55\u4fdd\u5b58\uff0c\u4e0d\u9700\u624b\u5de5\u586b\u5199\u8ba2\u5355\u6570\u636e\u3002"}</p></section>
    <div className="assistant-cues">
      <Link href="/collect"><b>{"2. \u8bc6\u522b\u5e76\u786e\u8ba4"}</b><span>{"\u4ec5\u5728 AI \u672a\u80fd\u786e\u5b9a\u65f6\u8865\u5145\u6216\u4fee\u6b63\u5b57\u6bb5\u3002"}</span></Link>
      <Link href="/dashboard"><b>{"3. \u67e5\u770b\u5bf9\u6bd4\u5206\u6790"}</b><span>{"\u6309\u5546\u5bb6\u3001\u57ce\u5e02\u3001BD \u67e5\u770b\u5df2\u786e\u8ba4\u6570\u636e\u3002"}</span></Link>
      <Link href="/records"><b>{"\u7ba1\u7406\u8bc6\u522b\u6570\u636e"}</b><span>{"\u7b5b\u9009\u3001\u590d\u6838\u3001\u67e5\u770b\u539f\u56fe\u5e76\u5bfc\u51fa\u3002"}</span></Link>
    </div>
  </div>;
}
