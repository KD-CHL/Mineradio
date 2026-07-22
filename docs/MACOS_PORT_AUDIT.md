# Windows → macOS 兼容性审计

审计基线：Mineradio 1.1.1，Electron 42.4.1，目标 macOS 26，arm64 + x64，保留 Windows。

## 1. 技术栈和入口

- Electron 主进程：`desktop/main.js`；preload：`desktop/preload.js`。
- 本地 Node HTTP 服务：`server.js`，由主进程启动后加载 `http://127.0.0.1:<port>`。
- UI：单文件 `public/index.html`，本地 Three.js、GSAP 与音乐节奏依赖位于 `public/vendor/`。
- 构建：`package.json` 的 electron-builder 配置；Windows NSIS 与 macOS DMG 共存。

## 2. Windows 专用代码位置

- 桌面 `.lnk`：`desktop/main.js:342` 的 `shouldEnsureDesktopShortcut()` 及相邻快捷方式函数，仅 Windows 调用。
- PowerShell 全局鼠标监听：`desktop/main.js:880` 的 `startDesktopLyricsMousePoller()`，仅 Windows 启用。
- WorkerW 壁纸：`desktop/main.js:1052` 的 `attachWallpaperToWorkerW()`；macOS IPC 在 `desktop/main.js:1368` 明确返回不支持。
- D3D11/ANGLE：`desktop/platform-adapter.js` 的 `PLATFORM_CHROMIUM_SWITCHES.win32`，不再影响 Mac。
- D 盘节拍缓存与 EXE/MSI 更新：`server.js:72`、`server.js:378`，均由运行平台分支收口。
- NSIS、rcedit、Windows 图标与安装器：`package.json` 的 `win/nsis`、`build/installer.nsh`、`build/after-pack.js`。

## 3. 可直接跨平台的功能

- 搜索、音乐平台 API、本地音频代理、队列、歌单、歌词、自定义封面和天气电台均为 JavaScript/HTTP 实现。
- Three.js 粒子、3D 歌单架、GSAP 动画、mpg123 WASM 解码无需平台原生扩展。
- 运行依赖中没有需要分别编译的 `.node` 原生模块；arm64/x64 已分别构建成功。

## 4. 已替换或抽象的功能

- 系统目录、窗口风格、权限、菜单、Dock/状态项与外链校验：`desktop/platform-adapter.js:48-279`。
- Application Support/Caches/Logs/Temporary Directory：`configureRuntimePaths()`。
- Keychain-backed Cookie 加密与旧明文迁移：`desktop/secret-store.js`、`server.js:183-192`。
- 本地服务只启动一次并支持关闭窗口后重建 BrowserWindow：`desktop/main.js:1403-1539`。
- Mac 原生菜单与渲染层动作桥：`desktop/platform-adapter.js:135`、`desktop/preload.js:39`、`public/index.html:26547`。
- Media Session/媒体键：`public/index.html:18357-18424`。
- 平台/架构更新选择：`server.js:378-429`；多架构 `latest-mac.yml` 选择：`server.js:757`。

## 5. macOS 无可靠等价物的功能

- WorkerW 桌面壁纸嵌入：安全禁用，不伪装成功。
- Windows 全局鼠标中键轮询：Mac 桌面歌词保留，解锁改由应用内设置完成。
- Windows 桌面快捷方式与 NSIS 自定义安装路径：Mac 使用标准 `.app` + DMG + `/Applications`。
- 运行时快速资源补丁：Mac 禁用，避免修改签名 Bundle。

## 6. 风险分级

- P0（已处理）：Mac 下载 EXE/MSI、D3D11 参数污染、Dock 重开后空白、本地路径硬编码、未声明摄像头用途、运行时修改签名 Bundle。
- P1（已处理）：原生菜单/快捷键、关闭与退出语义、状态项、Keychain 加密、架构化构建、ad-hoc 与 Developer ID 状态分离。
- P1（发布前仍需外部条件）：Developer ID Application 证书、Apple 公证与 staple；当前没有证书，不能完成。
- P2：Universal 包可构建但不是当前必交付；Intel 经 Rosetta 实测较 arm64 冷启动更慢。
- P2（依赖遗留）：`npm audit --omit=dev` 报告 NeteaseCloudMusicApi 间接使用的旧 `music-metadata/file-type` ASF 解析拒绝服务问题（2 high、1 moderate）。Mineradio 当前没有暴露该依赖的云盘上传解析入口；npm 给出的自动修复会把 NeteaseCloudMusicApi 降到 3.x，属于破坏性变更，因此本轮没有盲目执行 `npm audit fix --force`。

## 7. 平台抽象结构

```text
desktop/
├── main.js                 Electron 生命周期与业务编排
├── preload.js              受限 IPC 桥
├── platform-adapter.js     路径、窗口、菜单、权限、状态项、能力表
└── secret-store.js         safeStorage/Keychain 凭据层

server.js                   按 MINERADIO_PLATFORM/ARCH 选择更新与缓存策略
build/
├── mac-build.js            ad-hoc/Developer ID 构建入口
└── entitlements.mac*.plist 分离签名权限
```

## 8. 修改文件范围

- 核心：`desktop/main.js`、`desktop/preload.js`、`desktop/platform-adapter.js`、`desktop/secret-store.js`、`server.js`。
- UI 适配：`public/index.html`，只增加平台样式、菜单动作、Mac 热键与 Media Session，没有重写视觉系统。
- 打包：`package.json`、`build/mac-build.js`、`build/entitlements.mac.plist`、`build/entitlements.mac.adhoc.plist`、`build/icon-mac.png`、`build/icon.icns`。
- 文档：`README.md`、`RELEASE.md`、`CHANGELOG.md`、`docs/MACOS_INSTALL.md`、本文件和项目记忆。

## 9. 架构可行性

- arm64：可行，已生成并启动 `.app`，已生成 DMG。
- x64：可行，已在 Apple Silicon 主机通过 Rosetta 启动，已生成 DMG。
- Universal：依赖结构允许，命令已提供；当前未作为最终交付构建和验收，因此不能声称通过。

## 10. 签名、公证和权限

- 当前：Hardened Runtime + ad-hoc，权限为 `allow-jit` 与 ad-hoc 必需的 `disable-library-validation`；未公证。
- 正式：Developer ID Application + `allow-jit`，需 Apple 公证、staple、`spctl` 与 `stapler validate`。
- 隐私权限：仅声明摄像头，且只允许本地页面请求视频；音频采集与屏幕录制均拒绝且未声明。
