import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Sim } from '../../assets/scripts/core/Sim';
import { musicForScene } from '../../assets/scripts/core/MusicScene';
import type { Content } from '../../assets/scripts/core/Types';

const content = JSON.parse(fs.readFileSync('assets/resources/config/content.json', 'utf8')) as Content;
const make = () => new Sim(content, { originId: 'normal', seed: 123 }).state;

describe('music follows the life scene', () => {
    it('keeps the theme on full pages, even when an old save is at night', () => {
        const state = make(); state.clock = 1320;
        for (const page of ['Title', 'Create', 'SaveSelect', 'Prologue']) expect(musicForScene(state, page)).toBe('title');
    });
    it('uses the quiet piano when reading or composing, and the guitar outdoors', () => {
        const state = make(); state.panel = null;
        for (const scene of ['home', 'street', 'park', 'store'] as const) { state.scene = scene; expect(musicForScene(state, null)).toBe('day'); }
        state.scene = 'book'; expect(musicForScene(state, null)).toBe('book');
        state.scene = 'home'; state.panel = { kind: 'Compose' }; expect(musicForScene(state, null)).toBe('book');
    });
    it('limits the market theme to its opening hours or market interaction', () => {
        const state = make(); state.panel = null; state.scene = 'street'; state.day = 7;
        for (const clock of [599, 600, 1199, 1200]) {
            state.clock = clock;
            expect(musicForScene(state, null)).toBe(clock < 600 ? 'day' : clock < 1200 ? 'market' : 'night');
        }
        state.scene = 'home'; state.clock = 900; expect(musicForScene(state, null)).toBe('day');
        state.panel = { kind: 'Market' }; expect(musicForScene(state, null)).toBe('market');
    });
    it('puts night and weekly recaps ahead of location music', () => {
        const state = make(); state.scene = 'book'; state.panel = null;
        for (const clock of [0, 359, 1200, 1440]) { state.clock = clock; expect(musicForScene(state, null)).toBe('night'); }
        state.clock = 700; state.panel = { kind: 'DaySummary' }; expect(musicForScene(state, null)).toBe('night');
        state.clock = 1320; state.panel = { kind: 'WeekRecap' }; expect(musicForScene(state, null)).toBe('recap');
    });
});
