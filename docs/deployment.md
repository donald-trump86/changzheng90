# GitHub Pages 发布记录与维护

2026-10-22，用户确认发布并在后续选择“Cloudflare代理＋新favicon”。当前测试链接为 **[https://changzheng90.luvch1nabest.me/](https://changzheng90.luvch1nabest.me/)**。用户已反馈关闭代理后能正常进入；这证明其当前网络可用，不代表所有大陆运营商或微信设备均已验证。

## 2026-10-22发布记录

| 项目 | 结果 |
| --- | --- |
| 源码 | [donald-trump86/changzheng90](https://github.com/donald-trump86/changzheng90)，`main`；本地独立仓库 `~/changzheng90`，远端 `origin` |
| 产品版本 | 图库运行时 `6e56dbe5e4653f2d5b05e46e3dfb9fa270e16dd2`；favicon更新 `b918f2ac26ee6f14e24978376356fbd4904d575f`，后续仅同步文档 |
| 站点分支 | `gh-pages`，当前产物提交 `58bf45844cf7e4161ef62c33d07d757f093073e3`，只含16个构建文件 |
| Pages来源 | `gh-pages` 根目录 `/`，公开、legacy构建；最新构建 `built`，commit与上述产物一致，错误为空 |
| 自定义域名 | `changzheng90.luvch1nabest.me` |
| DNS与入口 | 专用CNAME → `donald-trump86.github.io`，TTL 1，`proxied: true`；访客先到Cloudflare，再回源GitHub Pages |
| 访客HTTPS | Cloudflare Universal SSL，Google Trust Services签发，覆盖 `*.luvch1nabest.me`；实际严格TLS校验通过 |
| 回源TLS | 沿用区域原有 `full`，本轮未更改。Full使用TLS，但不作Full (strict)的源站证书有效性验证 |
| favicon | 原创“赤水朱印”SVG，291bytes；HTML使用 `public/favicon.svg?v=red-river-2` 更新缓存版本 |

16文件包括HTML、五个模块、样式、原创图标、标准党徽、音频、四张JPEG，以及根目录[CNAME](../public/CNAME)与 `.nojekyll`。发布从独立工作副本正常快进推送，没有强推、切换源码工作树，或将文档及私有验收材料发布到站点。

首次发布的站点提交为 `2c7ed89b171dd96236c7d39c89b39983b82bbffd`，首次构建 `1305395930` 已成功。GitHub在收到分支后自动启用正确来源；创建接口返回409后，控制器核对已有配置，没有覆盖。域名DNS生效后通过显式PUT确认了同一域名，源码与站点分支分别保留历史。

Cloudflare区域ID为 `0c40b3634891e2ac5d69cf5040e0fc56`。首次只创建了该专用CNAME，后来按用户选择把同一记录的 `proxied` 从false改为true，回读确认目标、TTL和记录身份未变。没有修改其他DNS记录或区域SSL模式。首次“无记录”的查询属于历史，不得据此重复创建。

## 公开验证

首次DNS直连GitHub时，HTTP主页及14个公开内容资源实际GET的字节数、SHA-256均与构建一致。MP3由GitHub提供 `audio/mp3`，哈希正确，`bytes=0-63` 返回206和64bytes；最初仅接受 `audio/mpeg` 的检查已作为类型别名差异记录。该批证据适用于首次发布，不是本次Cloudflare入口的全资源复验。

本次图标实际检查包括：16／32／64px深浅背景渲染与视觉查看、应用页面内SVG解码、仓库子路径GET及版本参数。构建仍为16文件；聚焦包装测试1/1通过，没有重跑与此小改无关的完整22组Node或17组浏览器验收。GitHub最新Pages构建已核对为 `58bf45844cf7e4161ef62c33d07d757f093073e3`；远端favicon内容与本地构建相同，SHA-256为 `807ac5d0f8e38234c366911b27251cbaea9e5229ef1ea28e4950b021c2c3c53f`，HTML版本参数也已匹配。

启用Cloudflare后，访客HTTPS严格TLS校验通过。自动公开GET返回403、`cf-mitigated: challenge`及“Just a moment...”验证页，控制器据此停止，没有绕过挑战、修改安全设置，或把该响应记为200。用户随后在自己的浏览器关闭代理测试，明确反馈能正常进入。这两份结果分别来自自动请求与本人浏览器，应同时保留。

本机存在Fake-IP路由，因此普通请求与清除环境代理后的请求不能作为两条独立大陆直连证据。此前公开Brave导航的 `net::ERR_BLOCKED_BY_CLIENT` 也未记为成功。当前仍缺少实际运营商、微信设备与全国网络覆盖证据；免费Cloudflare全球服务不等于中国大陆境内节点或稳定性保证。[验证记录](verification.md)另列本地功能验收的适用版本与限制。

## 状态复查与启用HTTPS

访客HTTPS现已由Cloudflare边缘提供。以下为现有站点的只读复查，不重新创建仓库、Pages或DNS：

```sh
git status --short
git remote get-url origin
git ls-remote origin refs/heads/main refs/heads/gh-pages
gh api repos/donald-trump86/changzheng90/pages
gh api repos/donald-trump86/changzheng90/pages/builds/latest
cf dns records list --zone 0c40b3634891e2ac5d69cf5040e0fc56 --name-exact changzheng90.luvch1nabest.me --type CNAME
curl --head --max-time 15 https://changzheng90.luvch1nabest.me/
```

保留默认的证书校验。若自动请求遇Cloudflare验证页，应停止重复请求并交本人浏览器确认，不能用忽略证书或绕过验证的结果宣称可用。

GitHub的 `https_enforced: false` 沿用原配置；Cloudflare边缘证书有效不证明GitHub的自定义域名证书已就绪。本轮没有改区域SSL模式、降级TLS或添加强制跳转规则。以后若需强制HTTP跳转，应针对该主机单独核对现有规则与授权，不能把区域所有站点一起改动。

## 2026-10-23根首页改版

用户明确要求将新版直接发布为 [域名根首页](https://changzheng90.luvch1nabest.me/)，不再以预览子目录作为交付入口。根目录 [index.html](../index.html) 采用已验证的三种阅读版式，默认“行军档案”，可切换“长征图录”“山河长卷”；图片仍按相对路径保存在 [design-study](../design-study/)。

构建仍为20个静态文件，本轮替换根HTML。未清权的两张BYU供图保留官方原文入口，不上传图片或研究上下文；来源与适用范围见 [图片说明](../design-study/README.md)。

本轮包装与HTTP检查9/9通过，明确验证访问 `/` 返回新版，仓库子路径下三图均返回200且类型、字节正确。首页样式和脚本与已验收样稿完全相同，复用此前390／1440px三版共6组浏览器证据；本次仅调整图片相对路径及首页标签，没有重复计作完整浏览器回归。DNS、Cloudflare代理和区域SSL保持既有配置。

## 后续内容更新

用户已授权的后续修改完成后，直接提交并正常快进推送源码到 `origin/main`，交付在线链接；仅在用户另行要求时提供压缩包。需要重新发布时，基于远端现有 `gh-pages` 历史另建独立工作副本，将新的[构建白名单](../scripts/build.mjs)产物放入站点根目录，核对变更与目标后提交并正常推送；不得创建无关远端、强推或把整个源码树作为站点。

代码未改变时复用已有测试和构建证据；文档更新不需要重跑整套浏览器或Node测试。运行时或素材变化应执行相应验证。保留专用域名[CNAME](../public/CNAME)与既有代理设置；新增所有权TXT、其他名称或区域配置的变更应先记录要求并取得相应授权。

后续真实手机／微信测试应记录设备、网络与结果，覆盖首屏、四章导航、历史照片、音乐、来源对话框和图片保存。用户当前网络的成功反馈不替代这些专项测试。
