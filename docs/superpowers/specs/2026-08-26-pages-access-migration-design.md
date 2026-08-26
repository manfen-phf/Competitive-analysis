# Cloudflare Pages 国内访问入口迁移设计

## 目标

让“外卖竞争态势分析”以 Cloudflare Pages 作为用户访问入口，同时保持现有的 D1、R2、千问识别、账号权限和业务数据不变。现有 Worker 保留为回退入口，直到 Pages 版本完成真实验收。

## 范围

本迁移只处理部署承载与接口运行边界：

- 新建独立 Pages 项目 `gx-food-delivery-competition-web`。
- 将用户浏览器访问的页面发布至 Pages。
- 将现有 `/api/*` 业务接口迁移为 Pages Functions，同域提供登录、主数据、采集、图片读取、千问识别、分析和导出。
- Pages Functions 绑定同一个 D1 数据库与 R2 Bucket，并使用同一套 Qwen 和会话密钥。
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
  ├─ 静态 React 界面（登录、首页、采集、分析、数据中心、管理）
  └─ Pages Functions: /api/*
       ├─ D1：用户、商家、采集、订单、分析数据
       ├─ R2：截图原图
       └─ 千问：图片识别

保留：Cloudflare Worker gx-food-delivery-competition（仅作回退）
```

Pages 采用静态前端加同域 Functions，而不是把完整的 Next.js SSR 直接发布到 Pages。原因是现有项目的服务端页面和 API 路由依赖 Workers 运行时；切分后，浏览器不会再直接请求 `workers.dev`，会话 Cookie 也始终留在 Pages 的同一访问域名。

## 组件边界

### 静态前端

- 页面改为客户端读取 `/api/auth/me` 判断登录态与角色。
- 页面访问权限不再由 Next 服务端 `redirect()` 决定，而由统一客户端守卫展示“登录 / 无权限 / 页面内容”。
- 页面所需数据继续只调用相对路径 `/api/*`，不写入 Worker 域名。

### Pages Functions

- 每个现有 `/api/*` 路由对应一个 Function 入口；业务规则抽离到共享服务层。
- 共享服务层负责会话、角色校验、D1 查询、R2 存取、Qwen 调用、Excel 解析与导出。
- Function 只负责编排 HTTP 请求、响应和绑定环境，不重复业务规则。

### 环境与密钥

Pages 项目绑定：

- `DB` → `gx-food-delivery-competition-db`
- `SCREENSHOTS` → `gx-food-delivery-competition-images`
- 密钥 → `QWEN_API_KEY`、`BD_SESSION_SECRET`、管理员导入/首次账号初始化所需密钥。

禁止把任何密码、Token、API Key 写入 Git、前端构建产物或公开页面。

## 发布步骤与回退

1. 在本地创建 Pages 专用构建与 Functions 适配层。
2. 用本地 Functions 模式验证登录、D1 读取、R2 读写和接口权限。
3. 部署到新 Pages 项目的预览地址，不接触正式 Worker。
4. 配置 Pages 的 D1/R2 绑定及密钥；验证预览站点的管理员登录、BD 登录、主数据读取、成对图片上传、识别结果保存、分析与导出。
5. 通过后，将 Pages 生产域名交给用户在国内网络测试；确认后再绑定用户自有域名。
6. 任何异常时，用户仍可使用现有 Worker URL；不需要数据回滚，因为两端使用同一 D1/R2。

## 失败处理与验收

- 未登录请求必须返回 401；越权角色必须返回 403。
- 上传失败不得创建“已确认订单”；R2 上传失败要返回明确错误。
- 识别失败写入失败记录，不影响已有数据。
- 新 Pages 站点必须验证：管理员登录、BD 登录、主数据导入、双平台上传、D1 写入、R2 原图读取、筛选分析、导出。
- PC 与手机各完成一次核心采集路径验证。
- 生产 Pages 域名必须由用户在无 VPN 国内网络实际打开；该结果决定是否切换正式入口。

## 风险

- Pages 在用户网络可访问不等于所有城市、运营商永久可用，因此不会提前下线 Worker。
- 把完整 Next.js 服务端页改为静态页面，会改变认证守卫的实现位置；必须以 API 权限作为最终安全边界，不能只依赖前端隐藏。
- 新的 Pages 项目需要重新录入密钥和资源绑定；此操作仅在用户已登录 Cloudflare 后执行。
