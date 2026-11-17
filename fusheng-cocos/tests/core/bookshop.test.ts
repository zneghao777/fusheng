import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Content } from '../../assets/scripts/core/Types';
import { Sim } from '../../assets/scripts/core/Sim';

const content = JSON.parse(fs.readFileSync('assets/resources/config/content.json', 'utf8')) as Content;
const visit = () => { const sim = new Sim(content, { seed: 123, originId: 'normal' }); sim.dispatch({ type: 'Travel', scene: 'book' }); return sim; };

describe('two-floor bookshop', () => {
    it('lets the player climb, cross the upper opening, and return to the ground floor', () => {
        const sim = visit(), p = sim.state.player, ladder = sim.ladder!;
        p.x = (ladder.x1 + ladder.x2) / 2;
        sim.dispatch({ type: 'Move', x: 0, y: -1 });
        for (let i = 0; i < 20; i++) sim.tick();
        expect(p.y).toBe(350);
        sim.dispatch({ type: 'Jump' }); sim.dispatch({ type: 'Move', x: -1, y: 0 });
        for (let i = 0; i < 6; i++) sim.tick();
        sim.dispatch({ type: 'Move', x: 0, y: 0 });
        for (let i = 0; i < 8; i++) sim.tick();
        expect(p.y).toBe(350); expect(p.grounded).toBe(true);
        p.x = (ladder.x1 + ladder.x2) / 2;
        sim.dispatch({ type: 'Move', x: 0, y: 1 });
        for (let i = 0; i < 20; i++) sim.tick();
        expect(p.y).toBe(620); expect(p.grounded).toBe(true);
    });
    it('keeps upstairs reading reachable and prevents interactions through the floor', () => {
        const sim = visit(), p = sim.state.player;
        p.x = 740; p.y = 620;
        expect(sim.near()?.id).not.toBe('book_read');
        p.y = 350; expect(sim.near()?.id).toBe('book_read');
        const focus = sim.state.life!.focus;
        sim.dispatch({ type: 'Interact' });
        expect(sim.state.life!.focus).toBe(focus - 1);
        expect(sim.state.panel).not.toBeNull();
    });
    it('preserves both floors and player position through saving and loading state', () => {
        const sim = visit(); sim.state.player.x = 740; sim.state.player.y = 350;
        const loaded = new Sim(content, { state: JSON.parse(JSON.stringify(sim.state)) });
        expect(loaded.state.player.y).toBe(350); expect(loaded.floorHeights).toEqual([620, 350]);
        expect(loaded.ladder).toEqual(sim.ladder); expect(loaded.near()?.id).toBe('book_read');
    });
});
