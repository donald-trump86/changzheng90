# 遵义会议、三首词与指挥专题的展示字体子集

本轮从已生成全部专题正文的 [index.html](../index.html) 重建 [chishui-atlas-display.woff2](../public/fonts/chishui-atlas-display.woff2)。三首《十六字令》的全部原文、遵义会议标题、指挥专题、河流标签、内联脚本中的动态文案均纳入实际字符索引。

## 上游来源与许可

- 官方项目：[TrionesType/zhuque](https://github.com/TrionesType/zhuque)。
- 固定版本：[v0.212](https://github.com/TrionesType/zhuque/releases/tag/v0.212)，发布于 2025-07-07。
- 官方二进制：[ZhuqueFangsong-v0.212.zip](https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip)。压缩包为 **5,743,932 字节**，SHA-256：`bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062`。本轮与主代理读取的官方发布 API digest 核对一致。
- 仅提取其中 `ZhuqueFangsong-Regular.ttf`，没有执行压缩包内的代码。源字体为 **8,824,084 字节**，SHA-256：`558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4`；内部版本为 `Version 0.212`，源字体 `getBestCmap()` 包含 **12,882** 个码位。
- 子集继续使用 SIL Open Font License 1.1。[ZHUQUE-OFL.txt](../public/fonts/ZHUQUE-OFL.txt) 原件保持 **4,389 字节**、SHA-256 `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043`，构建前后逐字节一致。

OFL 允许修改、嵌入与随软件分发，并要求保留版权和许可、使字体衍生版本继续适用 OFL，限制单独售卖字体及使用保留名称。本轮在阅读许可条件后子集化，主动使用项目内的展示字体名称，保留原作者与厂商的署名。完整 TTF 与下载压缩包只用于临时构建；项目字体目录只更新 WOFF2 子集。

## 实际字符索引与输出

索引输入是当时实际生成的完整 HTML 源码。先执行 `html.unescape()`，收集所有非空白字符的 Unicode 码位，再加入基本 ASCII 范围 `U+0020–U+007E`。直接从完整源码取集合，也覆盖内联 SVG、样式、交互脚本中的字符，不依赖猜测的汉字区间。

| 项目 | 实测结果 |
| --- | --- |
| 输入 HTML 字节数 | 113,673 |
| 输入 HTML SHA-256 | `ae162dc8e17a9ff581015239aa4948b4e1085f57e11098cbea1365105f2d4499` |
| 请求码位数 | 876 |
| 其中汉字码位数 | 758 |
| 输出格式与文件头 | WOFF2；`wOF2` |
| 输出 `getBestCmap()` 码位数 | 876 |
| 输出 `maxp.numGlyphs` | 1,148 |
| 输出字节数 | **264,788** |
| 输出大小 | **258.582 KiB** |
| 输出 SHA-256 | `f5f7e23bedd3e63f3b3e35f4ddf63a154a92000d6d3ccb69a33d35a88d2e4384` |
| 所有请求字符的缺失集合 | `[]` |
| 请求汉字的缺失集合 | `[]` |
| 上游不支持的请求字符 | `[]` |
| 首选与硬上限 | 小于 350 KiB；小于 500 KiB |

本轮更新前的工作区字体为 286,284 字节，SHA-256 为 `e9758b02613aa600543cd3350b2ee5bb6df9579b9dcc945d0ddd635c49c98a7d`。它缺少本轮实际需要的 **117 个汉字**及 `^`；三首词中缺少的 25 个字为 `万倒刺卷堕奔巨快急惊拄欲残海澜犹破翻腾赖酣锷鞍鞭马`。本轮全部补齐，字体同时缩小 21,496 字节。码位数与字形数不同，是因为保留了排版替换所需的字形。

## 内部名称与署名

英文和简体中文语言记录中的字体身份统一改为项目名称，避免衍生版本继续以原字体的主名称出现。

| name ID | 写入内容 |
| --- | --- |
| 1，字体族 | `ChishuiAtlasDisplay` |
| 2，样式 | `Regular` |
| 3，唯一标识 | `0.212;ChishuiAtlasDisplay;Regular;subset` |
| 4，完整名称 | `ChishuiAtlasDisplay Regular` |
| 6，PostScript 名称 | `ChishuiAtlasDisplay-Regular` |
| 16，首选字体族 | `ChishuiAtlasDisplay` |
| 17，首选样式 | `Regular` |

对源字体实际存在的 name ID **0、5、8、9、11、12、13、14**，按 name ID、平台 ID、编码 ID、语言 ID 与原始字节逐条比较，最终 WOFF2 与源 TTF 完全相同。其内容包括：

- 版权：`Copyright 2023 JadeFoci`。
- 厂商：`TrionesType`／`璇玑造字`。
- 设计者：`Junyi Yu, Yeong-sy Han, Yehang Yin, Jianqiao Li`／`余俊益、韩泳思、殷叶航、李剑桥`。
- 原始版本：`Version 0.212`。
- 原始厂商网址、设计者网址、OFL 声明与许可网址。

未使用的希腊文排版功能标签 name ID 256 随对应功能正常裁剪；它不属于版权或许可记录。

## 构建方法与验证

工具安装在临时虚拟环境中：Python 3.14、FontTools **4.67.0**、Brotli **1.2.1**，FontTools 的 WOFF 依赖 Zopfli **0.4.3**。安装仅使用二进制 wheel，没有全局安装，也没有修改 npm 清单或锁文件。

FontTools `subset.Options()` 的关键设置为：

```python
options.flavor = 'woff2'
options.name_IDs = ['*']
options.name_languages = ['*']
options.name_legacy = True
options.layout_features = ['*']
options.recalc_timestamp = False
```

源字体和输出字体均用 `TTFont(..., recalcTimestamp=False)` 打开。`subsetter.populate(unicodes=sorted(requested & source_cmap))` 使用实际索引；子集化后重写字体身份名称，再保存为 WOFF2。完整源字体从不写入项目目录。

保存前先构建临时候选文件并复开，确认格式、名称、字符覆盖、完整诗词、版权与许可记录以及 500 KiB 硬上限。候选文件通过后才替换项目中的 WOFF2，并从目标路径再次复开、核对 cmap 与 SHA-256。构建同时检查输入 HTML 未在运行期间变化，且原始 OFL 字节未变。

本轮实际执行的断言均通过：876 个请求码位全部覆盖；758 个汉字全部覆盖；三首全文逐字符覆盖；中英文内部身份名称正确；原版权与许可记录完整；原 OFL 字节不变；目标文件确为 WOFF2；输出低于 350 KiB。浏览器实际加载与页面视觉检查由主任务统一完成；本记录仅报告字体二进制验证结果。

后续如正文加入新的 Unicode 码位，应从更新后的完整 HTML 重建并重测覆盖。本记录中的 HTML 散列用于标明此次构建的确切输入。
