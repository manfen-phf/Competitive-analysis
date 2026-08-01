# PostgreSQL 迁移设计

## 目标

让部署在腾讯云 CloudBase 的应用使用 PostgreSQL 持久化主数据、截图、识别结果和看板数据，同时保留既有页面、接口和字段定义。

## 方案

使用标准 Prisma PostgreSQL Client。移除运行时对 Cloudflare D1、OpenNext Cloudflare Context 与 D1 Adapter 的依赖；`getPrisma()` 只基于 CloudBase 注入的 `DATABASE_URL` 创建单例客户端。Prisma Schema 切换到 PostgreSQL，并为 CloudBase 生成独立的初始迁移 SQL。

## 数据与安全

现阶段腾讯云数据库为空，因此不做跨库数据复制。`DATABASE_URL`、`AGNES_API_KEY` 与 `ADMIN_IMPORT_PASSCODE` 仅存放在 CloudBase 环境变量中，不提交至仓库。没有 `DATABASE_URL` 时接口返回明确配置错误，而不是静默回落到本地 SQLite。

## 验证

新增连接配置测试；在本地使用临时 PostgreSQL URL 校验 Prisma Schema；运行既有单元测试及 `pnpm run build`。部署后通过 `/health` 和一次主数据导入验证。
