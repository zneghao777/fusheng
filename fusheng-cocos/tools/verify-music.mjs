import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('output/playwright/music', { recursive: true });
const catalog = JSON.parse(await fs.readFile('assets/resources/config/music.json', 'utf8'));
const report = { available: catalog.tracks.filter(t => t.resource).map(t => t.id), checks: [], errors: [] };
const check = (name, passed, detail) => {
    report.checks.push({ name, passed: !!passed, detail });
    if (!passed) throw new Error(name + ': ' + JSON.stringify(detail));
    console.log('PASS', name);
};
const resolveTrack = id => {
    let track = catalog.tracks.find(item => item.id === id);
    const visited = new Set();
    while (track && !track.resource && !visited.has(track.id)) {
        visited.add(track.id);
        track = catalog.tracks.find(item => item.id === track.fallback);
    }
    return track?.resource ? track : undefined;
};
check('all-scenes-have-a-playable-track', catalog.tracks.every(track => resolveTrack(track.id)), report.available);
const waitMusic = async (page, id) => {
    const actual = resolveTrack(id).id;
    await page.waitForFunction(({ actual, requested }) => window.__FUSHENG__?.music.requested === requested && window.__FUSHENG__.music.current === actual && !window.__FUSHENG__.music.loading, { actual, requested: id }, { timeout: 20000 });
    check('scene-' + id, await page.evaluate(id => window.__FUSHENG__.music.requested === id, id), await page.evaluate(() => window.__FUSHENG__.music));
    check('decoded-full-track-' + id, await page.evaluate(() => window.__FUSHENG__.ui.platform.audio.voice.source.buffer.duration > 60));
};
const click = async (page, key, touch = false) => {
    const button = await page.evaluate(key => window.__FUSHENG__.buttons.find(b => b.key === key), key);
    if (!button) throw Error('Missing button ' + key);
    if (button.y < -220) {
        await page.evaluate(key => { const ui = window.__FUSHENG__.ui, b = ui.buttons.find(b => b.key === key); ui.scroll?.scrollToOffset({ x: 0, y: Math.max(0, -b.node.position.y - 120) }, 0); }, key);
    }
    const b = await page.evaluate(key => window.__FUSHENG__.buttons.find(b => b.key === key), key);
    const { width, height } = page.viewportSize(), scale = Math.min(width / 1280, height / 720);
    const x = width / 2 + b.x * scale, y = height / 2 - b.y * scale;
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await page.waitForFunction(() => window.__FUSHENG__.ui.root.getComponentsInChildren('cc.UIOpacity').every(c => !c.node.activeInHierarchy || c.opacity === 255));
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('requestfailed', request => report.errors.push(request.url() + ': ' + request.failure()?.errorText));
    await page.goto('http://127.0.0.1:8088/web-desktop/?test=1');
    await page.waitForFunction(() => window.__FUSHENG__?.frameCount > 20 && !document.querySelector('#fusheng-loading'));
    check('waits-for-user-gesture', await page.evaluate(() => window.__FUSHENG__.music.state === 'locked'));
    await click(page, 'ui.settings');
    await waitMusic(page, 'title');
    await page.screenshot({ path: 'output/playwright/music/desktop-settings.png' });

    // Measure decoded samples at the actual output node, rather than just a UI flag.
    await page.waitForFunction(() => {
        const a = window.__FUSHENG__.ui.platform.audio;
        if (!window.__musicAnalyser) { window.__musicAnalyser = a.context.createAnalyser(); window.__musicAnalyser.fftSize = 2048; a.master.connect(window.__musicAnalyser); }
        const samples = new Float32Array(2048); window.__musicAnalyser.getFloatTimeDomainData(samples);
        return samples.some(value => Math.abs(value) > .0001);
    });
    check('real-audio-output', true);
    await click(page, 'ui.audio');
    await page.waitForFunction(() => window.__FUSHENG__.music.gain === 0);
    check('mute-silences-output', await page.evaluate(() => window.__FUSHENG__.music.muted));
    await page.reload(); await page.waitForFunction(() => window.__FUSHENG__?.frameCount > 20 && !document.querySelector('#fusheng-loading'));
    check('mute-persists-after-reload', await page.evaluate(() => window.__FUSHENG__.music.muted && window.__FUSHENG__.music.state === 'locked'));
    await click(page, 'ui.settings'); await click(page, 'ui.audio'); await waitMusic(page, 'title');
    await click(page, 'ui.musicVolume');
    check('volume-updates-and-persists', await page.evaluate(() => window.__FUSHENG__.music.volume === .5 && JSON.parse(localStorage.getItem('fs.music')).volume === .5));
    await click(page, 'ui.musicCredits');
    await page.screenshot({ path: 'output/playwright/music/music-credits.png' });
    check('credits-accessible', await page.evaluate(() => window.__FUSHENG__.screen === 'MusicCredits'));
    await click(page, 'ui.back'); await click(page, 'ui.close');
    check('title-settings-return', await page.evaluate(() => window.__FUSHENG__.screen === 'Title'));

    await page.evaluate(() => { window.__FUSHENG__.ui.debugStart(); window.__FUSHENG__.state.clock = 700; });
    await waitMusic(page, 'day');
    await page.evaluate(() => window.__FUSHENG__.command({ type: 'Travel', scene: 'book' }));
    await waitMusic(page, 'book');
    await page.evaluate(() => window.__FUSHENG__.state.clock = 1320);
    await waitMusic(page, 'night');
    await page.evaluate(() => { const d = window.__FUSHENG__; d.state.day = 7; d.state.clock = 900; d.command({ type: 'Travel', scene: 'street' }); });
    await waitMusic(page, 'market');
    await page.evaluate(() => { const d = window.__FUSHENG__; d.state.panel = { kind: 'WeekRecap', body: '' }; });
    await waitMusic(page, 'recap');
    await page.evaluate(() => window.__FUSHENG__.ui.platform.audio.onHide());
    await page.waitForFunction(() => window.__FUSHENG__.music.state === 'suspended');
    check('background-pauses-audio', await page.evaluate(() => window.__FUSHENG__.music.hidden));
    await page.evaluate(() => window.__FUSHENG__.ui.platform.audio.onShow());
    await page.waitForFunction(() => window.__FUSHENG__.music.state === 'running');
    check('foreground-resumes-audio', true);
    await page.waitForFunction(() => window.__FUSHENG__.ui.platform.audio.retiring.size === 0);
    check('crossfade-releases-old-voices', await page.evaluate(() => window.__FUSHENG__.ui.platform.audio.buffers.size <= 2));
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const touch = await mobile.newPage();
    await touch.goto('http://127.0.0.1:8088/web-mobile/?test=1&touch=1');
    await touch.waitForFunction(() => window.__FUSHENG__?.frameCount > 20 && !document.querySelector('#fusheng-loading'));
    await click(touch, 'ui.settings', true); await waitMusic(touch, 'title');
    await touch.screenshot({ path: 'output/playwright/music/mobile-settings.png' });
    check('touch-gesture-unlocks-audio', await touch.evaluate(() => window.__FUSHENG__.music.state === 'running'));
    await mobile.close();
    check('no-runtime-or-network-errors', report.errors.length === 0, report.errors);
} catch (error) {
    report.errors.push(String(error)); process.exitCode = 1;
} finally {
    await browser.close();
    await fs.writeFile('output/music-checks.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
