# 四渡赤水 · 为什么这样走

沿四次渡河，读懂中央红军如何从被动转向主动。读者先看局势，再展开概略路线，查看行动、结果和作者解读；尾声有两道理解题及本机生成的 PNG 纪念卡。

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
| [public/favicon.svg](public/favicon.svg)、[public/CNAME](public/CNAME) | 原创站点图标和预定独立子域名 |
| [scripts/serve.mjs](scripts/serve.mjs)、[scripts/build.mjs](scripts/build.mjs) | Node 标准库预览服务器与白名单构建 |
| [tests/story.test.js](tests/story.test.js)、[tests/site.test.js](tests/site.test.js) | 内容、状态、包装及 HTTP 边界测试 |
| [scripts/verify-browser.mjs](scripts/verify-browser.mjs) | 交给控制器现有 Brave 页面的浏览器验收函数 |

## 内容与原创说明

历史叙述据[新华网所载《【镜头·长征路上】四渡赤水出奇兵》](https://www.news.cn/politics/2016-10/02/c_129309668.htm)及[中共中央党史和文献研究院网站所载《四渡赤水，以少胜多的光辉典范》](https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html)整理。核查记录见 [docs/sources.md](docs/sources.md)。本作品不代表这些机构制作、授权或背书。

地图、路线、山川场景与站点图标为原创示意，帮助理解渡河方向和先后关系，不代表精确行军轨迹或真实地形。标为“作者解读”的文字是作者理解。日期和方向由共享数据提供；没有虚构对白或精确兵力。

页面采用紧凑红金开场，桌面地图随阅读保持可见，手机点击“展开路线”后先把整张地图带入视口，再用约1.9秒从起点绘制至终点。每渡只有一条连续路线，展开后可点击“重播路线”。静态标准党徽保留明确图注；站点图标与纪念卡不使用党徽。暂停动画或系统减少动态时立即显示完整静态终态。音乐初始关闭，只有单独点击才播放；切到后台自动暂停，返回后需重新点击。

《国际歌》采用 MuseScore 数字器乐复刻录音，作曲 Pierre de Geyter，Realmartcraft 上传并将该音频以 CC0 1.0 发布。音频和标准党徽的来源、许可、原始下载地址、大小与哈希见 [素材清单](docs/assets.md)。录音许可由具体音频文件页核实，不仅依据曲调属于公版。

所有站点脚本、样式、图形和音乐均在本地；使用系统字体，没有 CDN、外部字体、统计、账号或上传接口。纪念卡在设备内生成。下载受限时可用“打开图片”查看本机生成图，再长按保存；不同设备的中文字体和保存行为仍需实测。

## 验证与发布状态

[验证记录](docs/verification.md)分开记录本轮与历史版本。本轮产品实现 `cf328a6` 的完整 Node 套件 **21/21** 通过；控制器使用 `bcc222c` 验收函数分五阶段完成 **15/15个不同检查**，普通错误和媒体取消均为0。20次实际绘制耗时约 **1882–1963ms**，采样时整张地图均在视口内；单一路径、重播、取消、暂停与减少动态，以及键盘、来源、PNG、音乐和无脚本检查均通过。

最终手机开场CSS `2773823` 另完成320／390／768／1440px的 **4/4封面与原生点击绘制专项复核**，320／390px阅读按钮分别为288×48和358×48px。CSS修正后均重建12个静态文件，没有重复完整Node或15组浏览器套件。控制器查看30张阶段截图及8张最终封面／绘制截图，未发现本次范围内的阻塞视觉问题；主观综合评分约8.0/10，仅代表截图判断。

音频始终静音验收，没有主观试听；后台暂停使用合成 `document.hidden` fixture。真实微信、国内网络、线上DNS和正式域名TLS尚未测试。本轮独立只读审查已通过：Spec PASS、Quality Approved，没有需修正的问题。

公开源码仓库已按用户要求创建并完成首次推送；GitHub Pages和DNS尚未执行，仍须用户看过最终内容并确认。[发布提案](docs/deployment.md)保留后续部署说明。
