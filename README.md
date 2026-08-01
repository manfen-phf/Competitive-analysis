# 广西外卖竞争态势分析看板（初版）

面向一线运营上传订单截图、管理层查看价格竞争态势的内部工具。

## 已完成

- 商家主数据导入：支持标准列，也支持现有“外卖组织结构 / 商家ID / 商家名称 / 合作BD”数据源。
- 上传选择链路：城市 → 商家搜索/选择；服务端按上传时间校验有效 BD 归属。
- 严格入库规则：字段缺失、低置信度、配送费金额关系异常、重复截图或重复订单均不进入看板。
- 看板筛选：日、周、月、年粒度；自定义起止日期；城市、BD、商家筛选。
- 美团与 B家每单平均的用户实付、平台红包、实付配送费、商家结算及差异，以及同商家双平台的价格差异排名。

## 第一次运行

1. 将 `.env.example` 复制为 `.env`，至少设置 `ADMIN_IMPORT_PASSCODE`；启用实际图片识别时设置 `AGNES_API_KEY`。
2. 执行 `pnpm exec prisma db push`。
3. 执行 `pnpm dev`，打开 `http://localhost:3000`。
4. 到“主数据导入”页面导入 Excel。若当前日更数据没有“生效开始日”列，填写本次导入的生效开始日即可。

## 当前待接入项

真实订单截图识别服务使用 Agnes 2.0 Flash。Agnes 通过应用当前的公网请求地址读取带令牌保护的截图；截图存入 PostgreSQL，不需要 R2。单张 PNG、JPG 或 WebP 截图不得超过 1.8MB。未配置 `AGNES_API_KEY` 时上传会明确失败，不会写入订单数据。

## CloudBase PostgreSQL 部署

CloudBase 环境变量需要设置：DATABASE_URL、AGNES_API_KEY、ADMIN_IMPORT_PASSCODE。容器启动时会执行 pnpm prisma migrate deploy，仅应用仓库内的 PostgreSQL 迁移，随后启动网站。请使用腾讯云 PostgreSQL 的内网连接地址，并为应用数据库创建独立账号。
