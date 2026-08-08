# competitive-analysis — V1 技术基线

本仓库正在以 P0-0 为起点收敛到一条唯一的 V1 运行路线：

- Next.js / React：网站
- Cloudflare Workers：运行时与 API
- Cloudflare D1：结构化业务数据
- Cloudflare R2：订单原图
- 千问：后续 P0-3 的订单图识别服务
- xlsx：后续商家主数据导入与管理员导出

## 当前阶段

P0-0 只完成技术基线。旧 API 已全部置于 P0 验收门禁之后，不能再通过历史
PostgreSQL、CloudBase 或 Agnes 路径提供服务。它们保留在 Git 历史和 legacy
文件中，仅供参考，不是 V1 的运行实现。

后续阶段依次为：P0-1 商家主数据、P0-2 BD 采集、P0-3 千问识别、P0-4 竞对
分析、P0-5 采集统计、P0-6 管理员数据中心。

## 本地验证

```powershell
pnpm install
$env:DATABASE_URL = "file:./dev.db"
pnpm exec prisma validate
pnpm test
pnpm build
pnpm exec opennextjs-cloudflare build
```

## Cloudflare 配置

`wrangler.jsonc` 已声明：

- D1 binding：`DB` → `gx-food-delivery-competition-db`
- R2 binding：`SCREENSHOT_BUCKET` → `gx-food-delivery-competition-images`
- Worker entry：OpenNext 生成的 `.open-next/worker.js`

线上资源操作前，先登录并确认账号：

```powershell
pnpm exec wrangler login
pnpm exec wrangler whoami
```

若 R2 Bucket 尚未创建，可执行：

```powershell
pnpm exec wrangler r2 bucket create gx-food-delivery-competition-images
```

线上 D1 migration 与真实读写验证在账号登录后执行。请勿将 API Key、口令或
数据库密码写入 Git、README 或前端代码。
