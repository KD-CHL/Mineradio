const fs = require('fs');
const path = require('path');
const {
  Menu,
  Tray,
  nativeImage,
  nativeTheme,
} = require('electron');

const PLATFORM = process.platform;
const ARCH = process.arch;
const IS_MAC = PLATFORM === 'darwin';
const IS_WINDOWS = PLATFORM === 'win32';
const APP_NAME = 'Mineradio';

const GENERIC_CHROMIUM_SWITCHES = [
  ['autoplay-policy', 'no-user-gesture-required'],
  ['ignore-gpu-blocklist'],
  ['enable-gpu-rasterization'],
  ['enable-oop-rasterization'],
  ['enable-zero-copy'],
  ['enable-accelerated-2d-canvas'],
  ['disable-background-timer-throttling'],
  ['disable-renderer-backgrounding'],
  ['disable-backgrounding-occluded-windows'],
  ['force_high_performance_gpu'],
];

const PLATFORM_CHROMIUM_SWITCHES = {
  win32: [['use-angle', 'd3d11']],
  darwin: [],
  linux: [],
};

function appendChromiumSwitches(app) {
  const switches = GENERIC_CHROMIUM_SWITCHES.concat(PLATFORM_CHROMIUM_SWITCHES[PLATFORM] || []);
  for (const [name, value] of switches) {
    if (value == null) app.commandLine.appendSwitch(name);
    else app.commandLine.appendSwitch(name, value);
  }
}

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function configureRuntimePaths(app) {
  app.setAppLogsPath();
  const userData = ensureDirectory(app.getPath('userData'));
  const cache = ensureDirectory(path.join(app.getPath('cache'), APP_NAME));
  const logs = ensureDirectory(app.getPath('logs'));
  const temp = ensureDirectory(path.join(app.getPath('temp'), APP_NAME));
  const updates = ensureDirectory(path.join(userData, 'updates'));
  const secrets = ensureDirectory(path.join(userData, 'secrets'));

  process.env.MINERADIO_PLATFORM = PLATFORM;
  process.env.MINERADIO_ARCH = ARCH;
  process.env.MINERADIO_USER_DATA_DIR = userData;
  process.env.MINERADIO_CACHE_DIR = cache;
  process.env.MINERADIO_LOG_DIR = logs;
  process.env.MINERADIO_TEMP_DIR = temp;
  process.env.MINERADIO_UPDATE_DIR = updates;
  process.env.MINERADIO_SECRET_DIR = secrets;
  process.env.MINERADIO_BEAT_CACHE_DIR = path.join(cache, 'beatmaps');

  return { userData, cache, logs, temp, updates, secrets };
}

function browserWindowIcon(projectRoot) {
  if (IS_WINDOWS) return path.join(projectRoot, 'build', 'icon.ico');
  if (IS_MAC) return path.join(projectRoot, 'build', 'icon-mac.png');
  return path.join(projectRoot, 'build', 'icon.png');
}

function mainWindowChromeOptions() {
  if (!IS_MAC) return { frame: false };
  return {
    frame: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 15 },
    fullscreenWindowTitle: false,
    roundedCorners: true,
  };
}

function loginWindowChromeOptions() {
  if (!IS_MAC) return { autoHideMenuBar: true };
  return {
    autoHideMenuBar: false,
    titleBarStyle: 'default',
  };
}

function platformCapabilities() {
  return {
    platform: PLATFORM,
    arch: ARCH,
    nativeTrafficLights: IS_MAC,
    desktopLyrics: true,
    desktopLyricsGlobalMiddleClick: IS_WINDOWS,
    wallpaperMode: IS_WINDOWS,
    quickResourcePatches: IS_WINDOWS,
    updatePackageExtensions: IS_MAC ? ['dmg', 'zip'] : (IS_WINDOWS ? ['exe', 'msi'] : ['AppImage', 'deb', 'rpm', 'zip']),
  };
}

function isTrustedLocalOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  } catch (_) {
    return false;
  }
}

function installPermissionHandlers(electronSession) {
  if (!electronSession) return;
  electronSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details = {}) => {
    if (permission !== 'media' || !isTrustedLocalOrigin(requestingOrigin)) return false;
    const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
    return mediaTypes.includes('video') && !mediaTypes.includes('audio');
  });
  electronSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.requestingUrl || (webContents && webContents.getURL && webContents.getURL()) || '';
    if (permission !== 'media' || !isTrustedLocalOrigin(origin)) {
      callback(false);
      return;
    }
    const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
    callback(mediaTypes.includes('video') && !mediaTypes.includes('audio'));
  });
}

function buildApplicationMenu({ app, dispatchAction, openExternal }) {
  const send = (action) => {
    if (typeof dispatchAction === 'function') dispatchAction(action);
  };
  const template = [];

  if (IS_MAC) {
    template.push({
      label: APP_NAME,
      submenu: [
        { role: 'about', label: `关于 ${APP_NAME}` },
        { type: 'separator' },
        { label: '设置…', accelerator: 'Command+,', click: () => send('open-settings') },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: `隐藏 ${APP_NAME}` },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: `退出 ${APP_NAME}` },
      ],
    });
  }

  template.push(
    {
      label: '文件',
      submenu: [
        { label: IS_MAC ? '在 Finder 中显示已下载更新' : '在文件夹中显示已下载更新', click: () => send('show-downloaded-update') },
        { type: 'separator' },
        IS_MAC
          ? { role: 'close', label: '关闭窗口', accelerator: 'Command+W' }
          : { label: '关闭窗口', accelerator: 'Ctrl+W', click: () => send('close-window') },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '播放',
      submenu: [
        { label: '播放 / 暂停', click: () => send('toggle-play') },
        { label: '上一首', click: () => send('previous-track') },
        { label: '下一首', click: () => send('next-track') },
      ],
    },
    {
      label: '显示',
      submenu: [
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        {
          label: '进入 / 退出全屏',
          accelerator: IS_MAC ? 'Ctrl+Command+F' : 'F11',
          click: () => send('toggle-fullscreen'),
        },
      ],
    },
    {
      label: '窗口',
      submenu: IS_MAC
        ? [
            { role: 'minimize', label: '最小化', accelerator: 'Command+M' },
            { role: 'zoom', label: '缩放' },
            { type: 'separator' },
            { role: 'front', label: '前置全部窗口' },
          ]
        : [
            { label: '最小化', click: () => send('minimize-window') },
            { label: '显示主窗口', click: () => send('show-main') },
          ],
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        { label: '使用引导', click: () => send('show-guide') },
        { label: '检查更新', click: () => send('open-update') },
        { type: 'separator' },
        {
          label: 'Mineradio GitHub',
          click: () => openExternal('https://github.com/XxHuberrr/Mineradio'),
        },
      ],
    },
  );

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  nativeTheme.themeSource = 'system';
  return menu;
}

function createMacStatusItem({ app, projectRoot, dispatchAction, showMainWindow }) {
  if (!IS_MAC) return null;
  const iconPath = path.join(projectRoot, 'build', 'icon-mac.png');
  const sourceImage = nativeImage.createFromPath(iconPath);
  if (app.dock && !sourceImage.isEmpty()) app.dock.setIcon(sourceImage);
  let image = sourceImage;
  if (!image.isEmpty()) {
    image = image.resize({ width: 18, height: 18, quality: 'best' });
    image.setTemplateImage(true);
  }
  const tray = new Tray(image);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 Mineradio', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '播放 / 暂停', click: () => dispatchAction('toggle-play') },
    { label: '上一首', click: () => dispatchAction('previous-track') },
    { label: '下一首', click: () => dispatchAction('next-track') },
    { type: 'separator' },
    { label: '设置…', click: () => dispatchAction('open-settings') },
    { type: 'separator' },
    { label: '退出 Mineradio', click: () => app.quit() },
  ]));
  tray.on('click', () => showMainWindow());

  if (app.dock) {
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: '播放 / 暂停', click: () => dispatchAction('toggle-play') },
      { label: '上一首', click: () => dispatchAction('previous-track') },
      { label: '下一首', click: () => dispatchAction('next-track') },
    ]));
  }
  return tray;
}

function isAllowedExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_) {
    return false;
  }
}

module.exports = {
  PLATFORM,
  ARCH,
  IS_MAC,
  IS_WINDOWS,
  appendChromiumSwitches,
  configureRuntimePaths,
  browserWindowIcon,
  mainWindowChromeOptions,
  loginWindowChromeOptions,
  platformCapabilities,
  installPermissionHandlers,
  buildApplicationMenu,
  createMacStatusItem,
  isAllowedExternalUrl,
};
