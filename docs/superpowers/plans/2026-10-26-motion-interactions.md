# 全站动效与交互升级实施计划

**Goal:** 按本轮规格扩展现有数字历史博物馆的动效与交互，保持静态阅读、公共接口与无障碍。

**Architecture:** 保留 editorial-motion.js 的 Anime.js / rAF 双引擎和可取消 actor；mao-exhibition.js 继续使用 WAAPI。路线用临时 SVG mask 保留线型；所有临时资源纳入现有生命周期清理。

**Tech Stack:** 原生 ES modules、CSS、SVG、WAAPI、Anime.js 4.5.0、Node 22+。

**Spec:** 本轮用户完整规格；下述处理解决规格内部冲突。

## 全局约束与实现取舍

- 公共导出和返回接口保持兼容，不引入依赖。
- 新增或修改的视觉动效只写 transform、opacity、stroke-dashoffset 或 SVG mask；策略换色即时更新，仅 opacity 过渡。
- reduce / off / settle / destroy / failStatic 取消全部动画与延迟工作，撤除临时层，恢复完整内容；reduce 不再淡入。
- 继续用真实 SVG 至少 35% 可见的规则启动分章路线，首次总览也观察实际 SVG，避免图注提前触发。
- 开篇入口采用「从长征读起」定位 context-title，保留正文顺序与素材。
- 不重新抽取整站视觉方向：这次沿用已存在的纸墨、木刻、史料地图方向，仅调整动效和交互。
- 浏览器仅用专用 Brave MCP；技能 inspector 的独立浏览器启动与用户浏览器约束冲突，以 MCP 测量、截图和交互检查替代。

## Review Focus

- 各引擎中途暂停、系统 reduce 和销毁均不能遗留遮罩或内联半透明文字。
- 多条路线的遮罩 ID 不能冲突，也不能改写原始虚线型。
- 粗指针慢滚不能在图面尚不可见时消耗首次路线播放。
- 地图指针、键盘焦点、触屏点击的说明状态，以及章节切换后的默认说明。
- 查看器捕获指针丢失、关闭、重置、销毁后不能继续拖拽或吞掉触屏滚动。

## 任务

- [x] 主叙事：唯一 mask ID；总览 620ms / 460ms 编排和 420ms 徽标；移动端入场、时间轴 6px 强调、后续 140ms 横向接力、河流和渡口呼吸；统一静态清理。测试 tests/chapter-route-motion.test.js 与 focused fixture。
- [x] 展区：compact 揭幕、刀痕、逐句诗词、五组错峰、朱红线、策略脉冲；清理与异常回退。测试 tests/exhibition.test.js。
- [x] 交互：地图地点考据和键盘语义、原图鼠标拖拽和双击；index 的键盘切章、窄屏展开、OG 与阅读入口；CSS focus / reduce / forced-colors。
- [x] 全量 npm test / npm run build；Brave 在 1440、768、390 验证动效和静态、无脚本与动画库失败降级；截图对比并记录结果。
- [x] 根据既有长征 H5 授权提交、推送并验证根首页部署。发布提交 ba48d9d，Pages built；公开根页200且22资源引用一致，独立资源字节请求受Cloudflare1010限制。
