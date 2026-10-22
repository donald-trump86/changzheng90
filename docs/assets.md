# 本地素材清单

核查与下载日期：2026-10-22。运行时只读取站点自己的相对路径，不热链、不请求第三方服务。本清单保留素材创作者、上传者与许可来源；作品界面和纪念卡不附个人署名。

## 标准金黄色中国共产党党徽

- 本地文件：[party-emblem.svg](../public/party-emblem.svg)。420 bytes，SHA-256：`3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3`。
- [Commons 文件说明](https://commons.wikimedia.org/wiki/File:Danghui_golden.svg)标注标准 2021 版与 PD-China；[原始 SVG](https://upload.wikimedia.org/wikipedia/commons/7/78/Danghui_golden.svg)。这是文件页的版权标注，不将其表述为任何使用场景的通用授权。
- 本地保留原始字节：`viewBox="1 1 32 32"`、`fill="#fdcf30"`、path 与 circle 均不改动。无脚本、外链、外部图片、动画或附加星形。控制器独立复核了下载的 420 bytes 图形结构。
- 开场以带有“中国共产党党徽／党史学习 · 长征纪念”图注的内容图示静态展示；保持等比例、金黄色。党徽不参与场景动画，不作 favicon、操作控件或纪念卡装饰。站点自身图标仍为原创图形。

## 《国际歌》数字器乐录音

- 本地文件：[internationale.mp3](../public/internationale.mp3)。1,395,296 bytes，SHA-256：`49e8dedb6982ce8b4f8f4af6538970f2fde885d8f1dc70778f87f631bdbccc9c`。
- [Commons 文件说明与音频许可](https://commons.wikimedia.org/wiki/File:L%27internationale.ogg)；[实际下载的 Commons MP3 转码](https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6e/L%27internationale.ogg/L%27internationale.ogg.mp3)；[CC0 1.0 规范页](https://creativecommons.org/publicdomain/zero/1.0/)。下载后保持 MP3 原样，无裁剪、增益、重新编码或占位替代。
- 文件页说明：2023-04-16，以 MuseScore 和《Le Socialiste》报纸乐谱扫描作数字复刻；作曲 Pierre de Geyter；上传者 Realmartcraft。描述为数字器乐录音，不称真人钢琴演奏。
- 文件页在曲调公版说明之外，单独写有“I, the copyright holder of this work”并对该文件作 CC0 1.0 声明。录音采用依据是这一具体音频声明，不能仅由曲调公版推导所有演奏、录音或转码的权利。保留作曲、复刻方式、上传者和 CC0 来源作为自愿素材说明。
- Commons 原始 Ogg 页面显示约 1分19秒；本次实际 MP3 的控制器 `ffprobe` 结果为 MP3、44,100 Hz、双声道、78.000000 秒、1,395,296 bytes。MP3 时长使用实际文件结果。
- 控制器另用 `ffmpeg` 将整份文件解码到 null 输出，退出 0；`volumedetect` 为 mean -33.0 dB、max -16.7 dB。没有向宿主扬声器播放，没有声称试听或凭听感评价。音频本身偏轻，播放器保持默认音量 1，不叠加常见的 0.2/0.25 背景音量衰减。
- 溯源以 Commons 已核实的文件页为依据。链接中的 MuseScore 页面曾遇 403，未绕过，也不将其写成已读取的独立证据。
- 默认 `preload="none"`、关闭播放；单独点击音乐按钮后调用真实 HTMLAudio。播放不依赖“开始阅读”。支持暂停、加载失败后的明确重试；切到后台或 pagehide 时暂停，返回不自动续播。浏览器验收将保持静音并检查真实解码、时间推进、暂停与失效音频后的重试，当前实现者尚未运行浏览器。

## 原创本地图形

开场山川、云水、SVG 地图、路线、行军点与纪念卡均为代码绘制的原创概略图形，不表现为历史影像、真实地形或精确行军轨迹。金黄色党徽是上文单独标明来源的标准素材，不归入原创图形声明。正文史实依据仍见 [史料说明](sources.md)。
