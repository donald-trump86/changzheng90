# 四渡赤水：结尾影像与阅读动效

2026-10-22。实现基准：`a6108d0af8291f62791e64b83cf5743bb8d82865`。权威仓库：`/Users/jasondai/changzheng90`。

## 用户要求与设计决定

用户在最终内容确认时选择继续修改，具体要求是：去掉右上党徽旁直接解释其身份的可见文字；不设置“作者解读”部分；在结束处加入历史图片；增加路线以外的动画。本轮已有明确修改授权，直接实现，延续现有 split-stage 方向，不增加设计确认环节。Pages 与 DNS 仍未获最终内容确认。

- 删除党徽 figure 的可见图注，保留标准原图、尺寸、无障碍 alt、静态展示和来源说明。党徽及其祖先不做动画，不用作主页链接、favicon 或纪念卡标识。
- 删除四章 insight、尾声 reflection 及其全部显示、副本和“作者解读”说明；同步移除数据字段与绑定。不得把这些观点换个标题混入历史正文。章节日期、局势、行动、结果、方向、渡口和来源，以及尾声历史正文、两个问题与答案均保持原文。
- 结尾增加“回望长征”影像段落，置于尾声的问答、纪念卡之后、最终 footer 之前。它是同一叙事的结束，不增加第六章，不把后续长征素材当作四渡赤水现场照。采用开放的图片编排，桌面可有宽窄节奏，手机单列；不使用通用卡片边框、自动轮播或会隐藏正文的滚动舞台。
- 只编写一份静态语义图库，放在 noscript 后面；JS 初始化时移至交互页的 footer 前，由现有 epilogue 状态管理显示。无 JS 时图库自然跟随全文；缺少观察器、暂停或减少动态时图片和图注完整显示。
- 保留小标题、地图优先、各渡一条连续路径、原生点击定位整张地图后 1900ms 绘制、随路径移动的绘制头、完成后的箭头、重播与导航取消。不得给地图/路线祖先加位移动画。

## 选定素材

所有文件说明页由控制器使用专用静音 Brave 实际读取，HTTP 200；原图已经下载到忽略目录 `artifacts/history-research/` 并实际查看。没有使用生成图片。图片的原始摄影与后来的展陈拍摄必须分清。

1. `long-march-gathering.jpg`，585×310；短图注“红军集会 · 1930年代”。来源 https://commons.wikimedia.org/wiki/File:Long-march.jpg 。文件页描述为一名共产党干部对集会者讲话，摄影者未详，日期仅标 1930s；不得补造具体年份、地点、人物。页标 PD-China 和美国公有领域依据（1996 年原属国已进入公有领域）。许可说明链接 https://commons.wikimedia.org/wiki/Template:PD-China 和 https://commons.wikimedia.org/wiki/Template:PD-1996 。原图 https://upload.wikimedia.org/wikipedia/commons/4/49/Long-march.jpg ，71,686 bytes，SHA-256 `dcc1807e93537afdd8bc02978996cd52410a11e8e3009d50be9c68a01569ec8c`。
2. `sixth-army-1935.jpg`，698×357；短图注“红六军团在湖南新化 · 1935年11月29日”。来源 https://commons.wikimedia.org/wiki/File:Hongerliujuntuan.jpg 。未知摄影者，来源为《中国人民解放军历史资料丛书·红军长征 图片》，解放军出版社，1993。文件页标 PD-China，许可说明 https://commons.wikimedia.org/wiki/Template:PD-China 。明确是红六军团领导人合影，不冒充中央红军四渡现场照。原图 https://upload.wikimedia.org/wikipedia/commons/6/68/Hongerliujuntuan.jpg ，128,640 bytes，SHA-256 `ee2238bfcdf45a50af86302091cb9799de73b40e647b0cc99b51a9dc781e049f`。
3. `luding-bridge-museum.jpg`，原图4752×3168；短图注“泸定桥影像 · 四川博物院展陈，2010年摄”。来源 https://commons.wikimedia.org/wiki/File:Long_March_Through_Sichuan_Luding_Bridge_(9958483594).jpg 。Gary Todd，2010-04-25 12:31；这是博物馆中桥梁影像的翻拍，原影像年代未详，不写成1935年现场摄影。文件页为摄影作 CC0 1.0，且有 Flickr 许可复核记录；许可 https://creativecommons.org/publicdomain/zero/1.0/ 。原图 https://upload.wikimedia.org/wikipedia/commons/f/f2/Long_March_Through_Sichuan_Luding_Bridge_%289958483594%29.jpg ，3,034,200 bytes，SHA-256 `38a07f7c8c844a98c145520df6b52f520d68b3e58eebb57b467714ab7d5c97fd`。
4. `luding-chain-museum.jpg`，原图4752×3168；短图注“泸定桥铁索 · 四川博物院藏，2010年摄”。来源 https://commons.wikimedia.org/wiki/File:Long_March_Through_Sichuan_Chain_from_Luding_Bridge_(9958484584).jpg 。Gary Todd，2010-04-25 12:30；实物展陈照片，不写成战时现场照。文件页作 CC0 1.0 声明，且有 Flickr 许可复核；许可同上。原图 https://upload.wikimedia.org/wikipedia/commons/5/58/Long_March_Through_Sichuan_Chain_from_Luding_Bridge_%289958484584%29.jpg ，2,705,521 bytes，SHA-256 `cd22108d5c90e5b0621ba7b65fe69dde7907651a1e6334acd9ee028904b6966f`。

前两张原样复制至 `public/history/`。后两张为网页加载优化，用系统已有 sips 缩至1280像素宽，等比、完整、不裁切，JPEG质量80；在素材文档记录处理、产物尺寸、字节与散列。若工具不可用，先报告，不安装依赖。所有页面资源本地加载，禁止热链。主图设置真实 width/height、alt 和 lazy loading。图库的“影像出处”details 为四张图逐项给出摄影者/年代/原始出版信息、文件说明页和明确许可标注/链接；不将某地区公有领域标注扩大成全球授权。

排除：文件名 Long_march_Mao.jpg 实际说明为1947年转战陕北，不能用于表现长征；不采用来源含混的 Red-together 拼图和未注明具体场景的 Red Army 2。原音乐、党徽许可与署名保持。

## 新增动效

沿用 `body[data-motion]` 与系统 reduced-motion 为唯一开关。静态基态 opacity=1、完整内容。动效服务于阅读，不动画党徽、地点文字、图注、按钮或地图几何祖先。

- 开场文字和每次章节切换的日期/标题/局势轻微有限入场；展开后行动/结果分别进入。幅度约6–10px，240–400ms，快速切换取消旧视觉状态，不积累计时器。
- 河流可加独立的缓慢流光层，位于路线组外，仅作水面环境动态；不是第二条行军路线，不能改变单路径语义、路线布局和绘制头坐标。
- 四幅照片在进入视口时各作一次轻微缓入/推近，约500–800ms，图注与许可链接保持静止；图库在可视前不消失、不被盖住。使用 IntersectionObserver 时必须是增强，缺失也有完整静态图。
- 暂停/系统减少动态后所有新增 CSS 动画和过渡停止，地图完整，图片完全可见，不能留下半透明、偏移或未揭开的状态；重新开启动画不能自行重播路线。音频仍独立、默认关闭。

## 验收与边界

Node≥22，无新增运行时或开发依赖；构建精确白名单扩至16个文件。现有 server 已支持 image/jpeg，无需改动它。测试应覆盖实际仓库前缀请求、JPEG MIME、原资源范围与路径边界。

沿用320/390/768/1440四宽度的现有实际操作验证，加入图库完整解码、图注/来源/许可、整页无作者解读、党徽无可见图注，以及新动效确实推进并能暂停/减少动态。无脚本沙盒检查真实 noscript 全文和同一份图库。原15组的路线、导航、问答、对话框、音乐、PNG证据保留；可增加独立 gallery 阶段以免单次 MCP 超时。控制器独占专用 Brave；工作者和审查者不启动浏览器、CDP 或客户端。截图只存既定 `/tmp/dsh-browser-output/brave-agent`，不重试已拒绝的工作区截图路径。真实微信、内地网络、听感、线上 TLS 均未实测。

实现和针对实际 QA 的修复由工作者完成，控制器做实际浏览器观察；最后独立只读 diff 审查，不重复无理由全套测试。源码正常推送现有 GitHub main，交付新的静态 ZIP和本地预览；不启用 Pages 或变更 DNS。
