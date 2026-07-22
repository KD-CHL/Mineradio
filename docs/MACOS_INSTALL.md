# macOS 安装、签名与构建

## 选择安装包

- Apple Silicon（M1 及更新）：`Mineradio-1.1.1-mac-arm64.dmg`
- Intel Mac：`Mineradio-1.1.1-mac-x64.dmg`
- Universal：项目提供构建命令，但当前不是必交付产物

最低系统版本为 macOS 26。

## 本地安装

1. 双击对应架构的 DMG。
2. 将 `Mineradio.app` 拖到 DMG 内的 `Applications` 快捷方式。
3. 从“应用程序”打开 Mineradio。

当前本地测试包使用 ad-hoc 签名且未经过 Apple 公证，Gatekeeper 可能提示无法验证开发者。确认 DMG 来自可信构建并核对 SHA256 后，可在 Finder 中按住 Control 点击应用并选择“打开”；仍被拦截时，到“系统设置 → 隐私与安全性”查看并选择“仍要打开”。不要关闭 Gatekeeper 或系统完整性保护。

## 本地构建

建议使用 Node.js LTS、完整 Xcode Command Line Tools，并从干净依赖开始：

```bash
npm ci
npm run build:mac:dir
npm run build:mac
```

可用命令：

- `npm run build:mac:dir`：arm64 未压缩 `.app`
- `npm run build:mac:dir:x64`：x64 未压缩 `.app`
- `npm run build:mac:arm64`：arm64 DMG
- `npm run build:mac:x64`：x64 DMG
- `npm run build:mac`：arm64 + x64 DMG
- `npm run build:mac:universal`：可选 Universal DMG

GitHub 直连无法获取 Electron 运行时时，可只对构建依赖设置镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run build:mac
```

## 签名模式

默认命令生成 Hardened Runtime 开启的 ad-hoc 签名包：

- 用途：本机或受控测试
- 状态：不是 Developer ID 签名
- 状态：未公证、未 staple
- 权限：Electron JIT 与 ad-hoc 所需的 library validation 例外

正式发布需要 Developer ID Application 证书和公证凭据：

```bash
export MINERADIO_MAC_SIGNING=developer
export CSC_NAME='Developer ID Application: Example (TEAMID)'
export APPLE_API_KEY='/secure/path/AuthKey_XXXXXXXXXX.p8'
export APPLE_API_KEY_ID='XXXXXXXXXX'
export APPLE_API_ISSUER='00000000-0000-0000-0000-000000000000'
npm run build:mac
```

也可按 electron-builder 支持的方式使用 `APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID`，或 `APPLE_KEYCHAIN + APPLE_KEYCHAIN_PROFILE`。任何证书密码或公证凭据都不得写入仓库。

## 发布前验证

```bash
file dist/mac-arm64/Mineradio.app/Contents/MacOS/Mineradio
lipo -info dist/mac-arm64/Mineradio.app/Contents/MacOS/Mineradio
codesign --verify --deep --strict --verbose=2 dist/mac-arm64/Mineradio.app
hdiutil verify dist/Mineradio-1.1.1-mac-arm64.dmg
shasum -a 256 dist/Mineradio-1.1.1-mac-arm64.dmg dist/Mineradio-1.1.1-mac-x64.dmg
```

正式签名并公证后还必须执行：

```bash
spctl --assess --type execute --verbose=4 dist/mac-arm64/Mineradio.app
xcrun stapler validate dist/mac-arm64/Mineradio.app
```

ad-hoc、未公证包的 `spctl` 拒绝是预期结果，不能把它描述为 Gatekeeper 验证通过。

## macOS 功能边界

- 支持：原生菜单、Command 快捷键、红黄绿按钮、Dock 重开、菜单栏状态项、桌面歌词、系统文件对话框、Finder/系统打开、媒体键与正在播放信息。
- 摄像头：只在用户主动开启“手势触碰”时申请；不申请麦克风或屏幕录制。
- 桌面歌词：可用；全局鼠标中键解锁监听仅在 Windows 可用，Mac 请从应用内设置解锁。
- 壁纸模式：依赖 Windows WorkerW，macOS 没有可靠等价物，因此会明确禁用。
- 快速资源补丁：macOS 禁用，避免运行时修改已签名 `.app` Bundle；更新使用完整 DMG/Mac ZIP。
