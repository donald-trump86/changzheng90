# 发布提案

状态：本地准备，尚未发布。以下命令只供用户看过最终内容并确认后执行，本任务没有运行任何远端写入命令。预定公开仓库为 `donald-trump86/changzheng90`，专用域名为 `changzheng90.luvch1nabest.me`。若仓库名称冲突，先停止并重新确认目标。

## 已有只读证据

控制器于 2026-10-22 核对：`gh` 登录账号为 `donald-trump86`；Cloudflare 区域 `luvch1nabest.me` 的 ID 为 `0c40b3634891e2ac5d69cf5040e0fc56`；按专用域名查询 DNS 记录返回 `[]`。没有修改记录。该结果仅代表核对当时，未来创建前必须再次检查。

CLI 帮助已确认 Cloudflare 创建语法是 `cf dns records create --zone <zone> --body '<raw JSON>'`。创建不支持独立的 `--type`、`--name` 参数。下文保留实际支持的 JSON 形式。

## 发布前核对

先完成 [verification.md](verification.md) 中的浏览器验收、截图复核和审查，再由用户确认最终内容与公开发布。以下命令从项目根目录执行。检查当前分支及工作区，确认准备发布的提交；不要把未审查的临时更改一起推出去。

```sh
git status --short
git log -1 --oneline
node --version
npm test
npm run build
gh auth status
gh api user --jq .login
gh repo view donald-trump86/changzheng90
```

账号必须仍是 `donald-trump86`。最后一条若显示已有仓库，停止，不覆盖；只有确认是“仓库不存在”，而非鉴权或网络错误，才继续创建。构建产物清单由包装测试检查，只有 HTML、四个模块、样式、图标、根目录 `CNAME` 与 `.nojekyll`。

## 新建仓库与两个分支

用户批准后，创建新的公开仓库，不自动推送。先确认本地没有名为 `publication` 的远端；有则停止核对，不能改写已有远端。

```sh
gh repo create donald-trump86/changzheng90 --public --description '四渡赤水：为什么这样走；原创静态互动叙事 H5'
git remote -v
git remote add publication https://github.com/donald-trump86/changzheng90.git
git push publication HEAD:main
```

`main` 存放审查过的源码。另建一个临时本地仓库，仅把构建资源推到新的 `gh-pages` 分支。下面不切换当前工作树，不包含源码文档或私有验收材料，不使用强制推送。临时目录留待发布人员核对后清理。

```sh
publish_dir="$(mktemp -d "${TMPDIR:-/tmp}/chishui-pages.XXXXXX")"
cp -R dist/. "${publish_dir:?}/"
git -C "${publish_dir:?}" init --initial-branch=gh-pages
git -C "${publish_dir:?}" add --all
git -C "${publish_dir:?}" diff --cached --stat
git -C "${publish_dir:?}" commit -m "Publish reviewed Chishui static site"
git -C "${publish_dir:?}" remote add origin https://github.com/donald-trump86/changzheng90.git
git -C "${publish_dir:?}" push --set-upstream origin gh-pages
```

若远端分支已存在或推送被拒，停止检查，不加 `--force`。后续更新须基于远端分支历史另行处理。

创建 Pages，来源仅为 `gh-pages` 的根目录；随后设置自定义域名。若 Pages 已存在，先读配置并核对，不重复创建或直接覆盖。

```sh
gh api --method POST repos/donald-trump86/changzheng90/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'
gh api --method PUT repos/donald-trump86/changzheng90/pages -f cname=changzheng90.luvch1nabest.me
gh api repos/donald-trump86/changzheng90/pages
gh api repos/donald-trump86/changzheng90/pages/builds/latest
```

仓库内的 `CNAME` 是根目录构建文件，内容恰为目标域名及一个换行。Pages 创建或域名验证若要求额外所有权 TXT 记录，停止记录具体要求，取得相应授权后再做；本提案没有授权修改其他 DNS 名称。

## 仅创建专用子域名

紧接创建前重新只读查询精确名称，保留完整输出：

```sh
cf dns records list --zone 0c40b3634891e2ac5d69cf5040e0fc56 --name changzheng90.luvch1nabest.me
```

仅当查询成功且结果仍为 `[]`，才执行下一条。只要出现任何记录、查询错误或不明结果，都停止；不删除、覆盖或更新既有记录。不要改动根域、其他子域、代理开关或区域配置。

```sh
cf dns records create --zone 0c40b3634891e2ac5d69cf5040e0fc56 --body '{"type":"CNAME","name":"changzheng90.luvch1nabest.me","content":"donald-trump86.github.io","ttl":1,"proxied":false}'
cf dns records list --zone 0c40b3634891e2ac5d69cf5040e0fc56 --name changzheng90.luvch1nabest.me --type CNAME
```

DNS 保持仅解析（`proxied: false`），让 GitHub Pages 直接完成域名和证书检查。不要创建指向仓库路径的 CNAME，也不要把 Pages 构建来源改成整个源码树。

## 上线后验证与 TLS

以下检查依赖真实发布和 DNS 生效，当前均未执行，也没有声称 TLS 已就绪。

```sh
dig +short CNAME changzheng90.luvch1nabest.me
gh api repos/donald-trump86/changzheng90/pages
gh api repos/donald-trump86/changzheng90/pages/builds/latest
curl --fail --head https://changzheng90.luvch1nabest.me/
curl --fail --head https://changzheng90.luvch1nabest.me/src/main.js
curl --fail --head https://changzheng90.luvch1nabest.me/src/styles.css
curl --fail --head https://changzheng90.luvch1nabest.me/public/favicon.svg
```

确认 CNAME 目标、Pages 构建成功、自定义域名和证书状态。证书生效且 HTTPS 可正常访问后，再启用 HTTPS 强制跳转；不要用跳过证书校验的选项掩盖问题。

```sh
gh api --method PUT repos/donald-trump86/changzheng90/pages -F https_enforced=true
gh api repos/donald-trump86/changzheng90/pages
curl --head http://changzheng90.luvch1nabest.me/
curl --fail --head https://changzheng90.luvch1nabest.me/
```

最后在手机微信及国内实际网络上打开正式链接，检查首屏、四章导航、来源对话框、图片保存和加载错误，记录设备、网络与结果。localhost 或桌面 Chromium 的结果不能代替这些实测。
