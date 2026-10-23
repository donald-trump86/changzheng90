# 本地素材清单

## 印刷图册新资源（2026-10-23）

| 生产文件 | 内容／来源 | bytes | SHA-256 |
| --- | --- | ---: | --- |
| [atlas-paper.png](../public/atlas-paper.png) | 原创384×384静态RGBA纸纤维，Python标准库生成，无历史图像内容 | 81926 | `f51ce5bb33e2a9f43a9920b66e019b30ede6dbc63790df073ed0ae2108174422` |
| [chishui-atlas-display.woff2](../public/fonts/chishui-atlas-display.woff2) | 朱雀仿宋v0.212重命名显示子集，内部family为ChishuiAtlasDisplay Regular | 176028 | `4730141ccd0b8deaad3da699137a1baa65619efd55215e8ff9967dd063afd0ea` |
| [ZHUQUE-OFL.txt](../public/fonts/ZHUQUE-OFL.txt) | 固定来源完整原始SIL OFL 1.1，未删改 | 4389 | `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043` |

纸纹由固定随机种子19350129产生低透明度颗粒与短纤维，PNG编码使用标准库struct/zlib；只作为静态材料平铺，不修改历史照片或原创河谷图字节。[图册样式](../src/print-atlas.css)为自写CSS，参考赫蹏的中文行距节律与Tufte图版/旁注关系，没有复制或部署整套第三方CSS。

字体固定至[TrionesType/zhuque v0.212](https://github.com/TrionesType/zhuque/releases/tag/v0.212)，提交`803217b9663d1c6e1402e91acc94e4f572713d73`。[原始发行ZIP](https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip)为5743932bytes，SHA-256为`bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062`；其中ZhuqueFangsong-Regular.ttf为8824084bytes，SHA-256为`558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4`。完整TTF、ZIP、FontTools与Brotli仅留ignored研究目录，不在28文件部署包中。

[固定版本原始许可](https://raw.githubusercontent.com/TrionesType/zhuque/803217b9663d1c6e1402e91acc94e4f572713d73/LICENSE.txt)实际声明为`Copyright (c) 2023, Zhejiang JadeFoci Techonology Co. LTD`及`https://www.jadefoci.com/`；嵌入字体的`Copyright 2023 JadeFoci`与原作者、厂商、许可记录保持。未以current-main README的2025年声明替换。衍生字体只做字符子集化、格式转换和内部名称更换，保留原字形与原有版权；OFL允许随软件修改、嵌入和分发，并要求保留完整版权与许可、字体继续以OFL授权，不单独售卖字体或暗示作者背书。发布版为技术预览，上游说明尚未达到正式发行质量，并请求第三方修改版不要在正式版本前大量传播；这些上游提示不等于额外的许可条款。

资产工作者使用隔离FontTools 4.67.0与Brotli 1.2.1，真实重开并解编产物全部表，核实内部family、原通知、597个Unicode／492个CJK覆盖与完整OFL字节；输入唯一不支持的是无需可见字形的换行控制字符。运行时只给题字、章名、时间与地图题签使用该字族，正文使用系统宋体；字体失败时系统后备继续显示文字。新的字体、PNG、CSS与OFL已通过真实仓库前缀GET、类型和原始字节回归；实际页面排字仍待控制器Brave。

核查与下载日期：2026-10-22。运行时只读取站点自己的相对路径，不热链、不请求第三方服务。本清单保留素材创作者、上传者与许可来源；作品界面和纪念卡不附个人署名。

## 标准金黄色中国共产党党徽

- 本地文件：[party-emblem.svg](../public/party-emblem.svg)。420 bytes，SHA-256：`3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3`。
- [Commons 文件说明](https://commons.wikimedia.org/wiki/File:Danghui_golden.svg)标注标准 2021 版与 PD-China；[原始 SVG](https://upload.wikimedia.org/wikipedia/commons/7/78/Danghui_golden.svg)。这是文件页的版权标注，不将其表述为任何使用场景的通用授权。
- 本地保留原始字节：`viewBox="1 1 32 32"`、`fill="#fdcf30"`、path 与 circle 均不改动。无脚本、外链、外部图片、动画或附加星形。控制器独立复核了下载的 420 bytes 图形结构。
- 开场仅静态展示标准图形，保留固定替代文字“中国共产党党徽”，去掉可见身份图注；保持等比例、金黄色与独立不透明背景。党徽及其祖先不参与动画，不作 favicon、操作控件或纪念卡装饰。站点自身图标仍为原创图形。

## 《国际歌》数字器乐录音

- 本地文件：[internationale.mp3](../public/internationale.mp3)。1,395,296 bytes，SHA-256：`49e8dedb6982ce8b4f8f4af6538970f2fde885d8f1dc70778f87f631bdbccc9c`。
- [Commons 文件说明与音频许可](https://commons.wikimedia.org/wiki/File:L%27internationale.ogg)；[实际下载的 Commons MP3 转码](https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6e/L%27internationale.ogg/L%27internationale.ogg.mp3)；[CC0 1.0 规范页](https://creativecommons.org/publicdomain/zero/1.0/)。下载后保持 MP3 原样，无裁剪、增益、重新编码或占位替代。
- 文件页说明：2023-04-16，以 MuseScore 和《Le Socialiste》报纸乐谱扫描作数字复刻；作曲 Pierre de Geyter；上传者 Realmartcraft。描述为数字器乐录音，不称真人钢琴演奏。
- 文件页在曲调公版说明之外，单独写有“I, the copyright holder of this work”并对该文件作 CC0 1.0 声明。录音采用依据是这一具体音频声明，不能仅由曲调公版推导所有演奏、录音或转码的权利。保留作曲、复刻方式、上传者和 CC0 来源作为自愿素材说明。
- Commons 原始 Ogg 页面显示约 1分19秒；本次实际 MP3 的控制器 `ffprobe` 结果为 MP3、44,100 Hz、双声道、78.000000 秒、1,395,296 bytes。MP3 时长使用实际文件结果。
- 控制器另用 `ffmpeg` 将整份文件解码到 null 输出，退出 0；`volumedetect` 为 mean -33.0 dB、max -16.7 dB。没有向宿主扬声器播放，没有声称试听或凭听感评价。音频本身偏轻，播放器保持默认音量 1，不叠加常见的 0.2/0.25 背景音量衰减。
- 溯源以 Commons 已核实的文件页为依据。链接中的 MuseScore 页面曾遇 403，未绕过，也不将其写成已读取的独立证据。
- 默认 `preload="none"`、关闭播放；单独点击音乐按钮后调用真实 HTMLAudio。播放不依赖“开始阅读”。支持暂停、加载失败后的明确重试；切到后台或 pagehide 时暂停，返回不自动续播。本轮控制器已在静音条件下验收真实解码、时间推进、暂停与失效音频后的重试；实现者未运行浏览器，未作主观听感评估。

## 四幅本地长征主题影像

本轮只复用控制器已下载、视觉检查并核对哈希的四份原图，没有重新联网、下载或生成替代图片。前两张保持原字节；后两张只用系统 `sips -Z 1280 -s formatOptions 80` 按比例缩小用于生产，无裁切。原始4752×3168缩至1280×853，整数像素产生约0.04%的比例舍入差。这里的尺寸、字节与SHA-256均由本地文件再次测得，页面解码与视觉效果已由控制器分六阶段实际验收完成，见[验证记录](verification.md)。

| 生产文件 | 尺寸 | bytes | SHA-256 |
| --- | --- | --- | --- |
| [long-march-gathering.jpg](../public/history/long-march-gathering.jpg) | 585×310 | 71686 | `dcc1807e93537afdd8bc02978996cd52410a11e8e3009d50be9c68a01569ec8c` |
| [sixth-army-1935.jpg](../public/history/sixth-army-1935.jpg) | 698×357 | 128640 | `ee2238bfcdf45a50af86302091cb9799de73b40e647b0cc99b51a9dc781e049f` |
| [luding-bridge-museum.jpg](../public/history/luding-bridge-museum.jpg) | 1280×853 | 253040 | `9055b4a386f3692686907b9f98db1685e0b4c2f6128a40a6a7b8a6bae961d257` |
| [luding-chain-museum.jpg](../public/history/luding-chain-museum.jpg) | 1280×853 | 182108 | `68150c8b6d5bb3cda6e5ff4689d9f6af2c128dac51989cb2c7adceb03560a5ac` |

生产图合计635474bytes。所有图片在HTML中声明宽高、替代文字与 `loading="lazy"`，保持自然比例，不用背景图裁切、不热链。四图同一份语义HTML在有脚本尾声与无脚本全文末尾共用；“影像出处”逐图列明以下信息。

- **红军集会**：[Long-march.jpg 文件页](https://commons.wikimedia.org/wiki/File:Long-march.jpg)。摄影者未详，1930年代，具体年份、地点与人物未详；文件页描述为一名共产党干部向集会者讲话。许可标签为[PD-China](https://commons.wikimedia.org/wiki/Template:PD-China)及[PD-US1996依据](https://commons.wikimedia.org/wiki/Template:PD-1996)。图注为“红军集会 · 1930年代”，不猜测人物或具体事件。[本地原图](../artifacts/history-research/long-march-gathering.jpg)的尺寸／字节／哈希与生产文件完全相同。
- **红六军团领导人合影**：[Hongerliujuntuan.jpg 文件页](https://commons.wikimedia.org/wiki/File:Hongerliujuntuan.jpg)。1935年11月29日摄于湖南新化，摄影者未详；原始出版来源《中国人民解放军历史资料丛书·红军长征 图片》，解放军出版社，1993年。文件页标注[PD-China](https://commons.wikimedia.org/wiki/Template:PD-China)。图注为“红六军团在湖南新化 · 1935年11月29日”，明确是红六军团。[本地原图](../artifacts/history-research/sixth-army-1935.jpg)的尺寸／字节／哈希与生产文件完全相同。
- **四川博物院泸定桥影像展陈**：[Luding Bridge 文件页](https://commons.wikimedia.org/wiki/File:Long_March_Through_Sichuan_Luding_Bridge_(9958483594).jpg)。Gary Todd于2010年4月25日12:31拍摄，是对馆内桥梁影像的翻拍；原影像年代未详。采用[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，文件页含Flickr许可复核记录。图注为“泸定桥影像 · 四川博物院展陈，2010年摄”。[本地原图](../artifacts/history-research/luding-bridge-museum.jpg)：4752×3168，3034200bytes，SHA-256 `38a07f7c8c844a98c145520df6b52f520d68b3e58eebb57b467714ab7d5c97fd`。
- **四川博物院泸定桥铁索实物**：[Chain from Luding Bridge 文件页](https://commons.wikimedia.org/wiki/File:Long_March_Through_Sichuan_Chain_from_Luding_Bridge_(9958484584).jpg)。Gary Todd于2010年4月25日12:30拍摄，记录馆内铁索实物。采用[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，文件页含Flickr许可复核记录。图注为“泸定桥铁索 · 四川博物院藏，2010年摄”。[本地原图](../artifacts/history-research/luding-chain-museum.jpg)：4752×3168，2705521bytes，SHA-256 `cd22108d5c90e5b0621ba7b65fe69dde7907651a1e6334acd9ee028904b6966f`。

两幅2010年照片明确称作博物馆展陈记录，不称1935年现场影像。照片出处和许可属于素材说明，正文历史叙述仍依据原有两篇官方来源。个人姓名不作为作品署名加入页面或纪念卡；Gary Todd等姓名仅用于真实素材创作者的来源说明。

## 原创本地图形

开场山川、云水、SVG 地图、路线、行军点与纪念卡均为代码绘制的原创概略图形，不表现为历史影像、真实地形或精确行军轨迹。金黄色党徽是上文单独标明来源的标准素材，不归入原创图形声明。正文史实依据仍见 [史料说明](sources.md)。

## 根首页阅读动效：Anime.js v4.5.0（2026-10-23）

本轮仅从 `juliangarnier/anime` 固定标签 `v4.5.0` 下载以下两个文件，使用 Python `urllib.request` 访问 `https://api.github.com/repos/juliangarnier/anime/contents/<path>?ref=v4.5.0`，将 contents JSON 的 base64 `content` 解码为原始文件字节。标签对应提交 `2c9cf8ea00329f6768c7d7902252ed977d75ce42`。无 npm 安装、CDN 或新增运行时外站请求；两个文件按原始字节随站点托管。

| 本地文件 | 上游固定来源 | raw bytes | SHA-256 | GitHub contents blob SHA／本地 `git hash-object` |
| --- | --- | ---: | --- | --- |
| [anime-4.5.0.esm.min.js](../public/vendor/anime-4.5.0.esm.min.js) | [dist/bundles/anime.esm.min.js @ v4.5.0](https://github.com/juliangarnier/anime/blob/v4.5.0/dist/bundles/anime.esm.min.js) | 118678 | `a19015a1a92d52025a2fb6703b6d67eadd1cc2aeaf880770e96e04cf6aa07be1` | `c278b15616623e2b32ef499bbb1020b181324d59` |
| [ANIME-LICENSE.txt](../public/vendor/ANIME-LICENSE.txt) | [LICENSE.md @ v4.5.0](https://github.com/juliangarnier/anime/blob/v4.5.0/LICENSE.md) | 1075 | `3f3e835a9952cfc2a6ca836fb95b3257c981f24fa3ef51249055acb09931897b` | `f999fa58ebdda6d8d0f3ae581ebdfe821f09603a` |

两项 GitHub blob SHA 均与本地 `git hash-object` 一致。MIT 许可完整保留，原文署名 `Copyright (c) 2025 Julian Garnier`；这是库的许可署名，不进入作品界面的个人署名。

[动效模块](../src/editorial-motion.js) 实际导入 `animate`、`stagger`，以库驱动的数值进度设置路线 stroke offset、移动头点、流线、原创图轻微漂移、分组入场和阅读进度。约1.8秒路线只在整图进入可见区域后启动，完成时才补上终点箭头。历史照片仅作透明度入场；本轮没有改动历史原图、原创图像文件或既有来源文字。

## 印刷图册新资源（2026-10-23）

标题、章名和地图题签使用自托管朱雀仿宋显示子集，内部字族为`ChishuiAtlasDisplay`。来源为[TrionesType/zhuque v0.212](https://github.com/TrionesType/zhuque/releases/tag/v0.212)，固定提交`803217b9663d1c6e1402e91acc94e4f572713d73`。它复刻1932年南宋印刷字型；本站只做显示字符子集与格式转换，未重新设计字形。正文仍有宋体/系统后备。

| 部署资源 | 字节 | SHA-256 |
| --- | ---: | --- |
| [显示字体](../public/fonts/chishui-atlas-display.woff2) | 176028 | `4730141ccd0b8deaad3da699137a1baa65619efd55215e8ff9967dd063afd0ea` |
| [完整OFL](../public/fonts/ZHUQUE-OFL.txt) | 4389 | `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043` |
| [原创纸纤维](../public/atlas-paper.png) | 81926 | `f51ce5bb33e2a9f43a9920b66e019b30ede6dbc63790df073ed0ae2108174422` |

官方ZIP为5743932字节，SHA-256`bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062`；其中原TTF8824084字节，SHA-256`558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4`。原TTF、ZIP和开发工具不部署。子集覆盖597个Unicode码点（492个CJK），仅针对当前页面与地图用字；后加文字可用后备字体，不能据此声称完整字库。

许可为[SIL OFL1.1固定原文](https://github.com/TrionesType/zhuque/blob/803217b9663d1c6e1402e91acc94e4f572713d73/LICENSE.txt)。标签中的实际版权为`Copyright (c) 2023, Zhejiang JadeFoci Techonology Co. LTD`，不是当前主分支README的2025文字。完整许可字节与原嵌入版权/许可记录保留，派生内部主名称改为ChishuiAtlasDisplay；Latin及符号来自Alegreya的Juan Pablo del Peral／Huerta Tipográfica，其原记录同样保留。

上游v0.212是技术预览版，并提示不适合直接用于生产，建议暂不大规模传播第三方修改。本站依OFL使用未改字形的小型子集；覆盖、文件完整性与本机浏览器加载已核实，不据此保证所有平台排印质量。显示字体失败时仍用后备字体完整阅读。

纸纤维由本项目用Python标准库生成，384×384 RGBA、种子19350129；低透明度纸面纹理，既不冒充历史纸张扫描，也不施加到老照片像素。图册CSS由本项目编写，仅参考[赫蹏](https://sivan.github.io/heti/)的中文节律与[Tufte CSS](https://edwardtufte.github.io/tufte-css/)的图版/旁注关系，未复制整套样式。
