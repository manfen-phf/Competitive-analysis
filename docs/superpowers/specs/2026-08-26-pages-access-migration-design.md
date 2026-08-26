# Cloudflare Pages 国内访问入口迁移设计

## 目标

让“外卖竞争态势分析”以 Cloudflare Pages 作为用户访问入口，同时保持现有 Next.js Worker、D1、R2、千问识别、账号权限和业务数据不变。Pages 只负责受限入口转发；现有 Worker 继续承载业务，直到 Pages 入口完成真实验收。

## 范围

本迁移只处理部署承载与接口运行边界：

- 新建独立 Pages 项目 `gx-food-delivery-competition-web`。
- Pages 使用一个全路径 Function，将同一域名下的页面和 `/api/*` 请求转发到唯一固定的现有 Worker。
- 保留 Worker 中的登录、主数据、采集、图片读取、千问识别、分析和导出接口，不复制业务逻辑。
- Pages Function 不配置 D1、R2 或千问密钥；这些绑定和密钥继续只存在于 Worker。
- 保留现有 Workers 项目及其绑定、数据和密钥；本阶段不删除、不改名、不下线。
- 保留现有页面视觉和角色权限；不新增业务功能，不修改订单字段或数据模型。

明确不在本阶段处理：

- 不迁移到腾讯云、CloudBase、PostgreSQL 或其他平台。
- 不删除 `xuanchuan`、`bi-front-profit` 或改动它们的部署。
- 不清理历史 Git 脏文件或已有 Worker 版本。
- 不承诺 Pages 对所有中国网络永久可用；以用户所在城市的真实访问验证为上线标准。

## 架构

```text
浏览器
  │
  ▼
Cloudflare Pages: gx-food-delivery-competition-web
  └─ Functions catch-all（固定安全转发）
       └─ Cloudflare Worker: gx-food-delivery-competition
            ├─ Next.js 页面与 /api/*
            ├─ D1：用户、商家、采集、订单、分析数据
            ├─ R2：截图原图
            └─ 千问：图片识别
```

Pages 采用一个固定上游的同域转发 Function，而不是把完整的 Next.js SSR 直接发布到 Pages。原因是现有项目的服务端页面、API 路由与 Cloudflare 运行时已通过 Worker 验证；转发后，浏览器不会再直接请求 `workers.dev`，会话 Cookie 也始终留在 Pages 的同一访问域名。

## 组件边界

### Pages Functions

- 一个 catch-all Function 接受所有请求，并只能转发到配置中唯一允许的 Worker 上游域名。
- 转发保留原始路径、查询参数、HTTP 方法、请求体、Cookie 和必要响应头；删除目标端 Host 头，避免伪造上游主机。
- 上游返回的 `Set-Cookie` 原样返回给浏览器，使 Cookie 绑定在 Pages 域名；上游业务逻辑不感知域名变化。
- 非 HTTP(S) 上游、循环上游和未配置上游在部署前即拒绝；不会成为通用开放代理。

### 环境与密钥

Pages 项目只配置非公开的 `UPSTREAM_ORIGIN`，值为当前 Worker 的固定 HTTPS 域名。D1、R2、千问与会话密钥继续只在 Worker 项目上配置，避免在第二个运行环境复制敏感密钥。

禁止把任何密码、Token、API Key 或上游配置写入 Git、前端构建产物或公开页面。

## 发布步骤与回退

1. 创建 Pages 专用 catch-all Function 和 Pages 配置，不改现有 Worker 业务代码。
2. 用本地 Functions 模式验证路径、Cookie、方法和上游限制。
3. 部署到新 Pages 项目的预览地址，不接触正式 Worker。
4. 在 Pages 环境只配置 `UPSTREAM_ORIGIN`；验证预览站点的管理员登录、BD 登录、主数据读取、成对图片上传、识别结果保存、分析与导出。
5. 通过后，将 Pages 生产域名交给用户在国内网络测试；确认后再绑定用户自有域名。
6. 任何异常时，用户仍可使用现有 Worker URL；不需要数据回滚，因为两端使用同一 D1/R2。

## 失败处理与验收

- 未登录请求必须返回 401；越权角色必须返回 403。
- Pages 不能转发到未配置、非 HTTPS 或不同于固定上游的地址。
- 上传失败不得创建“已确认订单”；R2 上传失败要返回明确错误。
- 新 Pages 站点必须验证：管理员登录、BD 登录、主数据导入、双平台上传、D1 写入、R2 原图读取、筛选分析、导出。
- PC 与手机各完成一次核心采集路径验证。
- 生产 Pages 域名必须由用户在无 VPN 国内网络实际打开；该结果决定是否切换正式入口。

## 风险

- Pages 在用户网络可访问不等于所有城市、运营商永久可用，因此不会提前下线 Worker。
- Pages Function 到 Worker 的内部请求依赖 Cloudflare 网络可用性；若异常，用户可以直接使用保留的 Worker 入口。
- 新的 Pages 项目只需要录入固定上游域名；此操作仅在用户已登录 Cloudflare 后执行。
