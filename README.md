# 长征路上，四渡赤水

纪念长征胜利90周年的静态数字历史博物馆。首页从“赤水河，为什么要渡四次？”进入，沿长征时间线、四次渡河的局势与行动、历史照片和后续历程连续阅读。

四章随原生滚动更新当前渡次与地图，也可通过章节导航直达。桌面地图随阅读保持可见，窄屏地图放在当前章节之后；支持区域总览、渡河细看、全部路线和路线重播。地图区分现代地点参照、概略渡河区域与行军概括线，不表示1935年精确轨迹。九溪口仅说明与太平渡的相对关系；高程底图来自90点粗采样，不能当作90米分辨率地形复原。

页面使用一幅生成河谷艺术示意与两张历史照片。图注说明照片年代和适用范围，点击可查看完整原图并缩放。配乐默认关闭，显式开启后，第1—2章使用 Scott Buckley《Undertow》，第3—4章使用《The Great Sea》，均按 CC BY 4.0 署名。暂停、音量、页面隐藏后的停止行为由独立音频控制器管理。

公开入口：[changzheng90.luvch1nabest.me](https://changzheng90.luvch1nabest.me/)。源码：[donald-trump86/changzheng90](https://github.com/donald-trump86/changzheng90)。入口地址不代表当前工作树已发布，发布与验证状态分别见[部署说明](docs/deployment.md)和[验证记录](docs/verification.md)。

## 本地预览与构建

需要 Node.js 22 或更高版本与 npm；项目没有 npm 依赖，无需安装依赖。

```sh
npm run dev
```

在浏览器打开 `http://127.0.0.1:4173/`，按 Ctrl+C 关闭自己启动的预览。ES modules 需要通过 HTTP 加载。

```sh
npm test
npm run build
PORT=4174 npm run dev -- --root dist
```

最后一条命令在 `http://127.0.0.1:4174/` 预览构建结果。构建按显式白名单复制资源到 `dist/`，包含根目录 `CNAME` 与 `.nojekyll`；相对资源路径支持仓库子路径部署。测试会使用自己的临时 HTTP 监听器并在结束时清理。

## 当前实现

| 文件 | 职责 |
| --- | --- |
| [index.html](index.html) | 连续叙事、章节导航、地图接线、图片缩放对话框与音频控件 |
| [story.js](src/story.js) | 四章事实、来源、历史分期与时间线数据 |
| [history-scroll.js](src/history-scroll.js) | 按阅读线选择章节，处理反向滚动与手动定位 |
| [historical-map-data.js](src/historical-map-data.js)、[historical-map.js](src/historical-map.js)、[historical-map.css](src/historical-map.css) | 地理来源、地图渲染、视图与路线状态 |
| [editorial-motion.js](src/editorial-motion.js)、[editorial-motion.css](src/editorial-motion.css) | 入场、路线描绘、阅读进度、暂停与减少动态 |
| [print-atlas.css](src/print-atlas.css) | 博物馆版式、字体与纸墨视觉 |
| [audio.js](src/audio.js) | 显式开启、分章切曲、交叉淡化、音量与生命周期 |
| [音频版权页](audio-credits.html) | 曲目、作者、来源、许可与使用说明 |
| [构建脚本](scripts/build.mjs)、[预览服务器](scripts/serve.mjs) | 白名单部署、HTTP 类型、Range 与路径边界 |

历史正文在 HTML 中直接可读，无脚本时四章完整展开。动画是渐进增强；字体失败可使用系统后备字体。脚本、样式、图片、字体和音频随站点同源托管，无统计、账号或上传接口。外部链接用于读者主动查看史料与许可。

## 来源与维护

历史叙述的出处和事实边界见[史料说明](docs/sources.md)；图片、地图、字体和第三方库的归属见[素材清单](docs/assets.md)；音乐完整署名与核验记录见[音频授权](docs/audio-rights.md)。本作品不代表史料发布机构制作、授权或背书。

当前版本完整 Node 测试 **61/61通过**，构建输出 **25个静态文件**。320／390／768／844短横屏／1440五尺寸浏览器检查、图片缩放与焦点、滚动模块失败降级、无脚本正文及真实静音音频播放通过。验证范围与限制见[验证记录](docs/verification.md)。
