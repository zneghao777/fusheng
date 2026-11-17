import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../web-loading/', import.meta.url));

export async function installLoadingScreen(target) {
  await fs.mkdir(path.join(target, 'loading'), { recursive: true });
  const copyAsset = async name => {
    const bytes = await fs.readFile(path.join(source, `${name}.jpg`));
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const filename = `${name}.${hash}.jpg`;
    await fs.writeFile(path.join(target, 'loading', filename), bytes);
    return `./loading/${filename}`;
  };
  const art = await copyAsset('illustration');
  const cleanPlate = await copyAsset('action-clean-plate');
  const fragment = (await fs.readFile(path.join(source, 'loading.html'), 'utf8'))
    .replaceAll('{{LOADING_ART}}', art)
    .replaceAll('{{LOADING_CLEAN_PLATE}}', cleanPlate);
  const index = path.join(target, 'index.html');
  let html = (await fs.readFile(index, 'utf8'))
    .replace(/<!-- fusheng-loading:start -->[\s\S]*?<!-- fusheng-loading:end -->/g, '')
    .replace(/<link\b[^>]*data-fusheng-loading[^>]*>/g, '');
  if (!html.includes('</head>') || !/<body\b[^>]*>/.test(html)) {
    throw new Error(`Unrecognized Cocos HTML entry: ${index}`);
  }
  html = html.replace('</head>', `<link data-fusheng-loading rel="preload" as="image" href="${art}" fetchpriority="high">\n</head>`)
    .replace(/<body\b[^>]*>/, (body) => `${body}\n${fragment}`);
  await fs.writeFile(index, html);
}
