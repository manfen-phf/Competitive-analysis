# Task 6 — 已确认订单竞争分析台：实施报告

## 交付范围

- 新增受会话角色约束的 `GET /api/analytics`、筛选项与商家查询链路。
- 分析查询仅纳入 `CONFIRMED` 采集任务下的订单记录；BD 额外受当前生效商家分配约束。
- 新增按日 / 自然周 / 月 / 年的自定义时间选择器（没有使用原生日期输入）；2026 年 1 月 1 日至 4 日为 W1，1 月 5 日起为 W2。
- 新增城市、BD、商家、指标筛选，四张 KPI、双平台趋势、可点击指标矩阵和商家差异排行。
- 使用固定平台语义：美团 `#FFC300`、B家 `#2F7DFF`；绿/红只表达数值结果的有利/风险状态。
- 修正筛选组件状态：桌面端打开日期选择器不会再同时打开移动端筛选抽屉；移动端只会在“应用筛选”后提交草稿条件。

## 权限结果

- `SUPER_ADMIN` 与 `CITY_ADMIN` 可读取全量分析范围。
- `BD` 只能读取与其会话中的 `city + bdName` 一致的数据；手工传入其他城市或 BD 参数会被 API 拒绝。
- 对真实 D1 数据，BD 还会被当前生效的 `MerchantAssignment` 限制，避免仅依靠前端筛选条件扩大范围。
- 筛选项和商家列表使用同一会话范围，不能通过手写参数绕过。

## TDD 与自动验证

先新增 `tests/unit/analytics-permissions.test.ts`，初始运行时因 `filterOrdersForUser`、`periodLabel` 尚未实现而失败；实现后以下命令通过：

```text
pnpm test tests/unit/analytics.test.ts tests/unit/analytics-permissions.test.ts tests/unit/demo-data.test.ts

Test Files  3 passed (3)
Tests       7 passed (7)
```

覆盖内容：

- BD 不能读其他城市或其他 BD 的记录。
- 城市管理员、超级管理员的读取范围。
- 自然周 W1 / W2 切分。
- 指标汇总、矩阵差异、双平台商家排行。
- 演示数据的成对结构。

`pnpm exec tsc --noEmit` 未产生本任务的新诊断；仍存在两个开始本任务前已有的错误：

```text
src/lib/auth.ts(118,5): TS2322 Type 'string' is not assignable to type 'AppRole'.
tests/unit/master-data.test.ts(10,12): TS2532 Object is possibly 'undefined'.
```

## 浏览器验收状态

已用本地浏览器打开 `http://localhost:3000/dashboard`：未登录访问按预期重定向到 `/login?next=/dashboard`，且没有控制台错误或警告。

完整的登录后桌面 / 平板 / 手机视觉验收没有执行：当前没有已授权的本地登录会话；按浏览器安全规则，不能自行创建或输入测试账户凭据。随后尝试直接打开本地分析 API 也被浏览器客户端拦截（`ERR_BLOCKED_BY_CLIENT`），未到达应用。此项需要在有非敏感的已登录本地会话或用户逐次授权创建/使用临时 QA 账户后补做；在补做之前不应宣称视觉验收完成。

## 未执行项

- 没有部署、发布或修改 Cloudflare 资源。
- 没有引入新云平台或扩大业务功能。
