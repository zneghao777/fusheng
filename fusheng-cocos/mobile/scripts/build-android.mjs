import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { root, run, sync } from './sync.mjs';

await sync();
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(root, '.tools/android-sdk');
if (!existsSync(path.join(sdk, 'platforms/android-36/android.jar'))) throw new Error(`未找到 Android SDK 36：${sdk}`);
const candidates = [process.env.JAVA_HOME, '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home'];
const java = candidates.find(candidate => {
  if (!candidate || !existsSync(path.join(candidate, 'bin/java'))) return false;
  const result = spawnSync(path.join(candidate, 'bin/java'), ['-version'], { encoding: 'utf8' });
  const version = (result.stderr + result.stdout).match(/version "(?:1\.)?(\d+)/);
  return result.status === 0 && Number(version?.[1]) >= 21;
});
if (!java) throw new Error('需要 JDK 21 或更新版本，请设置 JAVA_HOME。');
await fs.writeFile(path.join(root, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '\\\\')}\n`);
run('./gradlew', ['--no-daemon', 'assembleDebug', 'lintDebug'], { cwd: path.join(root, 'android'), env: { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk } });
const filename = 'fusheng-0.6.5-android-debug.apk';
await fs.copyFile(path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), path.join(root, 'output', filename));
console.log(`Android 安装包：${path.join(root, 'output', filename)}`);
