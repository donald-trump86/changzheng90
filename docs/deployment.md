# 当前站点部署与维护

公开入口为 [https://changzheng90.luvch1nabest.me/](https://changzheng90.luvch1nabest.me/)，源码仓库为 [donald-trump86/changzheng90](https://github.com/donald-trump86/changzheng90)。源码维护于 `main`，GitHub Pages 使用 `gh-pages` 分支根目录，自定义域名由 Cloudflare 代理至 GitHub Pages。

本文件描述当前发布方式。当前站点产物已推送至 `gh-pages`，部署提交为 `7c0437dd7ea3dc763f818bda1cd41a0c7e581dee`；GitHub Pages 构建状态为 `built`（22.007秒，无错误，完成于2026-10-24 16:59:25，Asia/Shanghai）。本次发布修复首屏标题对比度及五节点时间线排版，源码修复提交为 `6a4414e4d3509e0dde73ff03be46ee21e72ca1d7`。此前通过专用Brave访问自定义域名时收到 Cloudflare「Just a moment...」403验证页，本轮未重试该验证页；普通用户页面响应尚未由此环境确认，GitHub Pages侧构建与发布提交已核对通过。

## 构建与本地检查

```sh
npm test
npm run build
PORT=4174 npm run dev -- --root dist
```

[构建脚本](../scripts/build.mjs)只复制显式允许的站点文件，输出到 `dist/`。[域名文件](../public/CNAME)在构建根目录映射为 `CNAME`，并生成空的 `.nojekyll`。根首页、音频版权页和运行资源使用相对路径。文档、研究材料、测试与临时产物不应进入部署包。

修改构建白名单时同步检查实际 HTML、CSS 和模块依赖，确认部署资源可通过仓库子路径读取、MIME 正确、字节一致。当前构建输出34个文件，检查结果见[验证记录](verification.md)。

## 更新现有站点

1. 确认当前差异、目标仓库和分支，完成与改动相符的测试及构建。
2. 正常快进推送源码到现有 `origin/main`。
3. 基于远端 `gh-pages` 历史建立独立工作副本，只同步经过核对的构建产物，正常推送站点分支。
4. 核对 Pages 构建对应提交，再检查公开首页和关键资源。保留专用域名，不将整个源码树发布为站点。

不得以本地构建成功推断线上已更新。自动请求遇 Cloudflare 验证页时，应将结果记录为未完成访问验证，不重复绕过挑战，也不将验证页的响应当作产品正常页面。

## 验证边界

当前文档不宣称已完成本轮线上 DNS、TLS、运营商网络或真实微信设备检查。Cloudflare 边缘 HTTPS 与 GitHub 回源证书是不同链路，需要分别核对；不从入口可达推断所有设备和网络均可使用。

后续真实设备检查应记录设备、网络与版本，覆盖连续阅读、正反滚动、地图视图、照片缩放、键盘焦点、默认静音和手动音频播放。仅改文档时无需重复完整浏览器测试；运行时、素材或部署清单有变化时，应执行相应验证。
