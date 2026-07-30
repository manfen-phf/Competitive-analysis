# Cloudflare 部署与截图存储调整

## 目标

在不订阅 Cloudflare R2 的前提下，使商家竞争态势分析工具可部署为全栈 Next.js 应用，并保留截图上传、Agnes 识别和分析看板能力。

## 决策

应用继续使用 Cloudflare Workers + OpenNext 部署，不使用 Cloudflare Pages 的静态导出路径。截图与元数据统一保存在现有 D1 数据库中。

## 存储设计

- `Upload` 增加 `imageData`（二进制）与 `imageMimeType` 字段。
- 图片写入前验证 PNG、JPEG 或 WebP，且字节数不得超过 1.8MB，为 D1 单行 2MB 上限预留元数据空间。
- 上传时先创建记录、写入图片二进制，再将带令牌的内部图片地址传给 Agnes。
- 图片读取接口从 D1 读取二进制，并继续校验上传令牌；不公开原始图片 URL。
- 识别、去重与失败记录规则保持不变。

## 部署设计

- 删除 Workers 配置中的 R2 绑定，保留既有 D1 绑定和迁移。
- Cloudflare Git 构建在 Linux 环境中生成 OpenNext Workers 产物，规避本机 Windows 符号链接限制。
- 部署后设置 Agnes API Key 与主数据导入口令为 Workers Secrets；应用 URL 由请求来源动态生成，不再依赖静态公网地址变量。

## 验收

- 无 R2 订阅或 R2 存储桶。
- 小于等于 1.8MB 的截图可保存、可经令牌读取并进入识别流程。
- 大于限制的截图被拒绝且不生成有效订单。
- 单元测试与生产构建通过；Cloudflare 远程 D1 迁移可执行。
