# 本地素材清单

本清单对应当前博物馆首页实际使用的图片、地图、字体、纸纹、动效库与配乐。所有运行资源同源托管，不热链。下列本地字节与 SHA-256 于本次文档清理中核对；外部许可依据沿用已保存的素材核验记录，本次未重新联网研究。

## 河谷艺术示意与两张历史照片

| 文件 | 尺寸 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| [河谷图](../design-study/chishui-valley-study.png) | 1774×887 | 3018714 | `c5084be3c29d97edf80bb99061b78b212a7c79b1686534977f2365749be9b201` |
| [红军集会](../design-study/long-march-gathering.jpg) | 585×310 | 71686 | `dcc1807e93537afdd8bc02978996cd52410a11e8e3009d50be9c68a01569ec8c` |
| [红六军团合影](../design-study/sixth-army-1935.jpg) | 698×357 | 128640 | `ee2238bfcdf45a50af86302091cb9799de73b40e647b0cc99b51a9dc781e049f` |

河谷图为本项目生成的水彩与炭笔艺术示意，不作为历史照片或史料，不复原具体渡口。地图、路线等自绘图形表示教学关系，不表现为精确行军轨迹。

红军集会来自 [Commons File:Long-march.jpg](https://commons.wikimedia.org/wiki/File:Long-march.jpg)。摄影者、具体年份、地点与人物未详，仅记为1930年代，不能确认为四渡赤水现场。文件页标记 [PD-China](https://commons.wikimedia.org/wiki/Template:PD-China) 与 [PD-US1996](https://commons.wikimedia.org/wiki/Template:PD-1996)。

红六军团领导人合影来自 [Commons File:Hongerliujuntuan.jpg](https://commons.wikimedia.org/wiki/File:Hongerliujuntuan.jpg)，1935年11月29日摄于湖南新化，摄影者未详；原始出版来源为解放军出版社1993年《中国人民解放军历史资料丛书·红军长征 图片》，文件页标记 PD-China。此图不是中央红军四渡赤水现场，也不是1936年三大主力会师。

两张照片保持原始字节、完整画面与比例，未裁切或加滤镜。PD-China 和 PD-US1996 分别说明相关法域的公有领域依据，不应表述为全球任意使用授权。作者、上传来源及许可姓名属于素材归属，不是作品署名。

## 毛泽东与四渡赤水专题木刻

五幅均于2026年10月26日经 Magpie 的 `gpt-image-2` 生成；以首幅肖像作为配套画面参考，保持黑白刀刻、克制朱红与纸张色统一。构图为本项目生成的艺术表达，未取用或复刻其他艺术家的版画。生成画面不能作为真实照片、历史现场复原或服装、座次、地形的史料证据；不据此承诺排他版权或模型输出的独占性。五幅图的正式文字均由 HTML 排版。

| 原始文件 | 尺寸 | 字节 | SHA-256 | 页面用途 |
| --- | --- | ---: | --- | --- |
| [遵义会议](../design-study/zunyi-meeting.png) | 1536×1024 | 3703384 | `addbee8e673f027fc4ac4ca691ad05249eecbbd6dbd0eb66cb1f5d751241a736` | 集体讨论的序章主视觉 |
| [毛泽东与山河](../design-study/mao-command-portrait.png) | 1536×1024 | 3900706 | `8dba70ca88b5b6f6367c12673fcb8b0c6e9b06b3fa785142f4b6d5339384f8f8` | 人物登场与深色主题高潮 |
| [诗词与群山](../design-study/mao-mountain-poem.png) | 1024×1536 | 3745082 | `73fbe6152f5ee6918c7eee5a2d10308e1a95a15c10464a0d6ed4623a1c011c11` | 《十六字令三首》竖幅 |
| [群山行军横卷](../design-study/march-mountains-banner.png) | 2172×724 | 3893430 | `028ffc621b82687ebce8762a51ef12c75f2fc6eadc160094a490dd8ee5f4c11b` | 领导调整与指挥判断之间的长卷 |
| [赤水河山](../design-study/chishui-river-landscape.png) | 1536×1024 | 3993878 | `14aead7b3e2df6e63f1076ec6351dfd5f8fee473339a67dcec9a0dabf3e5dfef` | 回到行军历史的山河尾声 |

原图保留在源码中；公开站点只发布每幅三档 WebP，由[处理脚本](../scripts/prepare-images.mjs)校验原图再生成，尺寸、字节和散列详见[图像清单](image-manifest.json)。全部使用 `picture`、明确宽高、延迟加载和异步解码；两处肖像复用同一资源，不重复生成。图下和可展开的“专题史料、诗词与艺术创作说明”均标注 AI 木刻艺术插画。

新增字体子集的原始包核验、字符覆盖、内部改名与完整 OFL 保留记录见[字体说明](exhibition-font-subset.md)。

## 地图数据与粗采样地形

[地图数据文件](../src/historical-map-data.js)保存十个现代代表点、完整来源、概略关系、阶段节点与90点高程。现代参照点不等于1935年浮桥、渡口或城心测点。

- 元厚、土城、太平、二郎、茅台、扎西、遵义七点来自维基百科贡献者／GeoData，采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。数据文件保留坐标原值与查询入口。
- 习水 Q531259、古蔺 Q1342169、桐梓 Q1200607 来自 [Wikidata 实体 API](https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q531259%7CQ1342169%7CQ109350269%7CQ1200607&props=claims%7Clabels&languages=zh) 的 P625，依 [CC0 政策](https://www.wikidata.org/wiki/Wikidata:Licensing)。娄山关缺已取得坐标，只保留概略关系节点。
- 九溪口只保留“太平渡上游约5千米”的关系说明，二渡、四渡共用；不沿任意曲线反算坐标。古蔺县现代点不表示三渡进入县城。
- 河道为本项目原创概化，未使用 OSM 几何，不作 OSM 署名；历史依据见[史料说明](sources.md)。

地形来源为 Open-Meteo elevation API／Copernicus GLO-90，2026-10-23取得10列×9行共90个值，范围 `[104.85,27.4,107.15,29.05]`，高程210—1845米。数据文件保存请求、完整数值和加工说明；原值 JSON 数字序列 SHA-256 为 `459895dcfd12754008296c53afdaaf0f6dc01e7e342285dfea6edcb03ace345d`。低对比晕渲经双线性插值与粗网格坡度处理，是现代高程粗采样，不是90米分辨率地图或1935年地表复原。

[Open-Meteo 数据许可](https://github.com/open-meteo/open-meteo#data-license)为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，与服务端代码许可不同。本项目保留 Open-Meteo／Copernicus GLO-90 署名、许可链接和修改说明。现代点、关系、概化河道与地形组成的本项目派生地图数据和自绘图形以 CC BY-SA 4.0 提供，同时保留各来源适用的许可。

[region-relief.png](../public/map/region-relief.png)为600×492 RGB PNG，16556字节，SHA-256 `03101e4aa6212fcb67b9f9fe8db9867a278b1ac9df39ad905a271eb7c9d5f423`。

## 字体与纸纹

显示字体来源为 [TrionesType/zhuque v0.212](https://github.com/TrionesType/zhuque/releases/tag/v0.212)，固定提交 `803217b9663d1c6e1402e91acc94e4f572713d73`。本项目进行字符子集化、格式转换和内部名称更换，字族为 `ChishuiAtlasDisplay`，不重绘字形；系统字体提供后备。

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| [显示字体](../public/fonts/chishui-atlas-display.woff2) | 264788 | `f5f7e23bedd3e63f3b3e35f4ddf63a154a92000d6d3ccb69a33d35a88d2e4384` |
| [完整 OFL](../public/fonts/ZHUQUE-OFL.txt) | 4389 | `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043` |
| [原创纸纹](../public/atlas-paper.png) | 81926 | `f51ce5bb33e2a9f43a9920b66e019b30ede6dbc63790df073ed0ae2108174422` |

[SIL OFL 1.1 固定原文](https://github.com/TrionesType/zhuque/blob/803217b9663d1c6e1402e91acc94e4f572713d73/LICENSE.txt)版权为 `Copyright (c) 2023, Zhejiang JadeFoci Techonology Co. LTD`。原嵌入版权、作者、厂商及许可记录保留；Latin及符号来自 Alegreya 的 Juan Pablo del Peral／Huerta Tipográfica，其原记录同样保留。OFL 允许修改、嵌入和分发，要求保留完整版权与许可，衍生字体继续以 OFL 授权，不单独售卖字体或暗示作者背书。上游 v0.212 属技术预览版，其质量提示不等于额外许可条款。本清单不声称子集覆盖完整字库或所有平台排印均已实测。

纸纹为本项目用 Python 标准库生成的384×384静态 RGBA 图像，固定种子19350129，仅作低透明度页面纹理，不冒充历史纸张扫描。图册 CSS 自写，参考[赫蹏](https://sivan.github.io/heti/)的中文节律与 [Tufte CSS](https://edwardtufte.github.io/tufte-css/)的图版／旁注关系，未复制整套第三方样式。

## Anime.js

自托管 [Anime.js v4.5.0 ESM](../public/vendor/anime-4.5.0.esm.min.js)来自 [juliangarnier/anime v4.5.0](https://github.com/juliangarnier/anime/blob/v4.5.0/dist/bundles/anime.esm.min.js)，提交 `2c9cf8ea00329f6768c7d7902252ed977d75ce42`。原包118678字节，SHA-256 `a19015a1a92d52025a2fb6703b6d67eadd1cc2aeaf880770e96e04cf6aa07be1`。

[完整 MIT 许可](../public/vendor/ANIME-LICENSE.txt)随站提供，1075字节，SHA-256 `3f3e835a9952cfc2a6ca836fb95b3257c981f24fa3ef51249055acb09931897b`，署名 `Copyright (c) 2025 Julian Garnier`。库由本地动效模块按需导入，不请求 CDN。

## 配乐

实际使用 Scott Buckley《Undertow》与《The Great Sea》，均按 CC BY 4.0 署名与本地托管。两首原始 MP3 未剪辑、改编或重新编码，播放时调节音量、整曲循环并交叉淡化。

完整作品页、下载来源、文件散列、作者要求和使用说明见[音频授权](audio-rights.md)与[公开音频版权页](../audio-credits.html)。配乐是当代录音，不作为长征时期录音或史料。
