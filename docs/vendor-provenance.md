# Vendored JavaScript provenance

## Lenis 1.3.27

本站保存上游完整ES module和MIT许可，不修改模块内容。未引入React、Vue、Nuxt、snap入口或运行时CDN。

| 项目 | 已核对的值 |
| --- | --- |
| 官方仓库 | [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) |
| 固定版本 | `lenis@1.3.27` |
| 上游tag | [`v1.3.27`](https://github.com/darkroomengineering/lenis/releases/tag/v1.3.27)，commit `e01eefb1f55cd08bc051521d74f5f8182b71ee9d` |
| npm元数据gitHead | `1f60fb9199a823f10fb23f7df55011defbb2747a` |
| 发布tarball | [lenis-1.3.27.tgz](https://registry.npmjs.org/lenis/-/lenis-1.3.27.tgz) |
| tarball SHA-1 | `9c714ca34741bb29cd6180ab4fc3634ece6805b3` |
| tarball integrity | `sha512-QIHNH4LIfWyLfgH/5K0aTGZgyFJJ7GfHNcaH/AIgyKjb8gstLh5siNGvrVqz1w5ClLXzOvllBVk7vby8JzUVPQ==` |
| 包内入口 | `package/dist/lenis.mjs`；package.json的main、module及exports默认入口均指向此文件 |
| 许可 | MIT，Copyright (c) 2024 darkroom.engineering |
| 核对日期 | 2026-10-25 |

使用`npm pack lenis@1.3.27 --ignore-scripts`取得发布物，检查压缩包成员后展开，读取包元数据、许可和实际入口；重新计算下载包SHA-512，与npm registry元数据一致。包内版本和模块内版本均为1.3.27，repository指向上述官方仓库。

npm记录的gitHead比tag早两个提交。[GitHub比较结果](https://github.com/darkroomengineering/lenis/compare/1f60fb9199a823f10fb23f7df55011defbb2747a...e01eefb1f55cd08bc051521d74f5f8182b71ee9d)仅包含版本发布与合并提交，文件差异限于package.json和README；核心源码未变。站点模块取自核验过的npm发布物。

| 本地文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| [完整ES module](../public/vendor/lenis-1.3.27.esm.js) | 33,274 | `4cdb25138c7233e7419f630d9536adb41d71fa51906c059f0a27a1268ddedacc` |
| [原始MIT许可](../public/vendor/lenis-1.3.27-LICENSE.txt) | 1,088 | `7d1896b31f2eed9f286b05faca067c4e35b2f109ae7c4ed5105220e2d2820228` |

两份文件均逐字节复制并随站点发布。[页面样式](../src/print-atlas.css)合并上游`dist/lenis.css`规则；这些规则同属上述MIT许可。模块保留原始sourceMappingURL注释，source map不属于运行依赖，未加入发布白名单。
