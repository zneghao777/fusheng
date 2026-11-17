import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
}
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(path.join(directory, entry.name), relative));
    else if (entry.isFile()) {
      const bytes = await fs.readFile(path.join(directory, entry.name));
      files.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return files;
}
export async function sync() {
  const source = path.resolve(root, '../build/web-mobile');
  const index = await fs.readFile(path.join(source, 'index.html'), 'utf8');
  if (!index.includes('fusheng-loading')) throw new Error('先运行项目根目录的 npm run build:web -- web-mobile。');
  const before = await inventory(source);
  await fs.rm(path.join(root, 'www'), { recursive: true, force: true });
  await fs.cp(source, path.join(root, 'www'), { recursive: true });
  const snapshot = await inventory(path.join(root, 'www'));
  const after = await inventory(source);
  if (JSON.stringify(before) !== JSON.stringify(snapshot) || JSON.stringify(after) !== JSON.stringify(snapshot)) {
    throw new Error('Web 构建在复制期间发生变化，请等待构建结束后重新同步。');
  }
  // Native and browser builds use the same full-bleed viewport. Only controls
  // consume safe-area insets; the paper background continues under the cutout.
  const packaged = await inventory(path.join(root, 'www'));
  run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync']);
  await fs.mkdir(path.join(root, 'output'), { recursive: true });
  const manifest = { version: '0.6.5', appId: 'com.fusheng.paperhouse', createdAt: new Date().toISOString(), webBuild: '../build/web-mobile', sourceFiles: before, totalBytes: packaged.reduce((sum, file) => sum + file.bytes, 0), files: packaged };
  await fs.writeFile(path.join(root, 'output/web-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`已同步 ${snapshot.length} 个本地资源，${(manifest.totalBytes / 1024 / 1024).toFixed(1)} MiB。`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await sync();
