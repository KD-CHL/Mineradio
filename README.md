# Mineradio

![Mineradio 暗场启动页](./docs/assets/readme/cinema-beat-smoke.png)

Mineradio 是一款 macOS 桌面沉浸式音乐播放器，把天气电台、搜索播放、歌词舞台、粒子视觉和 3D 歌单架组合成一个更接近现场感的私人音乐空间。

## 下载

从 GitHub Release 下载对应你机器架构的 DMG：

| 架构 | 适用机型 | 下载 |
| --- | --- | --- |
| Apple Silicon (arm64) | M1 / M2 / M3 / M4 系列 | [Mineradio-1.1.1-mac-arm64.dmg](https://github.com/KD-CHL/Mineradio/releases/download/v1.1.1/Mineradio-1.1.1-mac-arm64.dmg) |
| Intel (x64) | 2020 年前的旧款 Mac | [Mineradio-1.1.1-mac-x64.dmg](https://github.com/KD-CHL/Mineradio/releases/download/v1.1.1/Mineradio-1.1.1-mac-x64.dmg) |

不确定自己的架构？点击左上角  → `关于本机`，查看处理器一栏。

## 安装

1. 双击下载的 `.dmg` 文件挂载磁盘映像。
2. 将 Mineradio 拖入 `Applications` 文件夹。
3. 首次打开时，由于应用未经 Apple 公证，Gatekeeper 会提示无法验证开发者：
   - 打开 `系统设置` → `隐私与安全性`，在页面底部找到被拦截的提示，点击 `仍要打开`。
   - 或者在 Finder 中右键点击 Mineradio.app，选择 `打开`，在弹窗中再次点击 `打开`。
4. 后续启动无需重复上述步骤。

> 校验文件完整性：Release 中附带 `SHA256SUMS`，可用 `shasum -a 256 -c SHA256SUMS` 验证。

## 当前版本

当前版本：`1.1.1`

1.1.1 的核心目标是把 Mineradio 重新整理成一份可公开下载的纯净安装版：默认视觉参数来自内置「默认测试」用户存档，首次启动就进入统一的视觉手感；3D 歌单架、歌词层级、用户存档和后台性能策略都在同一轮里收口。

## 核心特性

- Open-Meteo 天气电台，根据当前位置、城市和天气 mood 生成更合适的播放队列
- 首页包含天气电台、每日推荐、私人电台、继续听、听歌画像和我的歌单入口
- Wallpaper 银河首页背景，未播放状态保持干净的星河氛围
- 播放后切换到 Emily / 默认播放态视觉，歌词舞台与粒子舞台同步工作
- 基于节奏的电影镜头视觉系统
- 面向长播客和 DJ 曲目的专属视觉模式
- 歌词舞台、自定义歌词、歌词位置与视觉控制
- 自定义专辑封面上传与裁剪
- 右键唤起 3D 歌单架，支持歌单队列浏览
- 网易云音乐账号、搜索、歌单、播客等体验接入
- QQ 音乐搜索、登录态与音源补充接入
- GitHub Releases 更新检测与下载入口
- 首次启动内置「默认测试」视觉用户存档，软件内默认视觉参数与该存档一致

## macOS 平台说明

- 壁纸模式依赖 Windows WorkerW，在 macOS 上已明确禁用。
- 桌面歌词可用，但全局鼠标中键解锁仅支持 Windows。
- 登录 Cookie 通过 macOS Keychain 支撑的 `safeStorage` 加密存储。

## 开发运行

```bash
npm ci
npm start
npm run build:mac:dir   # 仅打包不生成 DMG，调试用
npm run build:mac       # 生成 arm64 + x64 DMG，产物位于 dist/
```

桌面版入口由 Electron 主进程加载本地服务。

## 更新机制

Mineradio 会请求 GitHub Releases latest 检测新版本。远端版本高于本地版本时，应用会严格按 CPU 架构选择更新包：macOS 只接受匹配架构的 DMG 或 Mac ZIP；没有兼容资产时只显示 Release 页面，不会误下载其它平台文件。

本地验证更新链路时，可以通过 `MINERADIO_UPDATE_MANIFEST` 指向一个本地 manifest JSON 或 HTTP 地址来模拟线上 Release。

## 第三方音乐平台说明

Mineradio 不是网易云音乐、QQ 音乐或腾讯音乐娱乐集团的官方客户端，也不隶属于任何音乐平台。

项目中的第三方平台接入仅用于个人学习、本地客户端体验和用户自有账号的播放辅助。请遵守对应平台的用户协议、版权规则和会员权益规则。项目不会提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 用户数据与隐私

登录 Cookie、搜索历史、自定义封面、自定义歌词、节奏分析缓存等数据只保存在本机用户数据目录中，不会上传到任何远端服务器。

更多说明见 [PRIVACY.md](./PRIVACY.md)。

## 致谢

Mineradio 由 XxHuberrr 主要设计与打造。emily 作为早期视觉底层想法与 `emily` 视觉预设改进方向的共创者和灵感来源之一，特此感谢。

同时感谢小天才e宝、应春日、锋将军、軌跡、林中、骊、风痕、花椰菜🥦在早期体验、测试反馈和发布准备中的帮助。

## 版权与授权

Copyright (C) 2026 XxHuberrr.

本项目采用 GPL-3.0 授权。详见 [LICENSE](./LICENSE)。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归作者所有；第三方依赖和第三方服务分别遵循其各自授权与服务条款。
