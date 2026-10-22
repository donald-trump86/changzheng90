# GitHub Pages 发布记录与维护

2026-10-22，用户确认将最终版本发布到专用域名，供其他人测试。公开测试链接为 **[http://changzheng90.luvch1nabest.me/](http://changzheng90.luvch1nabest.me/)**。HTTP已可访问；HTTPS证书尚未就绪，当前不强制跳转。不得跳过证书校验，也不要将尚未通过的公开浏览器检查写成成功。

## 实际发布结果

| 项目 | 结果 |
| --- | --- |
| 源码 | [donald-trump86/changzheng90](https://github.com/donald-trump86/changzheng90)，`main`；本地独立仓库 `~/changzheng90`，远端 `origin` |
| 已审运行时 | `6e56dbe693662ee631d3b871c0b07d0446c88d4b`；后续提交仅同步验收与发布文档 |
| 站点分支 | `gh-pages`，根提交 `2c7ed89b171dd96236c7d39c89b39983b82bbffd`，只含16个构建文件 |
| Pages来源 | `gh-pages` 根目录 `/`，公开、legacy构建，状态 `built` |
| 首次构建 | `1305395930`，错误消息为空 |
| 自定义域名 | `changzheng90.luvch1nabest.me` |
| DNS | 专用CNAME → `donald-trump86.github.io`，TTL 1，`proxied: false` |
| HTTPS | 严格证书校验暂报域名不匹配；`https_enforced: false`，等待GitHub证书可用 |

站点分支从独立的本地临时仓库正常推送，没有切换源码工作树、强制推送或把文档及私有验收材料发布到站点。16文件包括HTML、五个模块、样式、原创图标、标准党徽、音频、四张JPEG，以及根目录[CNAME](../public/CNAME)与 `.nojekyll`。

GitHub在收到站点分支后已自动启用正确的Pages来源；创建接口返回409后，控制器读取并核对了已有配置，没有覆盖。DNS生效后又通过首次显式域名PUT确认同一域名。源码分支与站点分支各自保留正常历史。

Cloudflare区域 `luvch1nabest.me` 的ID为 `0c40b3634891e2ac5d69cf5040e0fc56`。创建前再次查询专用域名得到 `[]`，随后只创建该CNAME并回读确认，没有修改根域、其他记录或区域配置。该“无记录”结果已成为历史，后续不得据此重复创建。

## 公开验证

HTTP主页返回200，实际内容与已审构建一致。除两个部署控制文件外的14个公开资源均已逐个GET并核对字节数和SHA-256；模块、样式、SVG、JPEG均提供对应类型。MP3的响应类型为GitHub Pages提供的 `audio/mp3`，文件哈希与原文件相同；`bytes=0-63` 返回206和正确的64字节。最初检查只接受 `audio/mpeg`，因此该单项被验证脚本判为失败；这是已记录的类型别名差异，未因此更改产品或重发音频。

公开HTTP的专用Brave检查未完成：首个完整验收调用因页面导航导致执行上下文销毁，恢复关闭后的一次原生导航返回 `net::ERR_BLOCKED_BY_CLIENT`。控制器按生命周期恢复并释放浏览器，没有修改安全设置或继续刷新。公开浏览器、真实微信及国内实际网络结果不能由HTTP哈希或本地结果代替。

[验证记录](verification.md)中的22/22 Node和六阶段17/17 Brave结果适用于同一运行时的本地构建。HTTPS目前仍严格校验证书，尚未声称就绪；GitHub DNS健康接口返回202，表示检查尚在处理。

## 状态复查与启用HTTPS

以下都是对现有站点的核对，不重新创建仓库、Pages或DNS：

```sh
git status --short
git remote get-url origin
git ls-remote origin refs/heads/main refs/heads/gh-pages
gh api repos/donald-trump86/changzheng90/pages
gh api repos/donald-trump86/changzheng90/pages/builds/latest
dig +short CNAME changzheng90.luvch1nabest.me
cf dns records list --zone 0c40b3634891e2ac5d69cf5040e0fc56 --name changzheng90.luvch1nabest.me --type CNAME
curl --fail --head https://changzheng90.luvch1nabest.me/
```

仅在目标域名证书有效、HTTPS主页和资源都可正常读取后，才启用强制HTTPS；不要使用跳过校验的选项，也不要为了触发证书而删除当前可用域名。

```sh
gh api --method PUT repos/donald-trump86/changzheng90/pages -F https_enforced=true
gh api repos/donald-trump86/changzheng90/pages
curl --head http://changzheng90.luvch1nabest.me/
curl --fail --head https://changzheng90.luvch1nabest.me/
```

确认HTTP跳转到同一域名的HTTPS，且证书校验与公开内容均通过，再把测试链接更新为HTTPS。若仍未签发，保留当前HTTP服务并如实记录；不循环移除和重加域名、不改浏览器策略。

## 后续内容更新

先由用户确认新的最终内容，再正常快进推送源码到 `origin/main`。需要重新发布时，基于远端现有 `gh-pages` 历史另建独立工作副本，将新的[构建白名单](../scripts/build.mjs)产物放入站点根目录，核对变更与目标后提交并正常推送；不得创建无关远端、强推或把整个源码树作为站点。

代码未改变时复用已有测试和构建证据；文档更新不需要重跑整套浏览器或Node测试。若运行时或素材改变，应执行与修改相应的验证。保留专用域名[CNAME](../public/CNAME)，不要覆盖现有DNS；任何新增所有权TXT或其他名称的修改均应先记录具体要求并取得相应授权。

公开后仍需在实际手机微信及国内网络检查首屏、四章导航、照片、音乐、来源对话框和图片保存，并记录设备、网络与结果。
