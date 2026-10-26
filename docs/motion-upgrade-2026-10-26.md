# 2026-10-26 全站动效与交互升级验收

本轮沿用既有纸墨、朱红路线和木刻叙事，没有重新抽取设计方向或新增素材、字体、依赖。开篇入口改为「从长征读起」，定位长征背景标题，按完整顺序进入正文。

## 实现与取舍

- 主叙事保留 `initEditorialMotion({ root, reduced })` 和 pause / resume / destroy / mode，以及 Anime.js 4.5.0 与 rAF 双引擎；展区继续采用 WAAPI。
- 触屏保留温和入场、河流流动和当前渡口呼吸；首图视差仍限细指针。总览与分章均观察实际 SVG 图面，保留至少35%垂直可见的启动条件。
- 总览四路线按620ms、起点间隔460ms绘制，徽标420ms弹出。每条路线使用唯一临时 mask，保留二、三、四渡线型。编号的定位留在外层 SVG group，缩放只作用于内层，避免 CSS transform 覆盖原有 translate。
- 加入时间轴强调、后续行动横向错峰、声波、披露图标过渡；展区加入700ms触屏揭幕、刀痕、诗句、五组错峰、朱红线绘制和策略切换脉冲。
- 所有新增或修改的视觉动画仅使用 transform、opacity、stroke-dashoffset 或 SVG mask。策略路线换色即时落定，以 opacity 脉冲反馈；没有采用规格中与性能红线冲突的 stroke 颜色过渡。原地图相机的逐帧 viewBox 和字号／圆点补偿改成即时落定。
- reduce、off、forced-colors、后台、销毁与异常回退取消 actor、WAAPI、延迟工作并移除临时资源，恢复完整静态内容。减少动态不再执行淡入。
- 地点与渡口以点击、悬停、焦点及 Enter / Space 读取数据注释，离开、切章与隐藏目标恢复适当说明；隐藏地点退出 Tab 顺序。SVG交互节点保持可访问语义。
- 原图查看器放大后支持鼠标平移，双击切换适配／2×。关闭、复位、失败、销毁和捕获丢失均结束拖拽。保留原生触屏浏览。
- 窄屏章目与重播联动展开地图，宽屏隐藏重复小图；四渡区域增加左右键切章并避开表单和模态框；补齐四项 Open Graph 元数据。

## 实际验证

| 项目 | 结果 |
| --- | --- |
| 完整回归 | 最终 `npm test`：129通过，0失败、0取消、0跳过。覆盖路线时机、唯一mask、错峰时序、暂停／减少动态／强制颜色／销毁清理、展区WAAPI及原图手势等。 |
| 构建 | 最终 `npm run build`：55个白名单静态文件；`git diff --check`通过。 |
| 源码设计检查 | 7个本轮动效及交互 JS/CSS 经技能 lint：0 FAIL、0 WARN。 |
| 粗指针 | 同一专用Brave触屏模拟实测 coarse=true、fine=false、390px：总览四个唯一mask、700ms木刻揭幕、首句360ms与后三句480ms错峰、朱红线1100ms／220ms延迟、策略及后续横向接力均工作。观察的WAAPI关键帧属性均在允许范围内，无未捕获页面错误。 |
| 三种宽度 | 最终构建在1440×1000、768×844、390×844各拍摄开篇、总览、诗词、主题、尾声，共15张，全部逐张查看；均无整页横向溢出、透明标题正文或临时遮罩残留。 |
| 静态模式 | 运行中暂停、系统 reduce 和 forced-colors 均回到完整图文；强制颜色媒体变更送达后真实DOM中动画与临时mask均为0。单元测试验证媒体回调同步清理。 |
| 双引擎 | 浏览器阻断 Anime.js 文件，rAF仍生成四个mask并完成路线，结束后mask与隐藏徽标均为0，无未捕获页面错误。网络阻断日志为故障注入预期结果。 |
| 无脚本 | 在同一页面通过临时CSP禁止全部脚本，四章和四幅分章静态图完整存在，原图链接保留，透明正文与临时节点均为0；入口为原生 `#context-title` 锚点。脚本阻止日志为预期。 |
| 原图实测 | 双击进入2×后 pannable=true；拖动使scrollLeft与scrollTop均从0变为130；松开结束拖拽，双击返回适配，Escape关闭。 |
| 交互回归 | 地图注释恢复、窄屏地图展开、图例聚焦／指针联动和键盘切章均经实际页面操作及针对性测试。 |

独立 `inspect.mjs`／`scenes.mjs` 会额外启动浏览器，本轮按专用Brave约束使用同一任务的MCP测量与截图替代，未宣称自动检查器通过。没有真机、Safari、微信或运营商网络验证。没有重测配乐主观听感。

## 画面复核

ROUND 1 (final)
Seen in one second: 赤水河山木刻与「为什么要渡四次」共同建立历史叙事，入口指向完整长征背景。
Idea (one sentence): 四次转向成为阅读中逐段展开、可以对照考据的行军路线。
Live thing: 总览图例／编号联动，章节地图可读取地点注释，策略地图随阅读与选择响应。
Layout words by section: hero=河谷与提问 / overview=时间轴与路线对照 / verse=群山与诗句 / theme=深色人物木刻 / continuation=南下接力。
Scores: design 7.6 · usability 8.2 · creativity 7.4 · content 8.2 → overall 7.8 (人工主观复核，并非自动检查器评分)
Caps applied: 沿用现有设计，不为动效升级重新更换版式、字体、边线与史料图注；未运行独立视觉检查器。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 旧手机尾声的连续行军地点可能跨行拆开（motion-after-continuation-390.png）；已改为窄屏完整条目纵排，最终motion-final-continuation-390.png无拆词。
2. 原入口直接跳过长征与遵义背景（motion-before-390.png）；已改「从长征读起」，最终三种hero截图均对应新锚点。
3. 390px总览地名密度较高（motion-final-overview-390.png）；现有最小可读尺寸与完整图例保留，未发现新增重叠。进一步重绘地理构图留待专门的地图设计任务。

最终截图位于 `artifacts/motion-final-{hero,overview,verse,theme,continuation}-{1440,768,390}.png`，是本地验收产物，不进入站点部署包。
