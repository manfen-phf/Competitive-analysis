import Link from "next/link";
import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { navItemsFor } from "@/components/workspace/navigation";
import { redirect } from "next/navigation";

const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;

export default async function Home() {
  let user;
  try { user = await requireWorkspaceUser(ALL); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/" : "/login?error=forbidden"); }
  return <main><header><h1>广西外卖竞争态势分析看板</h1><nav>{navItemsFor(user).filter((item) => item.href !== "/").map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav></header><section className="hero"><h2>商家维度的价格力分析</h2><p>运营人员上传订单截图，系统自动识别美团与 B家数据，管理层按城市、BD 和商家查看竞争差异。</p><Link className="primary" href="/upload">开始上传截图</Link></section><section className="grid"><article><h3>严格识别</h3><p>字段缺失、金额异常或重复订单将自动拦截，不进入看板。</p></article><article><h3>商家与 BD 归属</h3><p>城市联动商家搜索，按上传时间自动匹配当时负责 BD。</p></article><article><h3>价格构成对比</h3><p>用户实付、红包、配送费和商家结算金额按每单平均值比较。</p></article></section></main>;
}
