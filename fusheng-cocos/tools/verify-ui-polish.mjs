import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run only against a completed, stable build:
// FUSHENG_WEB_URL=http://127.0.0.1:18932/ node tools/verify-ui-polish.mjs
// FUSHENG_QA_RUN=confirmation preserves the first pass. Optional comma-separated
// FUSHENG_QA_ENGINES, FUSHENG_QA_SPECS and FUSHENG_QA_CASES narrow a repair check.
const base = process.env.FUSHENG_WEB_URL;
if (!base) throw new Error('FUSHENG_WEB_URL must identify the completed UI-polish build.');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runName = process.env.FUSHENG_QA_RUN || 'initial';
if (!/^[a-z0-9_-]+$/i.test(runName)) throw new Error('Invalid FUSHENG_QA_RUN');
const output = path.join(project, 'output/ui-polish-20261022', runName);
await fs.mkdir(output, { recursive: true });
const includes = (variable, value) => !process.env[variable] || process.env[variable].split(',').includes(value);
const report = {
  target: base, run: runName, generatedAt: new Date().toISOString(),
  method: 'Fresh isolated contexts per engine and viewport; pointer/keyboard UI actions; runtime state fixtures only for empty/nonempty artwork and budget; all geometry in CSS pixels. Browser simulation is not physical-device evidence.',
  checks: [], errors: [], cases: [], views: [],
};
let firstBootComplete = false, abortBatch = false;
const check = (name, passed, detail) => {
  const result = { name, passed: !!passed, ...(detail === undefined ? {} : { detail }) };
  report.checks.push(result);
  if (!passed) console.error('FAIL', name, JSON.stringify(detail));
  return result.passed;
};
const rectOverlap = (a, b) => !!a && !!b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
const inside = (r, w, h) => !!r && r.left >= -1 && r.top >= -1 && r.right <= w + 1 && r.bottom <= h + 1;

async function settled(page) {
  await page.waitForFunction(() => window.__FUSHENG__?.frameCount > 25 && window.__FUSHENG__.artPending === 0 && !document.getElementById('fusheng-loading'), null, { timeout: 45000 });
  await page.waitForTimeout(240);
}

async function geometry(page, label) {
  return page.evaluate(label => {
    const f = window.__FUSHENG__, ui = f.ui, scale = Math.min(innerWidth / 1280, innerHeight / 720);
    const rect = n => {
      if (!n?.isValid) return null;
      const t = n.getComponent('cc.UITransform'); if (!t) return null;
      const p = n.worldPosition, s = n.worldScale;
      const left = innerWidth / 2 + (p.x - t.width * t.anchorX * s.x) * scale;
      const top = innerHeight / 2 - (p.y + t.height * (1 - t.anchorY) * s.y) * scale;
      const width = t.width * s.x * scale, height = t.height * s.y * scale;
      return { left, top, width, height, right: left + width, bottom: top + height };
    };
    const belongs = (node, ancestor) => { for (let n = node; n; n = n.parent) if (n === ancestor) return true; return false; };
    const controls = [...ui.buttons, ...ui.topControls, ui.statusToggle, ui.weeklyControl, ui.promptButton, ui.touchJump, ui.touchAction].filter(Boolean);
    const unique = [...new Map(controls.filter(b => b.node?.isValid).map(b => [b.node.uuid, b])).values()];
    const activePanel = f.screen && f.screen !== 'Build';
    const buttons = unique.filter(b => b.node.activeInHierarchy).map(b => {
      const component = b.node.getComponent('cc.Button'), label = b.label;
      let clip = null;
      for (let n = b.node.parent; n; n = n.parent) if (n.getComponent('cc.Mask')) { clip = rect(n); break; }
      const r = rect(b.node), visible = !clip || (r.right > clip.left && r.left < clip.right && r.bottom > clip.top && r.top < clip.bottom);
      const hitRect = clip ? { left: Math.max(r.left, clip.left), top: Math.max(r.top, clip.top), right: Math.min(r.right, clip.right), bottom: Math.min(r.bottom, clip.bottom) } : { ...r };
      hitRect.width = hitRect.right - hitRect.left; hitRect.height = hitRect.bottom - hitRect.top;
      return { key: b.key, text: label?.string, name: b.node.name, parent: b.node.parent?.name, rect: r, hitRect, clip, visible,
        interactable: component?.interactable !== false, inPanel: ui.buttons.includes(b), inHUD: belongs(b.node, ui.hud),
        currentInput: activePanel ? ui.buttons.includes(b) : true,
        fontCSS: label ? label.fontSize * label.node.worldScale.x * scale : null,
        lineHeightCSS: label ? label.lineHeight * label.node.worldScale.y * scale : null,
      };
    });
    const labels = ui.root.getComponentsInChildren('cc.Label').filter(l => l.node.activeInHierarchy).map(l => ({
      text: l.string, name: l.node.name, parent: l.node.parent?.name, rect: rect(l.node),
      fontCSS: l.fontSize * l.node.worldScale.x * scale, lineHeightCSS: l.lineHeight * l.node.worldScale.y * scale,
      overflow: l.overflow, wrap: l.enableWrapText,
    }));
    const transforms = ui.panels.getComponentsInChildren('cc.UITransform').filter(t => t.node.activeInHierarchy).map(t => ({ name: t.node.name, parent: t.node.parent?.name, rect: rect(t.node) }));
    const frame = ui.sceneFrame, room = frame.room;
    const roomRect = { left: innerWidth / 2 + room.left * scale, right: innerWidth / 2 + room.right * scale, top: innerHeight / 2 - room.top * scale, bottom: innerHeight / 2 - room.bottom * scale };
    roomRect.width = roomRect.right - roomRect.left; roomRect.height = roomRect.bottom - roomRect.top;
    const scroll = ui.scroll ? { viewport: rect(ui.scroll.node), content: rect(ui.scroll.content), offset: { x: ui.scroll.getScrollOffset().x, y: ui.scroll.getScrollOffset().y }, max: { x: ui.scroll.getMaxScrollOffset().x, y: ui.scroll.getMaxScrollOffset().y } } : null;
    const canvas = document.getElementById('GameCanvas'), cr = canvas.getBoundingClientRect();
    const fullscreen = document.getElementById('fusheng-fullscreen'), fr = fullscreen?.getBoundingClientRect();
    return { label, screen: f.screen, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scale },
      display: f.display, canvas: { width: canvas.width, height: canvas.height, rect: { left: cr.left, top: cr.top, width: cr.width, height: cr.height } },
      statusExpanded: ui.statusExpanded, sceneFrame: frame, roomRect, buttons, labels, transforms, scroll,
      focus: ui.focus, focusedKey: ui.buttons[ui.focus]?.key,
      build: { mode: ui.buildMode, type: ui.buildType, catalogExpanded: ui.buildCatalogExpanded, panel: rect(ui.buildPanel) },
      fullscreen: fullscreen ? { hidden: fullscreen.hidden, rect: { left: fr.left, top: fr.top, width: fr.width, height: fr.height } } : null,
    };
  }, label);
}

async function buttonPoint(page, query) {
  return page.evaluate(query => {
    const ui = __FUSHENG__.ui;
    const all = [...ui.buttons, ...ui.topControls, ui.statusToggle, ui.weeklyControl, ui.promptButton].filter(Boolean);
    const unique = [...new Map(all.filter(b => b.node?.isValid && b.node.activeInHierarchy).map(b => [b.node.uuid, b])).values()];
    const candidates = unique.filter(b => (!query.key || b.key === query.key) && (!query.prefix || b.key.startsWith(query.prefix)) && (!query.text || b.label.string.includes(query.text)) && (!query.disabled || b.node.getComponent('cc.Button')?.interactable === false));
    const b = candidates[query.index || 0];
    if (!b) throw new Error('Missing UI button ' + JSON.stringify(query) + '; available: ' + unique.map(b => b.key + '=' + b.label.string).join(' | '));
    const scale = Math.min(innerWidth / 1280, innerHeight / 720), p = b.node.worldPosition;
    return { x: innerWidth / 2 + p.x * scale, y: innerHeight / 2 - p.y * scale, key: b.key, text: b.label.string };
  }, typeof query === 'string' ? { key: query } : query);
}

async function click(page, query, touch) {
  const p = await buttonPoint(page, query);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await settled(page); return p;
}
async function scenePoint(page, target) {
  return page.evaluate(({ x, y }) => {
    const f = __FUSHENG__.ui.sceneFrame, scale = Math.min(innerWidth / 1280, innerHeight / 720);
    return { x: innerWidth / 2 + (f.x + (x - 640) * f.scaleX) * scale, y: innerHeight / 2 - (f.y + (360 - y) * f.scaleY) * scale };
  }, target);
}
async function swipe(page, start, dx, dy) {
  const touches = (x, y) => [{ identifier: 1, clientX: x, clientY: y }];
  await page.dispatchEvent('#GameCanvas', 'touchstart', { touches: touches(start.x, start.y), changedTouches: touches(start.x, start.y) });
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(22);
    await page.dispatchEvent('#GameCanvas', 'touchmove', { touches: touches(start.x + dx * i / 5, start.y + dy * i / 5), changedTouches: touches(start.x + dx * i / 5, start.y + dy * i / 5) });
  }
  await page.dispatchEvent('#GameCanvas', 'touchend', { touches: [], changedTouches: touches(start.x + dx, start.y + dy) });
}
async function dragVolume(page, target, touch) {
  const points = await page.evaluate(target => {
    const f = __FUSHENG__, b = f.ui.buttons.find(b => b.key === 'ui.musicVolume');
    if (!b) throw new Error('Missing music volume slider');
    const n = b.node, tr = n.getComponent('cc.UITransform'), scale = Math.min(innerWidth / 1280, innerHeight / 720);
    // The painted track is inset 28 local units from the observed control edge.
    // World transform and visible canvas center are read from this live layout.
    const half = (tr.width / 2 - 28) * n.worldScale.x * scale, x = innerWidth / 2 + n.worldPosition.x * scale, y = innerHeight / 2 - n.worldPosition.y * scale;
    return { from: { x: x + (f.music.volume * 2 - 1) * half, y }, to: { x: x + (target * 2 - 1) * half, y } };
  }, target);
  let cdp;
  try {
    if (touch) { cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.from, id: 1 }] }); }
    else { await page.mouse.move(points.from.x, points.from.y); await page.mouse.down(); }
    for (let i = 1; i <= 8; i++) {
      const p = { x: points.from.x + (points.to.x - points.from.x) * i / 8, y: points.to.y };
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
      else await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(12);
    }
  } finally {
    if (cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
    else await page.mouse.up();
  }
  await settled(page);
  return { target, ...points, inputMethod: touch ? 'Chrome CDP touch drag' : 'Playwright mouse drag', ...(await page.evaluate(() => ({ audio: __FUSHENG__.music.volume, settings: __FUSHENG__.ui.sim.settings.musicVolume, persisted: JSON.parse(localStorage.getItem('fs.music') || '{}').volume }))) };
}
async function focusKey(page, key) {
  const count = await page.evaluate(() => __FUSHENG__.ui.buttons.length);
  for (let i = 0; i < count + 2; i++) {
    const current = await page.evaluate(() => { const u = __FUSHENG__.ui, b = u.buttons[u.focus]; return { key: b?.key, enabled: b?.node.getComponent('cc.Button')?.interactable !== false }; });
    if (current.key === key && current.enabled) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard cannot focus ' + key);
}

for (const [engineName, engine] of [['Chrome', chromium], ['WebKit', webkit]]) {
  if (abortBatch) break;
  if (!includes('FUSHENG_QA_ENGINES', engineName)) continue;
  let browser;
  try { browser = await engine.launch(engine === chromium ? { channel: 'chrome', headless: true } : { headless: true }); }
  catch (error) { report.errors.push({ target: engineName, stage: 'launch', error: String(error) }); continue; }
  try {
    for (const spec of [{ id: 'mobile-869x400', width: 869, height: 400, touch: true }, { id: 'desktop-1280x720', width: 1280, height: 720, touch: false }]) {
      if (abortBatch) break;
      if (!includes('FUSHENG_QA_SPECS', spec.id)) continue;
      const prefix = `${engineName}-${spec.id}`;
      const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1, isMobile: spec.touch, hasTouch: spec.touch });
      const page = await context.newPage(); page.setDefaultTimeout(7000);
      page.on('pageerror', error => report.errors.push({ target: prefix, stage: 'pageerror', error: error.message, stack: error.stack }));
      const url = new URL(`web-${spec.touch ? 'mobile' : 'desktop'}/`, base.endsWith('/') ? base : base + '/');
      url.search = 'test=1&skip=1&house=rental&origin=normal' + (spec.touch ? '&touch=1' : '');
      const fresh = async () => {
        if (!firstBootComplete) {
          let onStartupError;
          const startupError = new Promise((_, reject) => {
            onStartupError = error => reject(new Error('Startup pageerror: ' + (error.stack || error.message)));
            page.once('pageerror', onStartupError);
          });
          try {
            await Promise.race([(async () => { await page.goto(url.href); await settled(page); })(), startupError]);
            report.boot = { target: prefix, passed: true }; firstBootComplete = true;
          } catch (error) {
            report.boot = { target: prefix, passed: false, error: error.stack || String(error) };
            report.status = 'boot-failed'; abortBatch = true; throw error;
          } finally { page.off('pageerror', onStartupError); }
        } else { await page.goto(url.href); await settled(page); }
        await page.evaluate(() => { __FUSHENG__.content.rules.event.chance = 0; __FUSHENG__.ui.sim.settings.reduceMotion = true; });
      };
      const capture = async (name, options = {}) => {
        await settled(page); const label = `${prefix}-${name}`, m = await geometry(page, label);
        await page.screenshot({ path: path.join(output, label + '.png') }); report.views.push(m);
        const targets = m.buttons.filter(b => b.currentInput && b.visible);
        const out = targets.filter(b => !inside(b.hitRect, spec.width, spec.height));
        check(label + ': buttons inside viewport', out.length === 0, out.map(b => ({ key: b.key, rect: b.rect })));
        const overlaps = [];
        for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) if (rectOverlap(targets[i].hitRect, targets[j].hitRect)) overlaps.push({ a: targets[i].key, b: targets[j].key });
        check(label + ': adjacent hit targets do not overlap', overlaps.length === 0, overlaps);
        if (options.hud && spec.touch) {
          const hud = targets.filter(b => b.inHUD && ['ui.menu', 'ui.build', 'ui.status', 'week.journal', 'week.collection', 'ui.character'].includes(b.key));
          check(label + ': mobile HUD hit height at least 44 CSS px', hud.length >= 4 && hud.every(b => b.rect.height >= 43.5), hud.map(b => ({ key: b.key, height: b.rect.height })));
        }
        return m;
      };
      const runCase = async (name, run) => {
        if (abortBatch) return;
        if (!includes('FUSHENG_QA_CASES', name)) return;
        const start = report.checks.length;
        console.log('CASE', prefix, name);
        try { await fresh(); await run(); report.cases.push({ target: prefix, name, completed: true, passed: report.checks.slice(start).every(c => c.passed) }); }
        catch (error) {
          report.errors.push({ target: prefix, case: name, error: error.stack || String(error) });
          report.cases.push({ target: prefix, name, completed: false, passed: false });
          try { await page.screenshot({ path: path.join(output, `${prefix}-${name}-failure.png`) }); report.views.push(await geometry(page, `${prefix}-${name}-failure`)); } catch { /* retain original failure */ }
        }
        await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
      };

      await runCase('hud-menu', async () => {
        await capture('hud-expanded', { hud: true });
        const roomBefore = await page.evaluate(() => __FUSHENG__.ui.sceneFrame.room);
        await click(page, 'ui.status', spec.touch); const folded = await capture('hud-folded', { hud: true });
        check(prefix + ': status fold increases room width', !folded.statusExpanded && folded.sceneFrame.room.right - folded.sceneFrame.room.left > roomBefore.right - roomBefore.left);
        await click(page, 'ui.status', spec.touch);
        await click(page, 'ui.menu', spec.touch); const menu = await capture('menu');
        const keys = menu.buttons.filter(b => b.inPanel && b.visible && b.interactable).map(b => b.key);
        check(prefix + ': all frequent menu entries on first page', ['ui.settings', 'ui.help', 'ui.save', 'ui.load', 'ui.titleBack'].every(key => keys.includes(key)), keys);
        check(prefix + ': menu has no pagination', !keys.some(key => ['ui.pageNext', 'ui.pagePrevious'].includes(key)), keys);
        await click(page, 'ui.settings', spec.touch); const settings = await capture('settings');
        check(prefix + ': settings reachable in two pointer clicks', settings.screen === 'Settings');
        for (const target of [.25, .75]) {
          const volume = await dragVolume(page, target, spec.touch && engine === chromium);
          check(prefix + ': volume pointer drag reaches ' + Math.round(target * 100) + '% within tolerance', Math.abs(volume.audio - target) <= .04 && Math.abs(volume.settings - target) <= .04, volume);
        }
        await click(page, 'ui.fontLarge', spec.touch); await capture('settings-large-font');
        check(prefix + ': large type applied', await page.evaluate(() => __FUSHENG__.ui.sim.settings.fontScale === 1.3));
        await page.keyboard.press('Escape'); await settled(page);
        check(prefix + ': settings Escape returns menu', await page.evaluate(() => __FUSHENG__.screen === 'Pause'));
        await click(page, 'ui.save', spec.touch);
        check(prefix + ': menu save writes current isolated slot', await page.evaluate(() => JSON.parse(localStorage.getItem('fs.slot.1')).state.age === __FUSHENG__.state.age));
        await click(page, 'ui.titleBack', spec.touch);
        check(prefix + ': title return works', await page.evaluate(() => __FUSHENG__.screen === 'Title'));
      });

      await runCase('dialogs', async () => {
        await click(page, 'ui.menu', spec.touch); await click(page, 'ui.settings', spec.touch); await click(page, 'ui.fontLarge', spec.touch); await page.keyboard.press('Escape'); await settled(page);
        await click(page, 'ui.help', spec.touch); const long = await capture('help-large-font');
        const actionRects = long.buttons.filter(b => b.inPanel).map(b => b.rect);
        check(prefix + ': long text viewport does not cover actions', !!long.scroll && actionRects.every(r => !rectOverlap(r, long.scroll.viewport)), long.scroll);
        check(prefix + ': long help scrolls at large font', long.scroll?.max.y > 0, long.scroll);
        if (long.scroll?.max.y > 0) {
          const r = long.scroll.viewport, point = { x: r.left + r.width / 2, y: r.top + r.height * .8 };
          if (spec.touch) await swipe(page, point, 0, -Math.min(r.height * .5, 140));
          else { await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, 500); }
          await page.waitForTimeout(400); const scrolled = await capture('help-large-font-scrolled');
          check(prefix + ': real input moves long text', scrolled.scroll.offset.y > long.scroll.offset.y + 1, { before: long.scroll.offset, after: scrolled.scroll.offset });
        }
        await page.keyboard.press('Escape'); await settled(page);
        check(prefix + ': help Escape returns menu', await page.evaluate(() => __FUSHENG__.screen === 'Pause'));
        await click(page, 'ui.load', spec.touch); check(prefix + ': load list opens', await page.evaluate(() => __FUSHENG__.screen === 'SaveSelect'));
        await click(page, 'ui.delete', spec.touch); const confirm = await capture('short-confirm-large-font');
        check(prefix + ': confirmation keeps confirm and cancel visible', ['ui.confirm', 'ui.cancel'].every(key => confirm.buttons.some(b => b.key === key && b.visible)));
        check(prefix + ': short confirmation body avoids buttons', !confirm.scroll || confirm.buttons.filter(b => b.inPanel).every(b => !rectOverlap(b.rect, confirm.scroll.viewport)));
        await focusKey(page, 'ui.cancel'); await page.keyboard.press('Enter'); await settled(page);
        check(prefix + ': keyboard cancel returns save list', await page.evaluate(() => __FUSHENG__.screen === 'SaveSelect'));
        check(prefix + ': cancel preserves save', await page.evaluate(() => !!localStorage.getItem('fs.slot.1')));
      });

      await runCase('keyboard-disabled', async () => {
        await page.keyboard.press('Escape'); await settled(page);
        check(prefix + ': Escape opens menu from room', await page.evaluate(() => __FUSHENG__.screen === 'Pause'));
        await focusKey(page, 'ui.settings'); await page.keyboard.press('Enter'); await settled(page);
        check(prefix + ': Tab Enter opens settings', await page.evaluate(() => __FUSHENG__.screen === 'Settings'));
        await page.keyboard.press('Escape'); await settled(page); await page.keyboard.press('Escape'); await settled(page);
        check(prefix + ': two Escapes return room', await page.evaluate(() => __FUSHENG__.screen === null));
        await click(page, 'ui.menu', spec.touch); await click(page, 'ui.titleBack', spec.touch); await click(page, 'ui.new', spec.touch);
        const m = await capture('create-disabled-slot');
        const disabled = m.buttons.find(b => b.key === 'ui.slot' && !b.interactable);
        check(prefix + ': occupied save slot is disabled', !!disabled);
        if (!disabled) return;
        const before = await page.evaluate(() => ({ pendingSlot: __FUSHENG__.ui.pendingSlot, screen: __FUSHENG__.screen, toastCount: __FUSHENG__.ui.toasts.children.length }));
        await click(page, { key: 'ui.slot', disabled: true }, spec.touch);
        // Exercise the same guarded activation used by keyboard input while the
        // disabled item is still present (Tab may prune it from the focus list).
        await page.evaluate(() => __FUSHENG__.ui.buttons.find(b => b.node.getComponent('cc.Button')?.interactable === false).activate());
        const after = await page.evaluate(() => ({ pendingSlot: __FUSHENG__.ui.pendingSlot, screen: __FUSHENG__.screen, toastCount: __FUSHENG__.ui.toasts.children.length }));
        check(prefix + ': disabled pointer and activation do not run occupied-slot action', JSON.stringify(before) === JSON.stringify(after), { before, after });
        const cycle = [];
        for (let i = 0; i < m.buttons.filter(b => b.inPanel).length + 2; i++) {
          await page.keyboard.press('Tab');
          cycle.push(await page.evaluate(() => { const ui = __FUSHENG__.ui, b = ui.buttons[ui.focus]; return { key: b?.key, active: !!b?.node.activeInHierarchy, enabled: b?.node.getComponent('cc.Button')?.interactable !== false }; }));
        }
        check(prefix + ': Tab skips disabled slots', cycle.every(b => b.active && b.enabled), cycle);
      });

      await runCase('button-feedback', async () => {
        const pressEvidence = async (name, query, expectChange) => {
          await page.mouse.move(1, 1); await settled(page);
          const rest = await capture(`${name}-released`), point = await buttonPoint(page, query);
          const target = rest.buttons.find(b => b.key === point.key && (query.disabled ? !b.interactable : b.interactable));
          if (!target) throw new Error('No measured press target ' + point.key);
          const r = target.rect;
          const clip = { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), width: Math.min(spec.width, Math.ceil(r.right)) - Math.max(0, Math.floor(r.left)), height: Math.min(spec.height, Math.ceil(r.bottom)) - Math.max(0, Math.floor(r.top)) };
          const beforeImage = await page.screenshot({ clip });
          const beforeState = await page.evaluate(() => ({ screen: __FUSHENG__.screen, pendingSlot: __FUSHENG__.ui.pendingSlot, money: __FUSHENG__.state.money, toastCount: __FUSHENG__.ui.toasts.children.length }));
          const useTouch = spec.touch && engine === chromium;
          let cdp;
          try {
            if (useTouch) { cdp = await context.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1 }] }); }
            else { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
            await page.waitForTimeout(90);
            const pressed = await capture(`${name}-pressed`);
            pressed.pressEvidence = { key: point.key, inputMethod: useTouch ? 'Chrome CDP touchStart/touchCancel' : 'Playwright mouse down, then release outside control', realTouch: useTouch, note: spec.touch && !useTouch ? 'WebKit touch layout is tested with mouse press; this is not physical touch-device evidence.' : undefined };
            const heldImage = await page.screenshot({ clip });
            check(prefix + ': ' + name + (expectChange ? ' has visible press feedback' : ' stays visually disabled while pressed'), expectChange ? !beforeImage.equals(heldImage) : beforeImage.equals(heldImage), { key: point.key, clip, inputMethod: pressed.pressEvidence.inputMethod });
            if (spec.touch) check(prefix + ': ' + name + ' keeps 44 CSS px hit height', target.rect.height >= 43.5, target.rect);
          } finally {
            if (cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await cdp.detach(); }
            else { await page.mouse.move(-5, -5); await page.mouse.up(); }
          }
          await settled(page);
          const afterState = await page.evaluate(() => ({ screen: __FUSHENG__.screen, pendingSlot: __FUSHENG__.ui.pendingSlot, money: __FUSHENG__.state.money, toastCount: __FUSHENG__.ui.toasts.children.length }));
          check(prefix + ': ' + name + ' cancelled press preserves state', JSON.stringify(beforeState) === JSON.stringify(afterState), { before: beforeState, after: afterState });
        };
        await click(page, 'ui.menu', spec.touch);
        await pressEvidence('primary-button', { key: 'ui.continue' }, true);
        await click(page, 'ui.titleBack', spec.touch); await click(page, 'ui.new', spec.touch);
        await pressEvidence('disabled-button', { key: 'ui.slot', disabled: true }, false);
      });

      await runCase('journal-gallery', async () => {
        await page.evaluate(() => { __FUSHENG__.state.life.works = []; });
        await click(page, 'week.journal', spec.touch); const journal = await capture('journal');
        check(prefix + ': journal opens from HUD', journal.screen === 'Journal');
        await page.keyboard.press('Escape'); await settled(page);
        await click(page, 'week.collection', spec.touch); const empty = await capture('gallery-empty');
        check(prefix + ': empty gallery offers creation action', empty.buttons.some(b => /画一幅|画新画|开始画|创作|准备好画架/.test(b.text)), empty.buttons.map(b => ({ key: b.key, text: b.text })));
        await page.keyboard.press('Escape'); await settled(page);
        await page.evaluate(() => {
          __FUSHENG__.state.life.works = Array.from({ length: 9 }, (_, i) => ({ id: `qa-art-${i}`, subject: ['window', 'alley', 'pond', 'tree', 'book', 'portrait'][i % 6], style: ['warm', 'ink', 'quiet'][i % 3], quality: 60 + i, value: 50 + i, week: 1, status: 'stored' }));
        });
        await click(page, 'week.collection', spec.touch); const gallery = await capture('gallery-with-works');
        const artwork = gallery.buttons.find(b => b.key.startsWith('artwork.inspect.'));
        check(prefix + ': gallery exposes artwork preview selection', !!artwork, gallery.buttons.map(b => ({ key: b.key, text: b.text })));
        if (!artwork) throw new Error('Gallery has no artwork.inspect.<id> control');
        await click(page, artwork.key, spec.touch); const inspect = await capture('artwork-inspect');
        check(prefix + ': selected artwork inspection opens', inspect.screen === 'Artwork');
        check(prefix + ': selected artwork id matches clicked preview', await page.evaluate(id => __FUSHENG__.state.panel?.id === id, artwork.key.slice('artwork.inspect.'.length)));
        check(prefix + ': artwork panel reserves preview area', await page.evaluate(() => __FUSHENG__.ui.panelPreview.height > 0));
        let current = inspect, back = current.buttons.find(b => /返回画夹|回到画夹/.test(b.text));
        const seenPages = new Set();
        while (!back && current.buttons.some(b => b.key === 'ui.pageNext' && b.visible)) {
          const signature = current.buttons.filter(b => b.inPanel).map(b => b.key).join('|');
          if (seenPages.has(signature)) break;
          seenPages.add(signature);
          await click(page, 'ui.pageNext', spec.touch); current = await geometry(page, `${prefix}-artwork-return-page`);
          back = current.buttons.find(b => /返回画夹|回到画夹/.test(b.text));
        }
        check(prefix + ': artwork has reachable collection return', !!back);
        if (back) { await click(page, back.key, spec.touch); check(prefix + ': inspection returns gallery', await page.evaluate(() => __FUSHENG__.screen === 'Collection')); await capture('gallery-returned'); }
      });

      await runCase('build-placement', async () => {
        const normalFrame = await page.evaluate(() => __FUSHENG__.ui.sceneFrame);
        await page.evaluate(() => { __FUSHENG__.state.money = 0; });
        await click(page, 'ui.build', spec.touch); const poor = await capture('build-no-budget');
        const choices = poor.buttons.filter(b => b.key.startsWith('build.select.'));
        check(prefix + ': no-budget furniture is visibly disabled', choices.length > 0 && choices.every(b => !b.interactable), choices.map(b => ({ key: b.key, enabled: b.interactable })));
        const poorType = poor.build.type;
        if (choices[0]) await click(page, choices[0].key, spec.touch);
        check(prefix + ': disabled furniture cannot be selected', await page.evaluate(type => __FUSHENG__.ui.buildType === type, poorType));
        await page.keyboard.press('Escape'); await settled(page);
        await page.evaluate(() => { __FUSHENG__.state.money = 1000; });
        await click(page, 'ui.build', spec.touch); await capture('build-catalog');
        await click(page, 'build.select.plant', spec.touch); const selected = await capture('build-selected');
        check(prefix + ': selecting furniture collapses catalog', selected.build.catalogExpanded === false && selected.build.type === 'plant', selected.build);
        check(prefix + ': selected furniture toolbar avoids room', !rectOverlap(selected.build.panel, selected.roomRect), { panel: selected.build.panel, room: selected.roomRect });
        const restored = async name => {
          const state = await page.evaluate(() => ({ screen: __FUSHENG__.screen, buildMode: __FUSHENG__.ui.buildMode, frame: __FUSHENG__.ui.sceneFrame }));
          check(prefix + ': ' + name + ' exits build and restores room', state.screen === null && state.buildMode === false && ['x', 'y', 'scaleX', 'scaleY'].every(key => Math.abs(state.frame[key] - normalFrame[key]) < .001), state);
        };
        await click(page, 'ui.menu', spec.touch); await click(page, 'ui.continue', spec.touch); await restored('build via menu');
        await click(page, 'ui.build', spec.touch); await click(page, 'build.select.plant', spec.touch);
        await click(page, 'week.journal', spec.touch); await click(page, 'ui.close', spec.touch); await restored('build via journal');
        await click(page, 'ui.build', spec.touch); await click(page, 'build.select.plant', spec.touch);
        const target = await page.evaluate(() => {
          const ui = __FUSHENG__.ui;
          for (const y of ui.sim.house.floors) for (let x = ui.sim.house.x1 + 40; x < ui.sim.house.x2 - 40; x += 20) {
            const p = ui.sim.canPlace('plant', x, y);
            if (p.ok && !ui.overUI(p)) return { x: p.x, y: p.y, count: ui.sim.state.placed.length };
          }
          return null;
        });
        if (!check(prefix + ': free furniture position available', !!target, target)) return;
        const point = await scenePoint(page, target); await page.mouse.move(point.x, point.y); await page.waitForTimeout(200);
        const preview = await page.evaluate(() => {
          const ui = __FUSHENG__.ui, ghost = ui.buildView.node.getChildByName('PlacementGhost');
          return { point: ui.buildPointNow, ghost: { x: ghost.position.x, y: ghost.position.y, sx: ghost.worldScale.x, sy: ghost.worldScale.y } };
        });
        const pointerCSS = await scenePoint(page, preview.point);
        check(prefix + ': ghost uses mapped simulation coordinate', Math.abs(pointerCSS.x - point.x) <= 1.1 && Math.abs(pointerCSS.y - point.y) <= 1.1 && Math.abs(preview.ghost.x - target.x) < .001 && Math.abs(preview.ghost.y + target.y + 12) < .001, { target, preview, intendedCSS: point, observedCSS: pointerCSS });
        check(prefix + ': ghost retains furniture proportions', Math.abs(preview.ghost.sx - preview.ghost.sy) < .001, preview.ghost);
        if (spec.touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
        await page.waitForFunction(n => __FUSHENG__.state.placed.length === n + 1, target.count);
        check(prefix + ': placement matches preview grid position', await page.evaluate(t => __FUSHENG__.state.placed.some(p => p.furnitureId === 'plant' && p.x === t.x && p.y === t.y), target));
        await capture('build-placed');
        await click(page, 'ui.buildChange', spec.touch); const reopened = await capture('build-reopened');
        check(prefix + ': choose another item reopens catalog', reopened.build.catalogExpanded === true);
        await page.keyboard.press('Escape'); await settled(page);
        check(prefix + ': Escape exits build', await page.evaluate(() => __FUSHENG__.screen === null));
      });

      await runCase('room-input', async () => {
        const target = await page.evaluate(() => {
          const ui = __FUSHENG__.ui, s = ui.sim.state, h = ui.sim.house;
          for (let x = h.x1 + 100; x < h.x2 - 70; x += 30) {
            // Visible floor below a furniture base is outside its interaction
            // rectangle; full-width furnishing must not make this fixture empty.
            const y = h.f1 + 24;
            if (Math.abs(x - s.player.x) < 80 || Math.abs(x - h.doorX) < 100 || ui.overUI({ x, y })) continue;
            if (s.placed.some(f => { const d = ui.content.furniture[f.furnitureId]; return d.use && Math.abs(x - f.x) < d.w / 2 + 10 && y >= f.y - d.h - 12 && y <= f.y + 10; })) continue;
            return { x, y, startX: s.player.x };
          }
          return null;
        });
        if (!check(prefix + ': unobstructed floor target available', !!target, target)) return;
        const point = await scenePoint(page, target);
        if (spec.touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
        await page.waitForFunction(t => Math.abs(__FUSHENG__.state.player.x - t.x) < 15, target, { timeout: 12000 });
        check(prefix + ': ground click still moves character', await page.evaluate(t => Math.abs(__FUSHENG__.state.player.x - t.startX) > 30 && __FUSHENG__.screen === null, target));
        if (spec.touch) await swipe(page, { x: point.x, y: point.y - 20 }, 2, -70); else await page.keyboard.press('Space');
        await page.waitForFunction(() => !__FUSHENG__.state.player.grounded && __FUSHENG__.state.player.vy < 0, null, { timeout: 2500 });
        check(prefix + ': jump gesture or Space still works', true);
        await page.waitForFunction(() => __FUSHENG__.state.player.grounded, null, { timeout: 5000 }); await capture('room-after-input', { hud: true });
      });
      await context.close();
    }
  } finally { await browser.close(); }
}

report.finishedAt = new Date().toISOString();
report.passed = report.errors.length === 0 && report.checks.length > 0 && report.checks.every(c => c.passed) && report.cases.every(c => c.completed);
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(output, 'geometry.json'), JSON.stringify(report.views, null, 2));
const summary = { passed: report.passed, cases: report.cases.length, checks: report.checks.length, failures: report.checks.filter(c => !c.passed), errors: report.errors, output };
await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (!report.passed) process.exitCode = 1;
