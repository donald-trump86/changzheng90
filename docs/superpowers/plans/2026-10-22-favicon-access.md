# Favicon 与接入诊断 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. 当前技能目录不提供这些名称，不调用缺失技能；使用原生受限子代理与控制器核对。步骤使用复选框记录。

**Goal:** 按用户本轮反馈交付一个清晰、有赤水意象的艺术favicon，并据实际状态说明Cloudflare证书和大陆访问改进方案。

**Architecture:** 图标与接入调查独立推进。图标保持本地SVG、16文件构建与现有界面不变，只增加缓存版本。接入调查只读当前专用DNS、边缘证书/加密模式和网络路径，待具体方案获明确选择后再变更托管或代理。

**Tech Stack:** 现有Node≥22、无新增依赖；SVG、Brave MCP；现有gh/cf CLI。

**Spec:** 本文下列设计与边界，依据用户m03222直接修订请求；不再要求重复确认旧版本发布。

## Design and file structure

- 现有绿色河道favicon是旧视觉，重画为“赤水朱印”：不规则朱砂印面与留白河道，从河道转折和山峡切面取形。不能用字母、数字、星徽、党徽、阴影/渐变和细碎线条凑装饰。16/32px仍应有明确轮廓；深浅浏览器栏均可辨。
- `public/favicon.svg`：原创静态图形，透明外部空间，无脚本/动画/外链；背景朱红、河道米白，必要时少量金色，不改变页面主体。
- `index.html:9`：仅图标href追加`?v=red-river-2`，相对路径保持不变，避免旧浏览器缓存。
- 私有预览函数和报告放`.superpowers/sdd/2026-10-22-chishui-h5/`，可交付的图标预览/备选放忽略的`artifacts/`；浏览器截图只能写专用`/tmp/dsh-browser-output/brave-agent`。
- 接入调查结果放同一私有任务目录；最终源码文档按实际决定更新。

## Global constraints

- 历史正文、四图/音频/党徽、地图与控件、PNG导出不修改；无个人署名，党徽不作favicon。
- 不增加依赖，不启动新服务/浏览器/代理，不改系统代理、浏览器安全策略或读取profile/凭据。
- 控制器独占默认静音Brave。只读代理不得再委派，不直接部署或改DNS/区域设置。
- `curl --noproxy '*'`只能排除环境HTTP代理，不能据此宣称绕过TUN、处于中国大陆出口或覆盖所有运营商。
- Cloudflare边缘证书、Origin CA证书、GitHub回源证书必须分清；不建议把Origin CA当公开浏览器证书。现有站点HTTP可用，不能删域名/改全局SSL去试错。
- 既有Pages发布授权保留；新托管迁移/代理方式尚未明确选择，只在方案具体后问一次。证书和大陆性能不作未实测保证。

## Task 1: favicon最小修订

- [ ] 读取指定源码/brief后只改SVG和图标href；自评旧版对照、16/32/64px深浅背景；提交自包含报告，代理不浏览器、不提交Git。
- [ ] 控制器审查SVG和自包含预览表达式，使用现有Brave实际渲染检查。
- [ ] 运行一次`node --test --test-name-pattern='built HTML assets and recursive module imports resolve over HTTP under a repository prefix' tests/site.test.js`（自带build）。不为此写镜像测试，不重跑22组和17组完整验收。
- [ ] 补充实际版本query GET/MIME/SVG解析检查；源与dist图标相同，仍16文件。最小正常提交和已授权站点更新，或与用户选定迁移一起发布。

## Task 2: 证书和访问诊断

- [ ] 子代理仅通过现有CLI的help和精确GET读取专用CNAME、当前zone SSL模式、已发行边缘证书是否覆盖该主机；不列无关项目/记录，不读取或输出token/私钥。
- [ ] 控制器分别请求普通路径与`--noproxy '*'`路径，记录状态/时序/代理环境布尔量与DNS地址类别。失败只解释当前网络，不推广为全国性结论。
- [ ] 必要时读取官方Cloudflare资料，引用实际读过内容；验证墙/不可重试错误按工作区规则停止，不绕过。
- [ ] 比较仅代理GitHub Pages、Cloudflare直接静态托管、面向大陆的国内/香港方案；说明费用/备案/运维及不能保证大陆稳定。
- [ ] 提供推荐与可执行的变更范围后，取得一次具体选择；若仍只是问题咨询则不擅自改DNS或全球SSL。

## Review focus

图标缩小是否成一团；缓存版本是否真的请求新SVG；是否误动源站内容；CF Strict与尚未签发的GitHub证书是否会产生526；是否把代理/TUN差异当中国大陆实测；是否把免费全球Cloudflare等同中国大陆CDN。

## 本轮执行选择与已完成检查

用户明确选择“先启用 Cloudflare 代理（推荐）”，并采用右侧新图标。本轮只把现有专用 CNAME 的 `proxied` 改为 `true`，保留 GitHub Pages 源站、TTL、其他 DNS 和原有区域 `full` 模式；不创建新的托管项目。Cloudflare 已有覆盖一级子域名的 active Universal SSL 证书。

实际16/32/64/128px、深浅背景共16样本已在专用Brave渲染检查；图标查询版本为 `red-river-2`。唯一指定prefix测试通过，自带一次16文件构建；版本query GET 200、`image/svg+xml`、源/dist字节相同。实际应用页面读取了新href，浏览器解码SVG成功。本轮没有重跑22/17完整旧验收，也没有将其冒充新证据。

读取CF Pages完整帮助后发现本机beta CLI的该命令写明“not deployed by cf”；故命令名称存在不代表静态生产上传链可用。直接托管保留为后续候选，不影响本轮已选的一条记录代理修复。大陆网络效果仍需真实无代理环境测试。
