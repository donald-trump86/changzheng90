# 四渡赤水 · 为什么这样走

沿四次渡河，读懂中央红军如何从被动转向主动。读者先看局势，再展开概略路线，查看行动与结果；尾声有两道理解题、本机生成的 PNG 纪念卡，以及四幅有出处的长征主题影像。

**在线体验：[https://changzheng90.luvch1nabest.me/](https://changzheng90.luvch1nabest.me/)**。入口通过Cloudflare代理，静态源站和源码仍在GitHub。

## 本地预览

当前本地仓库为 `~/changzheng90`，公开源码仓库为 [donald-trump86/changzheng90](https://github.com/donald-trump86/changzheng90)。在本地仓库根目录运行以下命令。

需要 Node.js 22 或更高版本与 npm。项目没有运行时或开发依赖，无需安装依赖。

```sh
npm run dev
```

在浏览器打开 `http://127.0.0.1:4173/`。按 Ctrl+C 关闭自己启动的预览。浏览器需通过 HTTP 读取 ES modules，直接双击 HTML 文件不属于支持的预览方式。

```sh
npm test
npm run build
PORT=4174 npm run dev -- --root dist
```

最后一条命令在 `http://127.0.0.1:4174/` 预览构建结果。构建只复制站点资源，输出的 `dist/` 含根目录 `CNAME` 和 `.nojekyll`，资源使用相对路径，可放在仓库子路径下。`npm test` 会构建一次，并用临时端口检查资源与 HTTP 边界；测试在 `finally` 中关闭自己的监听器、清理自己的临时目录。

## 文件分工

| 路径 | 用途 |
| --- | --- |
| [index.html](index.html) | 语义骨架、四章无脚本全文和来源对话框 |
| [src/story.js](src/story.js) | 章节日期、方向、叙事、来源、理解题和纯状态切换 |
| [src/main.js](src/main.js) | 可见界面、阅读导航、理解题和对话框 |
| [src/map.js](src/map.js) | 原创 SVG 山川和分章路线示意 |
| [src/share.js](src/share.js) | 本机生成 PNG 纪念卡 |
| [src/media.js](src/media.js) | 独立音乐与动画控制、系统减少动态与后台暂停 |
| [public/party-emblem.svg](public/party-emblem.svg)、[public/internationale.mp3](public/internationale.mp3) | 静态标准党徽与 CC0 数字器乐录音 |
| [src/styles.css](src/styles.css) | 响应式排版、焦点和减少动态设置 |
| [public/favicon.svg](public/favicon.svg)、[public/CNAME](public/CNAME) | 原创站点图标和专用子域名 |
| [scripts/serve.mjs](scripts/serve.mjs)、[scripts/build.mjs](scripts/build.mjs) | Node 标准库预览服务器与白名单构建 |
| [tests/story.test.js](tests/story.test.js)、[tests/site.test.js](tests/site.test.js) | 内容、状态、包装及 HTTP 边界测试 |
| [scripts/verify-browser.mjs](scripts/verify-browser.mjs) | 交给控制器现有 Brave 页面的浏览器验收函数 |

## 内容与原创说明

历史叙述据[新华网所载《【镜头·长征路上】四渡赤水出奇兵》](https://www.news.cn/politics/2016-10/02/c_129309668.htm)及[中共中央党史和文献研究院网站所载《四渡赤水，以少胜多的光辉典范》](https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html)整理。核查记录见 [docs/sources.md](docs/sources.md)。本作品不代表这些机构制作、授权或背书。

地图、路线、山川场景与站点图标为原创示意，帮助理解渡河方向和先后关系，不代表精确行军轨迹或真实地形。四章作者解读和尾声感想已完整移除，没有改名并入历史正文。日期和方向由共享数据提供；没有虚构对白或精确兵力。

页面采用紧凑红金开场，桌面地图随阅读保持可见，手机点击“展开路线”后先把整张地图带入视口，再用约1.9秒从起点绘制至终点。每渡只有一条连续路线，展开后可点击“重播路线”。标准党徽保留固定替代文字，作为静态图形展示，不再附可见身份图注；站点图标与纪念卡不使用党徽。标题正文有有限入场，河面流线独立于路线，照片只在进入视口时轻微显现。暂停动画或系统减少动态时立即显示完整静态终态。音乐初始关闭，只有单独点击才播放；切到后台自动暂停，返回后需重新点击。

尾声以四幅本地影像收束：1930年代红军集会、1935年11月29日红六军团领导人合影，以及Gary Todd于2010年拍摄的两幅四川博物院展陈照片。简短图注明确各自年代，“影像出处”提供逐图来源和许可；后两幅不作为1935年现场照片。图库按比例显示，未启用JavaScript也能阅读同一份图片与来源。

《国际歌》采用 MuseScore 数字器乐复刻录音，作曲 Pierre de Geyter，Realmartcraft 上传并将该音频以 CC0 1.0 发布。音频、标准党徽与四幅照片的来源、许可、大小、尺寸及哈希见[素材清单](docs/assets.md)。录音许可由具体音频文件页核实，不仅依据曲调属于公版。

所有站点脚本、样式、图形、照片和音乐均随站点同源托管；使用系统字体，没有第三方脚本或字体依赖、统计、账号或上传接口。纪念卡在设备内生成。下载受限时可用“打开图片”查看本机生成图，再长按保存；不同设备的中文字体和保存行为仍需实测。

## 验证与发布状态

[验证记录](docs/verification.md)把本轮与历史版本分开。本轮最终完整 Node 套件仅运行一次，**22/22**通过；构建输出**16个静态文件**，四张JPEG的实际文件、部署副本、仓库子路径HTTP与MIME检查均通过。7个JavaScript语法检查、验收表达式编译及未知阶段拒绝通过；非浏览器taste lint为0 FAIL、1个原有日期范围横线提示。

控制器已对产品提交 `6e56dbe` 完成六次串行浏览器验收：`gallery` 与390／768／1440／320各2组，`extras` 7组，汇总**17个不同实质组全部通过，应用错误0、媒体取消0**。这是六阶段合并覆盖。四宽度的实际图片解码与排版、无脚本图库、新动效推进及暂停／减少动态、原生路线绘制、键盘焦点、音频和PNG回归均通过。控制器另查看四宽首屏及390／1440px默认折叠图库截图，未发现需修正的视觉问题。PNG实际为213668bytes、1080×1440；音乐解码78秒，真实播放推进及暂停／错误重试通过。

本轮音频始终静音，没有主观听感评估；后台暂停使用合成 `document.hidden` fixture。真实手机设备／微信、内地网络，以及缺少IntersectionObserver时的浏览器降级路径尚未测试。本轮独立审查已完成：Spec PASS、Quality Approved，无产品问题；仅提出的非阻断文档状态清理已在本次同步。

源码在 `main` 分支维护，16文件构建发布到独立 `gh-pages` 分支。新“赤水朱印”favicon已发布，并用 `red-river-2` 版本参数更新缓存；16／32／64px深浅背景、实际SVG解码与聚焦包装测试1/1通过。这次小修没有重跑上述图库版本的完整22／17组验收。

公开链接现为 **[https://changzheng90.luvch1nabest.me/](https://changzheng90.luvch1nabest.me/)**。专用域名已启用Cloudflare代理，访客HTTPS使用其Google Trust Services边缘证书，严格TLS校验通过；区域原有Full回源模式未变。用户已反馈关闭代理后能正常进入，其他运营商与微信设备仍需测试。自动公开GET遇Cloudflare验证页，未记为200或浏览器通过。首次GitHub直连时的14资源哈希与音频范围验证属于历史证据。实际状态见[发布记录](docs/deployment.md)。
