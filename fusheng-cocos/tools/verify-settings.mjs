import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('.impeccable/review', { recursive: true });
const report = { checks: [], errors: [] };
function check(name, passed, detail) {
    report.checks.push({ name, passed: !!passed, detail });
    if (!passed) throw Error(name + ': ' + JSON.stringify(detail));
    console.log('PASS', name);
}
const settled = page => page.waitForFunction(() => window.__FUSHENG__?.frameCount > 25 && !document.querySelector('#fusheng-loading') && window.__FUSHENG__.ui.root.getComponentsInChildren('cc.UIOpacity').every(c => !c.node.activeInHierarchy || c.opacity === 255));
async function point(page, key, offset = 0) {
    const b = await page.evaluate(key => {
        const button = window.__FUSHENG__.ui.buttons.find(b => b.key === key);
        const p = button.node.worldPosition, s = button.node.worldScale;
        return { x: p.x, y: p.y, scale: s.x };
    }, key);
    const { width, height } = page.viewportSize(), scale = Math.min(width / 1280, height / 720);
    return { x: width / 2 + (b.x + offset * b.scale) * scale, y: height / 2 - b.y * scale };
}
async function click(page, key, touch = false) {
    const p = await point(page, key);
    if (touch) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
    await settled(page);
}
async function dragVolume(page, touch = false) {
    const from = await point(page, 'ui.musicVolume', -146 + 292 * .25);
    const to = await point(page, 'ui.musicVolume', -146 + 292 * .75);
    if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 8, y: from.y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
    } else {
        await page.mouse.move(from.x, from.y); await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
    }
    check((touch ? 'touch' : 'mouse') + '-volume-drag', await page.evaluate(() => window.__FUSHENG__.music.volume === .75 && JSON.parse(localStorage.getItem('fs.music')).volume === .75), await page.evaluate(() => window.__FUSHENG__.music.volume));
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    for (const target of [
        { name: 'desktop', width: 1280, height: 720, touch: false },
        { name: 'mobile', width: 844, height: 390, touch: true },
        { name: 'user-790', width: 790, height: 717, touch: false },
    ]) {
        const context = await browser.newContext({ viewport: { width: target.width, height: target.height }, hasTouch: target.touch, isMobile: target.touch });
        const page = await context.newPage();
        page.on('pageerror', e => report.errors.push(String(e)));
        await page.goto('http://127.0.0.1:8088/web-' + (target.touch ? 'mobile' : 'desktop') + '/?test=1' + (target.touch ? '&touch=1' : ''));
        await settled(page);
        if (target.touch) {
            const size = await page.evaluate(() => { const n = window.__FUSHENG__.ui.buttons.find(b => b.key === 'ui.settings').node; return { width: n.getComponent('cc.UITransform').width * n.worldScale.x, height: n.getComponent('cc.UITransform').height * n.worldScale.y }; });
            const scale = Math.min(target.width / 1280, target.height / 720);
            check('touch-entry-hit-area', size.width * scale >= 44 && size.height * scale >= 44, size);
        }
        await page.screenshot({ path: '.impeccable/review/' + target.name + '-title.png' });
        await click(page, 'ui.settings', target.touch);
        check(target.name + '-opens-sheet', await page.evaluate(() => window.__FUSHENG__.screen === 'Settings'));
        if (target.touch) {
            const size = await page.evaluate(() => { const n = window.__FUSHENG__.ui.buttons.find(b => b.key === 'ui.close').node; return n.getComponent('cc.UITransform').height * n.worldScale.y; });
            check('touch-close-hit-area', size * Math.min(target.width / 1280, target.height / 720) >= 44, size);
        }
        if (target.name === 'user-790') {
            const sizes = await page.evaluate(() => window.__FUSHENG__.ui.root.getComponentsInChildren('cc.Label').filter(l => ['背景音乐', '音量'].includes(l.string)).map(l => ({ text: l.string, size: l.fontSize * l.node.worldScale.x })));
            check('small-window-readable-labels', sizes.length === 2 && sizes.every(l => l.size * 790 / 1280 >= (l.text === '音量' ? 12 : 12.9)), sizes);
        }
        await dragVolume(page, target.touch);
        await click(page, 'ui.audio', target.touch);
        check(target.name + '-music-toggle', await page.evaluate(() => window.__FUSHENG__.music.muted));
        await click(page, 'ui.audio', target.touch);
        await click(page, 'ui.fontLarge', target.touch);
        check(target.name + '-font-choice', await page.evaluate(() => window.__FUSHENG__.ui.sim.settings.fontScale === 1.3));
        await click(page, 'ui.motion', target.touch);
        check(target.name + '-reduced-motion', await page.evaluate(() => window.__FUSHENG__.ui.sim.settings.reduceMotion));
        await click(page, 'ui.fontStandard', target.touch);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: '.impeccable/review/' + target.name + '.png' });
        // Clicking the sheet's heading must not dismiss it or reach the title below.
        const heading = await point(page, 'ui.close', -100);
        if (target.touch) await page.touchscreen.tap(heading.x, heading.y); else await page.mouse.click(heading.x, heading.y);
        check(target.name + '-inside-sheet-keeps-open', await page.evaluate(() => window.__FUSHENG__.screen === 'Settings'));
        const left = { x: target.width * .12, y: target.height / 2 };
        if (target.touch) await page.touchscreen.tap(left.x, left.y); else await page.mouse.click(left.x, left.y);
        check(target.name + '-outside-dismiss', await page.evaluate(() => window.__FUSHENG__.screen === 'Title'));
        await click(page, 'ui.settings', target.touch);
        await click(page, 'ui.close', target.touch);
        check(target.name + '-close-button', await page.evaluate(() => window.__FUSHENG__.screen === 'Title'));
        if (!target.touch) {
            await click(page, 'ui.settings');
            await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
            await page.keyboard.press('ArrowLeft');
            check(target.name + '-keyboard-slider', await page.evaluate(() => window.__FUSHENG__.music.volume === .7));
            await page.keyboard.press('Escape');
            check(target.name + '-escape-returns', await page.evaluate(() => window.__FUSHENG__.screen === 'Title' && window.__FUSHENG__.buttons.some(b => b.key === 'ui.new')));
        }
        await page.evaluate(() => window.__FUSHENG__.ui.debugStart());
        await settled(page);
        await page.evaluate(() => window.__FUSHENG__.ui.open('Pause'));
        // Pause uses a scrolling action list; the owned debug entry opens its same settings action.
        await page.evaluate(() => window.__FUSHENG__.ui.activate('ui.settings'));
        await settled(page);
        await click(page, 'ui.close', target.touch);
        check(target.name + '-returns-to-pause', await page.evaluate(() => window.__FUSHENG__.screen === 'Pause'));
        await context.close();
    }
    check('no-runtime-errors', report.errors.length === 0, report.errors);
} catch (error) { report.errors.push(String(error)); process.exitCode = 1; }
finally {
    await browser.close();
    await fs.writeFile('output/settings-checks.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
