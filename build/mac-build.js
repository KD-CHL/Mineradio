const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectDir = path.join(__dirname, '..');
const builderPath = path.join(projectDir, 'node_modules', '.bin', 'electron-builder');
const target = String(process.argv[2] || 'dmg').toLowerCase();
const architectures = process.argv.slice(3).map((value) => String(value).toLowerCase());
const allowedTargets = new Set(['dmg', 'dir']);
const allowedArchitectures = new Set(['arm64', 'x64', 'universal']);

if (process.platform !== 'darwin') {
  console.error('macOS 构建必须在 macOS 主机上执行。');
  process.exit(1);
}
if (!allowedTargets.has(target)) {
  console.error(`不支持的 macOS 构建目标：${target}`);
  process.exit(1);
}
if (!architectures.length || architectures.some((arch) => !allowedArchitectures.has(arch))) {
  console.error('请指定 arm64、x64 或 universal 架构。');
  process.exit(1);
}
if (architectures.includes('universal') && architectures.length > 1) {
  console.error('universal 必须单独构建。');
  process.exit(1);
}
if (!fs.existsSync(builderPath)) {
  console.error('缺少 electron-builder，请先执行 npm ci（或 npm install）。');
  process.exit(1);
}

const signingMode = String(process.env.MINERADIO_MAC_SIGNING || 'adhoc').trim().toLowerCase();
if (!['adhoc', 'developer'].includes(signingMode)) {
  console.error('MINERADIO_MAC_SIGNING 只能是 adhoc 或 developer。');
  process.exit(1);
}

const hasApiKeyCredentials = Boolean(
  process.env.APPLE_API_KEY
  && process.env.APPLE_API_KEY_ID
  && process.env.APPLE_API_ISSUER,
);
const hasAppleIdCredentials = Boolean(
  process.env.APPLE_ID
  && process.env.APPLE_APP_SPECIFIC_PASSWORD
  && process.env.APPLE_TEAM_ID,
);
const hasKeychainProfile = Boolean(
  process.env.APPLE_KEYCHAIN_PROFILE
  && process.env.APPLE_KEYCHAIN,
);
const hasNotaryCredentials = hasApiKeyCredentials || hasAppleIdCredentials || hasKeychainProfile;
const notarizationDisabled = process.env.MINERADIO_NOTARIZE === '0';
const shouldNotarize = signingMode === 'developer' && hasNotaryCredentials && !notarizationDisabled;

if (signingMode === 'developer' && target === 'dmg' && !shouldNotarize
    && process.env.MINERADIO_ALLOW_UNNOTARIZED_DEVELOPER !== '1') {
  console.error('Developer ID 的 DMG 发布构建需要公证凭据。若只做临时测试，请设置 MINERADIO_ALLOW_UNNOTARIZED_DEVELOPER=1。');
  process.exit(1);
}

const entitlements = signingMode === 'adhoc'
  ? 'build/entitlements.mac.adhoc.plist'
  : 'build/entitlements.mac.plist';
const args = [
  '--mac',
  target,
  ...architectures.map((arch) => `--${arch}`),
  '--config.forceCodeSigning=true',
  `--config.mac.entitlements=${entitlements}`,
  `--config.mac.entitlementsInherit=${entitlements}`,
  `--config.mac.notarize=${shouldNotarize ? 'true' : 'false'}`,
];

const env = { ...process.env };
if (signingMode === 'adhoc') {
  args.push('--config.mac.identity=-');
  env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
}

console.log(`[mac-build] target=${target} arch=${architectures.join(',')} signing=${signingMode} notarize=${shouldNotarize}`);
if (signingMode === 'adhoc') {
  console.log('[mac-build] 生成 ad-hoc 签名、本地测试用、未公证的构建。');
}

const result = spawnSync(builderPath, args, {
  cwd: projectDir,
  env,
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status == null ? 1 : result.status);
