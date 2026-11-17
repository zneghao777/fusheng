import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Sim } from '../../assets/scripts/core/Sim';
import { createCourse } from '../../assets/scripts/core/LifeCourse';
import { Command, Content, SimPanel } from '../../assets/scripts/core/Types';
import { renderWeekPanel, PanelPresentation, WeekButton, WeekPanelHost } from '../../assets/scripts/ui/WeekPanels';

const content = JSON.parse(fs.readFileSync('assets/resources/config/content.json', 'utf8')) as Content;
content['life-course'] = JSON.parse(fs.readFileSync('content/life-course.json', 'utf8'));
const dictionary = JSON.parse(fs.readFileSync('content/life-panels.json', 'utf8'));
Object.assign(content.i18n, dictionary);
const t = (key: string) => dictionary[`life.ui.${key}`];
function make(age = 7) {
    const sim = new Sim(content, { originId: 'normal', seed: 123 });
    sim.state.age = age;
    sim.state.life!.course = createCourse(age);
    return sim;
}
function surface(sim: Sim, panel: SimPanel) {
    let shown: { title: string; body: string; actions: WeekButton[]; presentation?: PanelPresentation } = { title: '', body: '', actions: [] };
    const commands: Command[] = [];
    let finished = false;
    sim.state.panel = panel;
    const host: WeekPanelHost = {
        show: (_kind, title, body, actions, _preview, presentation) => { shown = { title, body, actions, presentation }; },
        send: command => { commands.push(command); sim.dispatch(command); },
        close: () => { sim.state.panel = null; sim.paused = false; },
        finish: () => { finished = true; },
    };
    const render = () => renderWeekPanel(sim, panel, host);
    const click = (key: string) => {
        const action = shown.actions.find(item => item.key === key);
        expect(action, `Missing visible action: ${key}`).toBeDefined();
        action!.run();
    };
    render();
    return { view: () => shown, commands, click, render, finished: () => finished };
}
describe('age-aware life panels and local navigation', () => {
    it('requires a deliberate life choice and exposes its outcome before applying it', () => {
        const sim = make(), ui = surface(sim, { kind: 'LifeChoice' });
        expect(ui.view().body).toContain(sim.course.stage.home);
        expect(ui.view().actions).toHaveLength(3);
        ui.view().actions[0].run();
        expect(ui.view().body).toContain(sim.course.milestone!.choices[0].hint);
        expect(ui.commands).toHaveLength(0);
        ui.click(t('choice.back'));
        ui.view().actions[0].run();
        ui.click(t('choice.confirm'));
        expect(sim.course.data.choices['7']).toBe('7-books');
        expect(sim.state.panel?.kind).toBe('Reply');
    });
    it('shows the actual activity bonus and prevents starting with insufficient focus', () => {
        const sim = make(18);
        sim.course.data.choices['18'] = '18-learn';
        sim.course.data.direction = 'study';
        const ui = surface(sim, { kind: 'LifeCourse' });
        ui.view().actions[0].run();
        expect(ui.view().body).toContain('+4');
        ui.click(t('course.startActivity'));
        expect(sim.state.life!.focus).toBe(2);
        expect(sim.course.data.metrics.learning).toBe(4);
        sim.state.life!.focus = 0;
        ui.render();
        ui.view().actions[1].run();
        expect(ui.view().body).toContain(t('course.noFocus'));
        expect(ui.view().actions.some(a => a.key === t('course.startActivity'))).toBe(false);
    });
    it('keeps childhood projects supported by family and removes personal debt controls', () => {
        const sim = make();
        let ui = surface(sim, { kind: 'Neighbor', id: 'zhou' });
        expect(ui.view().actions.some(a => /60/.test(a.key))).toBe(false);
        sim.state.scene = 'store';
        ui = surface(sim, { kind: 'Neighbor', id: 'lin' });
        const project = ui.view().actions.find(a => a.key.includes(sim.course.stage.commissionName));
        expect(project).toBeDefined();
        project!.run();
        expect(ui.view().body).toContain(t('neighbor.materialReward'));
        expect(ui.view().body).toContain('45');
        expect(ui.view().actions[0].key).toBe(t('neighbor.acceptProject'));
    });
    it('separates ownership changes from artwork viewing and uses family sale for minors', () => {
        const sim = make();
        sim.state.life!.works.push({ id: 'w1-1', subject: 'window', style: 'warm', quality: 60, value: 51, week: 1, status: 'stored' });
        const ui = surface(sim, { kind: 'Artwork', id: 'w1-1' });
        expect(ui.view().actions.some(a => a.key.includes('51'))).toBe(false);
        ui.click(t('artwork.transfer'));
        const sell = ui.view().actions.find(a => a.key.includes('51'))!;
        expect(sell.key).toContain('家人');
        sell.run();
        expect(ui.commands).toHaveLength(0);
        ui.view().actions[0].run();
        expect(sim.state.life!.works[0].status).toBe('sold');
        expect(sim.state.money).toBe(171);
    });
    it('does not invent childhood creation ages for migrated adult saves', () => {
        const sim = make(18);
        sim.state.week = 6;
        sim.state.life!.works.push({ id: 'w1-1', subject: 'window', style: 'warm', quality: 60, value: 51, week: 1, status: 'stored' });
        const ui = surface(sim, { kind: 'Artwork', id: 'w1-1' });
        expect(ui.view().body).toContain('18');
        expect(ui.view().body).not.toContain('13');
    });
    it('keeps ending album navigation local while allowing a saved return to title', () => {
        const sim = make(30), data = sim.course.data;
        data.startedAge = 7;
        data.years = [{ age: 7, stageId: 'child', works: 1, sold: 0, metrics: { learning: 3, craft: 0, bonds: 0, vocation: 0 }, choice: '7-books', direction: 'study', summary: '这一年养成了读书习惯。' }, { age: 30, stageId: 'midlife', works: 0, sold: 0, metrics: { learning: 0, craft: 0, bonds: 0, vocation: 0 }, choice: '', direction: 'none', summary: '三十岁这一年完整结束。' }];
        data.completed = true;
        const ui = surface(sim, { kind: 'LifeEnding' });
        expect(ui.view().title).toContain('敬请期待');
        ui.click(t('ending.album'));
        expect(ui.view().actions).toHaveLength(3);
        ui.view().actions[0].run();
        ui.view().actions[0].run();
        expect(ui.view().body).toContain('读书习惯');
        ui.click(t('course.backAlbum'));
        ui.click(t('ending.back'));
        expect(ui.commands).toHaveLength(0);
        ui.click(t('ending.titleBack'));
        expect(ui.finished()).toBe(true);
    });
    it('groups journal facts without losing numeric status or local navigation', () => {
        const sim = make(18), life = sim.state.life!;
        life.focus = 2; life.inspiration = 5; life.help = 'promised';
        life.commission = { id: 'lin', status: 'accepted' };
        life.market.status = 'complete'; life.market.sold = 2; life.market.earned = 137;
        life.followup = '上次送出的画，被认真挂在墙上。';
        const ui = surface(sim, { kind: 'Journal' });
        const sections = ui.view().presentation!.sections!;
        expect(ui.view().presentation!.mode).toBe('journal');
        expect(sections.map(section => section.title)).toEqual([t('journal.sectionToday'), t('journal.sectionWish'), t('journal.sectionPromises')]);
        const grouped = sections.map(section => section.body).join('\n');
        for (const fact of ['2/3', '5/6', sim.course.stage.yearGoal, sim.life.commission!.name, '137', t('promise.promised')]) {
            expect(grouped).toContain(fact);
            expect(ui.view().body).toContain(fact);
        }
        expect(ui.view().actions.some(action => action.key === t('backScene'))).toBe(false);
        for (const key of ['journal.schedule', 'journal.people', 'journal.records', 'journal.echo']) {
            ui.render(); ui.click(t(key));
            expect(ui.view().body.length).toBeGreaterThan(0);
            ui.click(t('backJournal'));
            expect(sim.state.panel?.kind).toBe('Journal');
        }
    });
    it('opens a real creation flow from an empty collection after a legal trip home', () => {
        const sim = make();
        sim.state.scene = 'park'; sim.paused = true;
        const beforeClock = sim.state.clock, beforeFocus = sim.state.life!.focus;
        const ui = surface(sim, { kind: 'Collection' });
        expect(ui.view().presentation?.empty?.body).toContain(t('collection.emptyAway'));
        ui.click(t('collection.returnCreate'));
        expect(ui.commands).toEqual([{ type: 'Travel', scene: 'home' }, { type: 'Life', action: 'compose', id: undefined }]);
        expect(sim.state.scene).toBe('home');
        expect(sim.state.clock).toBe(beforeClock + content.rules.travel.minutes);
        expect(sim.state.panel?.kind).toBe('Compose');
        expect(sim.state.life!.focus).toBe(beforeFocus);
        const subjects = surface(sim, sim.state.panel!);
        subjects.view().actions[0].run();
        const styles = surface(sim, sim.state.panel!);
        styles.view().actions[0].run();
        expect(sim.state.panel?.kind).toBe('Artwork');
        expect(sim.state.life!.works).toHaveLength(1);
        expect(sim.state.life!.focus).toBe(beforeFocus - 1);
    });
    it('offers setup guidance instead of bypassing a missing easel', () => {
        const sim = make();
        sim.state.placed = sim.state.placed.filter(item => item.furnitureId !== 'easel');
        const ui = surface(sim, { kind: 'Collection' });
        ui.click(t('collection.prepareStudio'));
        expect(ui.view().body).toBe(t('collection.noEasel'));
        expect(ui.commands).toHaveLength(0);
        expect(sim.state.life!.works).toHaveLength(0);
        ui.click(t('backCollection'));
        expect(sim.state.panel?.kind).toBe('Collection');
    });
    it('uses real gallery artwork and retains exhibit, departed and keepsake routes', () => {
        const sim = make();
        sim.state.life!.works.push(
            { id: 'stored', subject: 'window', style: 'warm', quality: 60, value: 51, week: 1, status: 'stored' },
            { id: 'reserved', subject: 'window', style: 'ink', quality: 70, value: 60, week: 1, status: 'reserved' },
            { id: 'sold', subject: 'window', style: 'quiet', quality: 65, value: 55, week: 1, status: 'sold' },
        );
        sim.state.life!.keepsakes.push({ id: 'memory', name: '街坊的小礼物', displayed: false });
        const ui = surface(sim, { kind: 'Collection' });
        const gallery = ui.view().presentation!.gallery!;
        expect(gallery.map(item => item.artwork.id)).toEqual(['reserved', 'stored']);
        expect(gallery[0].artwork).toBe(sim.state.life!.works[1]);
        expect(ui.view().actions.some(action => action.run === gallery[0].run)).toBe(true);
        gallery[0].run();
        expect(sim.state.panel).toEqual({ kind: 'Artwork', id: 'reserved' });
        ui.render();
        ui.view().actions.find(action => action.key.includes(sim.course.stage.marketName))!.run();
        expect(ui.view().presentation!.gallery!.map(item => item.artwork.id)).toEqual(['reserved']);
        ui.click(t('backCollection'));
        ui.render(); ui.click(t('collection.departed'));
        expect(ui.view().presentation!.gallery![0].artwork.id).toBe('sold');
        ui.click(t('backCollection'));
        ui.render(); ui.click(t('collection.keepsakes'));
        expect(ui.view().actions.some(action => action.key.includes('街坊的小礼物'))).toBe(true);
        ui.click(t('backCollection'));
        expect(sim.state.panel?.kind).toBe('Collection');
    });
    it('keeps collection actions usable for a host that ignores presentation metadata', () => {
        const sim = make();
        sim.state.life!.works.push({ id: 'legacy-host', subject: 'window', style: 'warm', quality: 60, value: 51, week: 1, status: 'stored' });
        sim.state.panel = { kind: 'Collection' };
        let body = '', actions: WeekButton[] = [];
        renderWeekPanel(sim, sim.state.panel, {
            show: (_kind, _title, copy, buttons) => { body = copy; actions = buttons; },
            send: command => sim.dispatch(command),
            close: () => { sim.state.panel = null; },
        });
        expect(body).toContain('1');
        actions.find(action => action.key.startsWith('《'))!.run();
        expect(sim.state.panel).toEqual({ kind: 'Artwork', id: 'legacy-host' });
    });

    it('does not force travel through another active pause reason', () => {
        const sim = make();
        sim.state.scene = 'park'; sim.paused = true; sim.state.panel = { kind: 'Collection' };
        let actions: WeekButton[] = [];
        const commands: Command[] = [];
        renderWeekPanel(sim, sim.state.panel, {
            show: (_kind, _title, _body, buttons) => { actions = buttons; },
            send: command => { commands.push(command); sim.dispatch(command); },
            // A hidden/rotated host can remain paused after its panel closes.
            close: () => { sim.state.panel = null; },
        });
        actions.find(action => action.key === t('collection.returnCreate'))!.run();
        expect(sim.paused).toBe(true);
        expect(sim.state.scene).toBe('park');
        expect(sim.state.panel?.kind).toBe('Collection');
        expect(commands.some(command => command.type === 'Life' && command.action === 'compose')).toBe(false);
    });

});
