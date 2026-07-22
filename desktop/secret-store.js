const fs = require('fs');
const path = require('path');

const SECRET_HEADER = Buffer.from('MRSECRET1\0', 'utf8');

function getSafeStorage() {
  try {
    const electron = require('electron');
    if (electron && electron.safeStorage && typeof electron.safeStorage.isEncryptionAvailable === 'function') {
      return electron.safeStorage;
    }
  } catch (_) {}
  return null;
}

function secretDirectory() {
  return process.env.MINERADIO_SECRET_DIR || path.join(path.dirname(process.env.COOKIE_FILE || __dirname), 'secrets');
}

function secretFile(name) {
  const safeName = String(name || 'secret').replace(/[^a-z0-9_.-]+/gi, '-').slice(0, 80);
  return path.join(secretDirectory(), `${safeName}.bin`);
}

function encryptionAvailable() {
  const safeStorage = getSafeStorage();
  try {
    return !!(safeStorage && safeStorage.isEncryptionAvailable());
  } catch (_) {
    return false;
  }
}

function readEncryptedSecret(name) {
  const file = secretFile(name);
  if (!fs.existsSync(file) || !encryptionAvailable()) return '';
  try {
    const raw = fs.readFileSync(file);
    if (raw.length <= SECRET_HEADER.length || !raw.subarray(0, SECRET_HEADER.length).equals(SECRET_HEADER)) return '';
    return getSafeStorage().decryptString(raw.subarray(SECRET_HEADER.length));
  } catch (error) {
    console.warn(`[SecretStore] unable to decrypt ${name}:`, error.message);
    return '';
  }
}

function removeFile(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function writeEncryptedSecret(name, value) {
  const file = secretFile(name);
  const text = String(value || '');
  if (!text) {
    removeFile(file);
    return true;
  }
  if (!encryptionAvailable()) return false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const encrypted = getSafeStorage().encryptString(text);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, Buffer.concat([SECRET_HEADER, encrypted]), { mode: 0o600 });
    fs.renameSync(tmp, file);
    try { fs.chmodSync(file, 0o600); } catch (_) {}
    return true;
  } catch (error) {
    console.warn(`[SecretStore] unable to persist ${name}:`, error.message);
    return false;
  }
}

function readSecret(name, legacyFile) {
  const encrypted = readEncryptedSecret(name);
  if (encrypted) return encrypted;
  if (!legacyFile || !fs.existsSync(legacyFile)) return '';
  try {
    const legacy = fs.readFileSync(legacyFile, 'utf8').trim();
    if (!legacy) {
      removeFile(legacyFile);
      return '';
    }
    if (writeEncryptedSecret(name, legacy)) removeFile(legacyFile);
    return legacy;
  } catch (_) {
    return '';
  }
}

function writeSecret(name, value, legacyFile) {
  const text = String(value || '');
  if (writeEncryptedSecret(name, text)) {
    removeFile(legacyFile);
    return true;
  }

  // `node server.js` remains useful for development even though Electron's
  // Keychain/DPAPI-backed safeStorage API is unavailable in a plain Node process.
  if (!process.versions.electron && legacyFile) {
    try {
      if (!text) {
        removeFile(legacyFile);
        return true;
      }
      fs.writeFileSync(legacyFile, text, { mode: 0o600 });
      try { fs.chmodSync(legacyFile, 0o600); } catch (_) {}
      return true;
    } catch (_) {}
  }
  return false;
}

module.exports = {
  encryptionAvailable,
  readSecret,
  writeSecret,
};
