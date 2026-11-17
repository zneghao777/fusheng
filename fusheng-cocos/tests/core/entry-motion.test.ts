import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { EntryTimeline, entryForLoad, entryRoom } from '../../assets/scripts/core/EntryMotion';
import { Sim, DEFAULT_SETTINGS } from '../../assets/scripts/core/Sim';
import { Content, copy } from '../../assets/scripts/core/Types';
import { checksum, MemoryDriver, SaveService } from '../../assets/scripts/platform/SaveService';

const content = JSON.parse(fs.readFileSync('assets/resources/config/content.json', 'utf8')) as Content;
const make = () => new Sim(content, { originId: 'normal', seed: 123 });

describe('entry animation timing and saved room', () => {
    it('returns home in two seconds at both 30Hz and 60Hz, independent of game speed', () => {
        for (const hz of [30, 60]) {
            const motion = new EntryTimeline('door');
            for (let i = 0; i < hz * 2; i++) motion.advance(1 / hz, true, true);
            expect(motion.elapsed).toBe(2);
            expect(motion.finished).toBe(true);
            expect(motion.progress).toBe(1);
        }
    });
    it('does not consume the animation when hidden or while room assets are preparing', () => {
        const motion = new EntryTimeline('fold');
        motion.advance(20, false, true);
        motion.advance(20, true, false);
        motion.advance(-1, true, true);
        motion.advance(NaN, true, true);
        expect(motion.elapsed).toBe(0);
        motion.advance(.8, true, true);
        expect(motion.elapsed).toBe(.8);
        expect(motion.finished).toBe(false);
    });
    it('can skip before loading, ignores repeated skips, and provides a short reduced-motion path', () => {
        const motion = new EntryTimeline('book');
        motion.skip(); motion.skip(); motion.advance(20, true, true);
        expect(motion.progress).toBe(1);
        expect(motion.elapsed).toBe(2.8);
        const reduced = new EntryTimeline('door', true);
        reduced.advance(.18, true, true);
        expect(reduced.finished).toBe(true);
    });
    it('resumes an unfinished introduction, leaves origin confirmation first, and accepts old saves', () => {
        const state = make().state;
        expect(entryForLoad(state)).toBe('door');
        state.introSeen = false;
        expect(entryForLoad(state)).toBe('fold');
        state.panel = { kind: 'Origin' };
        expect(entryForLoad(state)).toBeNull();
        state.panel = { kind: 'WeekRecap' }; state.introSeen = true;
        expect(entryForLoad(state)).toBe('door');
    });
    it('uses real furnishings, paintings and keepsakes without moving the player or changing progress', () => {
        const sim = make();
        sim.dispatch({ type: 'Life', action: 'paint', id: 'window', style: 'quiet' });
        sim.state.panel = null;
        sim.dispatch({ type: 'Life', action: 'hang', id: sim.state.life!.works[0].id, slot: 2 });
        sim.state.life!.keepsakes.push({ id: 'zhou', name: 'fixture', displayed: true });
        sim.state.placed[0].x += 30;
        sim.state.scene = 'park';
        sim.state.panel = { kind: 'Journal' };
        const original = copy(sim.state), room = entryRoom(sim.state, sim.house);
        expect(room.scene).toBe('home');
        expect(room.placed).toEqual(original.placed);
        expect(room.life).toEqual(original.life);
        expect(room.placed).not.toBe(sim.state.placed);
        room.placed[0].x = 999;
        room.life!.neighbors.zhou.trust = 0;
        expect(sim.state).toEqual(original);
    });
    it('persists the introduction flag without breaking older saves or accepting a corrupt flag', () => {
        const saves = new SaveService(new MemoryDriver(), content, () => 1, () => 'fixture');
        const state = make().state;
        expect(saves.write(1, state, DEFAULT_SETTINGS).state.introSeen).toBeUndefined();
        for (const flag of [false, true]) {
            state.introSeen = flag;
            const saved = saves.write(1, state, DEFAULT_SETTINGS);
            expect(saves.import(saves.export(saved), 2).state.introSeen).toBe(flag);
        }
        const saved = saves.load(1)!;
        const invalidState = { ...saved.state, introSeen: 'true' };
        expect(() => saves.parse(JSON.stringify({ ...saved, state: invalidState, checksum: checksum(JSON.stringify(invalidState)) }))).toThrow('corrupt');
    });
});
