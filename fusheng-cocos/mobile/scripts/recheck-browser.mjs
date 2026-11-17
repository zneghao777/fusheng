import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);
const first = JSON.parse(await fs.readFile('mobile/output/browser-qa-first.json', 'utf8'));
const source = (await fs.readFile('tools/browser-life-course.js', 'utf8')).replaceAll('http://127.0.0.1:8919/', first.baseURL);
const suite = new Function(`return (${source.trim().replace(/;$/, '')});`)();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  context.setDefaultTimeout(30000);
  context.setDefaultNavigationTimeout(45000);
  const result = await suite(await context.newPage());
  const passed = result.checks.length > 0 && result.checks.every(check => check.passed) && result.errors.length === 0 && !result.failure;
  await fs.writeFile('mobile/output/browser-course-recheck.json', JSON.stringify(result, null, 2) + '\n');
  const suites = [{ engine: 'Chromium', script: 'browser-life-course.js', passed, report: result }, ...first.suites.filter(item => item.script !== 'browser-life-course.js')];
  const report = { baseURL: first.baseURL, completedAt: new Date().toISOString(), server: 'ThreadingHTTPServer, HTTP/1.1, request_queue_size=256', recheckedSuite: 'browser-life-course.js', suites, passed: suites.every(item => item.passed), checks: suites.flatMap(item => item.report.checks) };
  await fs.writeFile('mobile/output/browser-qa-final.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failure: result.failure, errors: result.errors }));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
}
