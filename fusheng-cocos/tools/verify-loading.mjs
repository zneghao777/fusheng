import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.FUSHENG_WEB_URL ?? 'http://127.0.0.1:8088/web-desktop/';
const mobileURL = baseURL.replace('/web-desktop/', '/web-mobile/');
const output = path.resolve('output/playwright/loading');
await fs.mkdir(output, { recursive: true });
const report = { checks: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function trackTiming(page) {
  await page.addInitScript(() => {
    const times = window.__LOADING_TIMES__ = {};
    document.addEventListener('load', event => {
      if (event.target?.matches?.('.loading-art')) times.artLoaded = performance.now();
    }, true);
    window.addEventListener('fusheng:ready', () => { times.gameReady = performance.now(); });
    const observer = new MutationObserver(() => {
      if (document.querySelector('#fusheng-loading.is-leaving') && times.fadeStarted === undefined) {
        times.fadeStarted = performance.now();
      }
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
}
function check(name, passed, detail) {
  report.checks.push({ name, passed: !!passed, detail });
  if (!passed) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  console.log(`PASS ${name}`);
}
function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
async function waitForArt(page) {
  await page.waitForFunction(() => {
    const image = document.querySelector('#fusheng-loading .loading-art');
    return image?.complete && image.naturalWidth > 0;
  });
}
async function ready(page) {
  await page.locator('#fusheng-loading').waitFor({ state: 'detached' });
  await page.waitForFunction(() => window.__FUSHENG__?.frameCount > 2 && window.__FUSHENG__.artPending === 0);
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`) });
}
async function holdEngine(page) {
  const engine = gate();
  await page.route('**/index.*.js', async route => {
    await engine.promise;
    await route.continue();
  });
  return engine;
}
function observe(page) {
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text());
  });
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  observe(page);
  await trackTiming(page);
  const engine = await holdEngine(page);
  const assets = gate();
  const assetRequested = gate();
  await page.route('**/assets/resources/native/**', async route => {
    assetRequested.release();
    await assets.promise;
    await route.continue();
  });
  await page.goto(`${baseURL}?test=1`, { waitUntil: 'domcontentloaded' });
  await waitForArt(page);
  await page.waitForSelector('#fusheng-loading.has-character-motion');
  check('illustration-visible-before-engine', await page.locator('#fusheng-loading').isVisible());
  const first = await page.locator('.loading-room').evaluate(el => getComputedStyle(el).transform);
  const firstCharacters = await page.locator('.painter-action, .gardener-action').evaluateAll(elements => elements.map(el => getComputedStyle(el).transform));
  await page.waitForTimeout(450);
  const motion = await page.evaluate(() => ({
    transform: getComputedStyle(document.querySelector('.loading-room')).transform,
    characters: [...document.querySelectorAll('.painter-action, .gardener-action')].map(el => getComputedStyle(el).transform),
    dots: [...document.querySelectorAll('.loading-dot')].map(el => getComputedStyle(el).opacity),
    text: document.querySelector('.loading-message').textContent,
  }));
  check('subtle-art-motion', first !== motion.transform, motion.transform);
  check('both-characters-have-independent-actions', motion.characters.every((transform, index) => transform !== firstCharacters[index]), motion.characters);
  check('staggered-loading-dots', new Set(motion.dots).size > 1 && motion.text === '加载中', motion.dots);
  await screenshot(page, 'desktop-loading');
  engine.release();
  await assetRequested.promise;
  await page.waitForFunction(() => performance.now() - window.__LOADING_TIMES__.artLoaded >= 3300);
  check('overlay-stays-while-game-assets-load', await page.locator('#fusheng-loading').isVisible());
  assets.release();
  await ready(page);
  const slowTiming = await page.evaluate(() => window.__LOADING_TIMES__);
  check('slow-load-exits-when-ready-after-minimum', slowTiming.fadeStarted - slowTiming.gameReady < 1000, slowTiming);
  const splashTime = await page.evaluate(async () => {
    const cc = await window.System.import('cc');
    return cc.settings.querySettings('splashScreen', 'totalTime');
  });
  check('cocos-default-splash-disabled', splashTime === 0, splashTime);
  check('ready-dismisses-overlay', await page.locator('#fusheng-loading').count() === 0);
  await screenshot(page, 'desktop-ready');
  const newButton = await page.evaluate(() => window.__FUSHENG__.buttons.find(button => button.key === 'ui.new'));
  await page.mouse.click(640 + newButton.x, 360 - newButton.y);
  await page.waitForFunction(() => window.__FUSHENG__.screen === 'Create');
  check('game-input-works-after-loading', true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  const fastTiming = await page.evaluate(() => window.__LOADING_TIMES__);
  check('cached-load-shows-art-for-at-least-three-seconds', fastTiming.fadeStarted - fastTiming.artLoaded >= 3000, fastTiming);
  check('three-seconds-count-from-illustration-not-game-ready', fastTiming.gameReady < fastTiming.artLoaded + 2500 && fastTiming.fadeStarted - fastTiming.artLoaded < 3500, fastTiming);

  const mobile = await browser.newContext({
    viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const touch = await mobile.newPage();
  observe(touch);
  const mobileEngine = await holdEngine(touch);
  await touch.goto(`${mobileURL}?test=1&touch=1`, { waitUntil: 'domcontentloaded' });
  await waitForArt(touch);
  await screenshot(touch, 'mobile-loading');
  const bounds = await touch.locator('.loading-status').boundingBox();
  check('mobile-status-inside-viewport', bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 844 && bounds.y + bounds.height <= 390, bounds);
  check('landscape-preserves-entire-illustration', await touch.locator('.loading-art').evaluate(el => getComputedStyle(el).objectFit) === 'contain');
  await touch.setViewportSize({ width: 390, height: 844 });
  // Give Chrome's mobile compositor time to finish the orientation change.
  await touch.waitForTimeout(300);
  await screenshot(touch, 'portrait-loading');
  check('portrait-preserves-entire-illustration', await touch.locator('.loading-art').evaluate(el => getComputedStyle(el).objectFit) === 'contain');
  mobileEngine.release();
  await ready(touch);
  check('mobile-load-completes', true);

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const still = await reduced.newPage();
  observe(still);
  const stillEngine = await holdEngine(still);
  await still.goto(`${baseURL}?test=1`, { waitUntil: 'domcontentloaded' });
  await waitForArt(still);
  const animationNames = await still.locator('.loading-room, .painter-action, .gardener-action, .water-drops, .loading-dot').evaluateAll(elements => elements.map(el => getComputedStyle(el).animationName));
  check('reduced-motion-respected', animationNames.every(name => name === 'none'), animationNames);
  stillEngine.release();
  await ready(still);
  check('no-unexpected-runtime-errors', report.errors.length === 0, report.errors);

  const delayedArt = await context.newPage();
  await trackTiming(delayedArt);
  const imageGate = gate();
  await delayedArt.route('**/loading/illustration.*.jpg', async route => {
    await imageGate.promise;
    await route.continue();
  });
  await delayedArt.goto(`${baseURL}?test=1`, { waitUntil: 'domcontentloaded' });
  await delayedArt.waitForFunction(() => window.__FUSHENG__?.frameCount > 2);
  check('game-ready-cannot-dismiss-unloaded-illustration', await delayedArt.locator('#fusheng-loading').isVisible());
  imageGate.release();
  await ready(delayedArt);
  const delayedTiming = await delayedArt.evaluate(() => window.__LOADING_TIMES__);
  check('late-illustration-still-gets-full-three-seconds', delayedTiming.fadeStarted - delayedTiming.artLoaded >= 3000, delayedTiming);

  const staticFallback = await context.newPage();
  await staticFallback.route('**/loading/action-clean-plate.*.jpg', route => route.abort('failed'));
  await staticFallback.goto(`${baseURL}?test=1`, { waitUntil: 'domcontentloaded' });
  await waitForArt(staticFallback);
  check('missing-motion-asset-keeps-original-art', await staticFallback.locator('.loading-art').isVisible() && await staticFallback.locator('#fusheng-loading.has-character-motion').count() === 0);
  await ready(staticFallback);
  check('missing-motion-asset-does-not-block-game', true);

  // A failed entry script must leave a usable retry, rather than a permanent spinner.
  const failure = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await failure.route('**/src/system.bundle.*.js', route => route.abort('failed'), { times: 1 });
  await failure.goto(`${baseURL}?test=1`, { waitUntil: 'domcontentloaded' });
  await failure.locator('.loading-retry').waitFor({ state: 'visible' });
  check('script-failure-exposes-retry', await failure.locator('.loading-message').textContent() === '加载未完成，请重试');
  check('failure-stops-loading-dots', await failure.locator('.loading-dots').isHidden());
  await failure.locator('.loading-retry').click();
  await ready(failure);
  check('retry-reloads-game-successfully', true);
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'checks.json'), JSON.stringify(report, null, 2));
}
