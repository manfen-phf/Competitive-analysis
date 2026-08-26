# Cloudflare Pages 国内访问入口

本项目的国内访问入口使用 Cloudflare Pages 转发到既有 Worker。浏览器访问 Pages 域名；业务代码、D1、R2、千问和会话仍运行在原 Worker 上。

## 固定上游

Pages 仅允许转发至：

`https://gx-food-delivery-competition.136010028.workers.dev`

这不是通用代理。不得把上游改为其他网址，也不复制 D1、R2、千问或会话密钥到 Pages。

## 首次配置

1. 在 Cloudflare Pages 创建项目：`gx-food-delivery-competition-web`。
2. 在项目的 **Settings → Variables and Secrets** 新建加密变量：
   - 名称：`UPSTREAM_ORIGIN`
   - 值：`https://gx-food-delivery-competition.136010028.workers.dev`
   - 环境：Production 和 Preview。
3. 在已登录 Cloudflare 的开发环境执行：

   ```bash
   bash scripts/deploy-pages-proxy.sh
   ```

部署脚本只会发布 `pages-public` 与 `cloudflare-pages/functions`，不会发布或修改现有 Worker。

## 验收顺序

在返回的 `*.pages.dev` 地址完成以下检查：

1. 打开 `/login`，确认能看到登录页。
2. 使用已创建的管理员账号登录，确认首页能加载。
3. 以 BD 账号登录，确认仅显示所属商家。
4. 创建一项采集，分别上传美团和 B 家截图，确认原图与识别结果可读取。
5. 在分析和数据中心检查 D1 已有数据，确认导出仍按角色范围限制。
6. 在无 VPN 的国内网络打开 Pages 生产地址，完成第 1、2 步的真实访问验证。

完成前，不要切换或关闭现有 Worker 地址。

## 自定义域名

确认 Pages 域名在国内可用后，在 Cloudflare Pages 项目 **Custom domains** 添加你的域名。将域名 DNS 按页面提示接入 Pages，等待证书签发后，再重复“验收顺序”的第 1、2 步。

自定义域名不会改变数据库、截图或千问配置；它们仍由原 Worker 使用。

## 回退

如果 Pages 域名或自定义域名出现问题，移除该域名在 Pages 项目的绑定即可。原 Worker、D1 和 R2 没有被改动，仍可作为回退入口。
