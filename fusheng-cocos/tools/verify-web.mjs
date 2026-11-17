import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const screenshotDir = path.resolve('output/playwright/life-course');
const reportPath = path.resolve('output/life-course-checks.json');
await fs.mkdir(screenshotDir, { recursive: true });
const startedAt = Date.now();
const report = { startedAt: new Date(startedAt).toISOString(), baseURL: '', passed: false, checks: [], errors: [], screens: [], suites: [] };

function siteRoot(value) {
 const url = new URL(value);
 if (!['http:', 'https:'].includes(url.protocol)) throw new Error('FUSHENG_WEB_URL must use HTTP or HTTPS.');
 url.pathname = url.pathname.replace(/\/(?:web-desktop|web-mobile)(?:\/.*)?$/, '/');
 if (!url.pathname.endsWith('/')) url.pathname += '/';
 url.search = ''; url.hash = '';
 return url.href;
}
function hasFailures(value) {
 if (!value || typeof value !== 'object' || !Array.isArray(value.checks) || value.checks.length === 0) return true;
 if (value.failure || value.checks.some(check => check.passed !== true)) return true;
 if (value.errors && (Array.isArray(value.errors) ? value.errors.length > 0 : Object.keys(value.errors).length > 0)) return true;
 return Object.entries(value).some(([key, failed]) => /^failedchecks?$/i.test(key) && (Array.isArray(failed) ? failed.length > 0 : !!failed));
}
async function loadSuite(script) {
 const sourcePath = path.resolve('tools', script);
 const source = (await fs.readFile(sourcePath, 'utf8')).replaceAll('http://127.0.0.1:8919/', report.baseURL);
 const suite = new Function(`return (${source.trim().replace(/;$/, '')});`)();
 if (typeof suite !== 'function') throw new Error(script + ' must contain an async page => report function.');
 return suite;
}
async function runEngine(name, engine, scripts, launchOptions) {
 let browser;
 try {
  browser = await engine.launch(launchOptions);
 } catch (error) {
  const failure = name + ' launch failed: ' + String(error);
  report.errors.push(failure);
  report.suites.push({ engine: name, passed: false, failure });
  console.error('FAIL ' + failure);
  return;
 }
 try {
  for (const script of scripts) {
   const suiteResult = { engine: name, script, passed: false };
   const suiteStartedAt = Date.now();
   try {
    const mobile = name === 'WebKit' || script === 'browser-life-journey.js';
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, deviceScaleFactor: 2, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
    context.setDefaultTimeout(30000);
    context.setDefaultNavigationTimeout(45000);
    const page = await context.newPage();
    const suite = await loadSuite(script);
    const result = await suite(page);
    suiteResult.report = result;
    suiteResult.passed = !hasFailures(result);
    if (result && typeof result === 'object') {
     if (Array.isArray(result.checks)) report.checks.push(...result.checks.map(check => ({ engine: name, suite: script, ...check })));
     if (Array.isArray(result.errors)) report.errors.push(...result.errors.map(error => name + '/' + script + ': ' + String(error)));
     if (result.failure) report.errors.push(name + '/' + script + ': ' + String(result.failure));
     if (Array.isArray(result.screens)) report.screens.push(...result.screens);
    }
    if (!suiteResult.passed && !result?.failure) report.errors.push(name + '/' + script + ': suite returned missing checks, failed checks, or errors.');
   } catch (error) {
    suiteResult.failure = String(error);
    report.errors.push(name + '/' + script + ': ' + String(error));
   } finally {
    // A suite can create its own touch contexts. Close all of them before the next suite so local storage and listeners stay isolated.
    for (const context of browser.contexts()) {
     try { await context.close(); } catch (error) { suiteResult.passed = false; report.errors.push(name + '/' + script + ' context close failed: ' + String(error)); }
    }
    suiteResult.durationMs = Date.now() - suiteStartedAt;
    report.suites.push(suiteResult);
    console.log((suiteResult.passed ? 'PASS ' : 'FAIL ') + name + '/' + script + ' (' + suiteResult.durationMs + ' ms)');
   }
  }
 } finally {
  try { await browser.close(); } catch (error) { report.errors.push(name + ' close failed: ' + String(error)); }
 }
}
try {
 report.baseURL = siteRoot(process.env.FUSHENG_WEB_URL ?? 'http://127.0.0.1:8088/');
 const selection = process.argv.find(arg => arg.startsWith('--engine='))?.split('=')[1] ?? 'all';
 if (!['all','webkit'].includes(selection)) throw new Error('Use --engine=webkit to resume only a missing WebKit suite.');
 if(selection==='webkit'){
  const previous=JSON.parse(await fs.readFile(reportPath,'utf8'));
  const chromiumSuites=previous.suites.filter(suite=>suite.engine==='Chromium');
  if(previous.baseURL!==report.baseURL||chromiumSuites.length!==3||chromiumSuites.some(suite=>!suite.passed))throw new Error('A matching report with three successful Chromium suites is required.');
  report.suites.push(...chromiumSuites);
  report.checks.push(...previous.checks.filter(check=>check.engine==='Chromium'));
  report.errors.push(...previous.errors.filter(error=>!String(error).startsWith('WebKit')));
  report.screens.push(...chromiumSuites.flatMap(suite=>suite.report?.screens??[]));
  report.resumedChromiumAt=previous.startedAt;
 }
 if(selection==='all')await runEngine('Chromium', chromium, ['browser-life-course.js', 'browser-life-saves.js', 'browser-life-journey.js'], { channel: 'chrome', headless: true });
 await runEngine('WebKit', webkit, ['browser-life-webkit.js'], { headless: true });
} catch (error) {
 report.errors.push(String(error));
} finally {
 report.durationMs = Date.now() - startedAt;
 report.contentHash=createHash('sha256').update(await fs.readFile('assets/resources/config/content.json')).digest('hex');
 report.passed = report.suites.length === 4 && report.suites.every(suite => suite.passed) && report.errors.length === 0;
 await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
 console.log(JSON.stringify({ passed: report.passed, suites: report.suites.length, checks: report.checks.length, errors: report.errors.length, durationMs: report.durationMs, report: reportPath }));
 if (!report.passed) process.exitCode = 1;
}
