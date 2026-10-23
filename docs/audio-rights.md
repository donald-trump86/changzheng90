# 音乐素材授权与核验记录（docs/audio-rights.md）

本文件记录[音频版权页](../audio-credits.html)中两首实际使用录音的来源、许可与本地文件信息。两首录音均本地托管，许可已核实。

核验日期：2026-10-23。核验方式：对作者官网作品页与许可页做 HTTPS GET（web_fetch 工具对该域返回“resolves to a non-public IP address”被拒，改用 curl 直连；各页 HTTP 200），并下载 MP3 本体核对字节、哈希与元数据。核验者未试听任何音频，本文不对音质或内容作任何听感评价。

## 一、实际使用的录音

### 1.《Undertow》——第 1–2 章背景音乐

| 项目 | 内容 |
| --- | --- |
| 作者 | Scott Buckley（作曲、编曲、录音；ID3 标签 `artist=Scott Buckley`、`composer=Scott Buckley`） |
| 作品页（来源） | <https://www.scottbuckley.com.au/library/undertow/>（发布 2019-12-13，HTTP 200） |
| 文件下载来源 | <https://www.scottbuckley.com.au/library/wp-content/uploads/2019/12/sb_undertow.mp3>（`audio/mpeg`，与服务端 `Content-Length: 10000906` 一致） |
| 风格描述（引自作品页） | “A sombre, ebbing piano/string/synth track. Inspired by times where life takes unexpected turns; sometimes you just can’t help but be pulled with it.” |
| 许可 | CC BY 4.0（Creative Commons Attribution 4.0 International）<https://creativecommons.org/licenses/by/4.0/> |
| 作品页许可原文 | “This work is licensed under a Creative Commons Attribution 4.0 International License” |
| 官方署名格式（照录） | `'Undertow' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au` |
| 改动说明 | 无剪辑、无改编、无重新编码（无剪辑）；文件与作者发布的 MP3 字节完全一致。播放时仅作音量调节与整曲循环，未改编内容。 |
| 本地文件 | `public/audio/undertow.mp3`，10,000,906 字节；MP3 320 kbps / 44.1 kHz / 立体声；时长 249.93 s（≈4 分 10 秒） |
| SHA-256 | `4652007dad67295f1f5c87c8cbc8e2df1a530e7671266a29f693a084375d3910` |

### 2.《The Great Sea》——第 3–4 章背景音乐

| 项目 | 内容 |
| --- | --- |
| 作者 | Scott Buckley（作曲、编曲、录音；ID3 标签 `artist=Scott Buckley`、`composer=Scott Buckley`） |
| 作品页（来源） | <https://www.scottbuckley.com.au/library/the-great-sea/>（发布 2024-01-27，HTTP 200） |
| 文件下载来源 | <https://www.scottbuckley.com.au/library/wp-content/uploads/2024/01/TheGreatSea.mp3>（`audio/mpeg`，与服务端 `Content-Length: 11279896` 一致） |
| 风格描述（引自作品页） | “A grand, sweeping orchestral track, starting with bittersweet solo cello and building to full orchestra.” |
| 许可 | CC BY 4.0（Creative Commons Attribution 4.0 International）<https://creativecommons.org/licenses/by/4.0/> |
| 作品页许可原文 | “This work is licensed under a Creative Commons Attribution 4.0 International License” |
| 官方署名格式（照录） | `'The Great Sea' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au` |
| 改动说明 | 无剪辑、无改编、无重新编码（无剪辑）；文件与作者发布的 MP3 字节完全一致。播放时仅作音量调节与整曲循环，未改编内容。 |
| 本地文件 | `public/audio/the-great-sea.mp3`，11,279,896 字节；MP3 320 kbps / 44.1 kHz / 立体声；时长 281.91 s（≈4 分 42 秒） |
| SHA-256 | `f2c2d69a0c89656e676c0fac3da23a201237951c8be7e77dcaa1705dca5b9cf8` |

## 二、许可依据与作者附加条件

作者许可页「Using This Music」（<https://www.scottbuckley.com.au/library/using-this-music/>，HTTP 200）原文摘录：

> The music (mp3 downloads) found on scottbuckley.com.au is made available under the Creative Commons 'Attribution 4.0 International' (CC BY 4.0) License (unless stated otherwise).

> My music cannot be resold in isolation, or redistributed/reuploaded to music streaming platforms, and must be synchronised with other media (e.g. film). … CANNOT be submitted to audio fingerprinting services like YouTube Content ID …

各作品页除许可声明外还给出署名格式（见上表“照录”行），无署名场景不适用 CC BY，需另行购买许可。

### 本站做法与义务对应

- **署名**：`audio-credits.html` 按官方格式逐条署名（曲名、作者、来源站、CC BY 4.0）。
- **标注许可**：credits 页标注 CC BY 4.0 及许可链接。
- **注明改动**：声明“无剪辑、无改编、无重新编码；播放时仅作音量调节与整曲循环”。
- **同步使用**：曲目作为页面叙事背景音乐，与图文内容同步呈现。
- **不做之事**：不单独转售音频、不上传流媒体、不提交音频指纹服务、不改字节、不热链（全部本地托管，运行时不依赖外部服务）。

## 三、当前音频实现

[音频控制器](../src/audio.js)只接入上表两首录音。公开署名与许可见[音频版权页](../audio-credits.html)。

- `audioTracks` 包含 `undertow` 与 `the-great-sea`，均为本地音频，章节分别为 `[1,2]` 与 `[3,4]`。
- 配乐默认关闭，音频元素初始 `preload="none"`、音量0；用户显式开启后按当前音量播放。两首文件合计约21.3 MB，按需加载。
- 切章交叉淡化320 ms，可被暂停、销毁或页面隐藏取消；返回页面后需重新开启。
- 播放时调节音量与整曲循环，不改变原始文件字节。
