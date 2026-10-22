# 四渡赤水 · 为什么这样走

沿四次渡河，读懂中央红军如何从被动转向主动。读者先看局势，再展开概略路线，查看行动、结果和作者解读；尾声有两道理解题及本机生成的 PNG 纪念卡。文字整理、交互设计与示意图创作：戴诗旭。

## 本地预览

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
| [src/styles.css](src/styles.css) | 响应式排版、焦点和减少动态设置 |
| [public/favicon.svg](public/favicon.svg)、[public/CNAME](public/CNAME) | 原创站点图标和预定独立子域名 |
| [scripts/serve.mjs](scripts/serve.mjs)、[scripts/build.mjs](scripts/build.mjs) | Node 标准库预览服务器与白名单构建 |
| [tests/story.test.js](tests/story.test.js)、[tests/site.test.js](tests/site.test.js) | 内容、状态、包装及 HTTP 边界测试 |
| [scripts/verify-browser.mjs](scripts/verify-browser.mjs) | 交给控制器现有 Brave 页面的浏览器验收函数 |

## 内容与原创说明

历史叙述据[新华网所载《【镜头·长征路上】四渡赤水出奇兵》](https://www.news.cn/politics/2016-10/02/c_129309668.htm)及[中共中央党史和文献研究院网站所载《四渡赤水，以少胜多的光辉典范》](https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html)整理。核查记录见 [docs/sources.md](docs/sources.md)。本作品不代表这些机构制作、授权或背书。

地图、路线与图标为原创示意，帮助理解渡河方向和先后关系，不代表精确行军轨迹或真实地形。标为“作者解读”的文字是作者理解。日期和方向由共享数据提供；没有虚构对白或精确兵力。

所有站点脚本、样式、图形均在本地；使用系统字体，没有 CDN、外部字体、统计、账号或上传接口。纪念卡在设备内生成。下载受限时可用“打开图片”查看本机生成图，再长按保存；不同设备的中文字体和保存行为仍需实测。

## 验证与发布状态

[验证记录](docs/verification.md)区分已完成的 Node/HTTP 检查、控制器发回的初步页面观察，以及尚待执行的完整浏览器验收。真实微信和国内网络访问尚未测试。

[发布提案](docs/deployment.md)列出 GitHub Pages 和独立子域名的具体命令。公开仓库、推送、Pages 与 DNS 变更须待用户看过最终内容并确认后再执行。当前仅完成本地准备。
