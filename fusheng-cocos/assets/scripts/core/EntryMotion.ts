import { GameState, HouseDef, copy } from './Types';

export type EntryKind = 'fold' | 'door' | 'book';

export function entryForLoad(state: GameState): EntryKind | null {
    if (state.panel?.kind === 'Origin') return null;
    return state.introSeen === false ? 'fold' : 'door';
}

// A visual snapshot, never a trip home or a mutation of the saved simulation.
export function entryRoom(state: GameState, house: HouseDef): GameState {
    const room = copy(state);
    room.scene = 'home';
    room.panel = null;
    room.action = null;
    room.player.moving = false;
    room.player.climbing = false;
    room.player.vy = 0;
    if (state.scene !== 'home') {
        room.player.x = (house.x1 + house.x2) / 2;
        room.player.y = house.f1;
        room.player.grounded = true;
    }
    return room;
}

export class EntryTimeline {
    readonly duration: number;
    elapsed = 0;
    finished = false;

    constructor(readonly kind: EntryKind, readonly reduced = false) {
        this.duration = reduced ? .18 : { fold: 3.8, door: 2, book: 2.8 }[kind];
    }

    get progress(): number { return this.elapsed / this.duration; }

    advance(dt: number, visible: boolean, ready: boolean): void {
        if (this.finished || !visible || !ready || !Number.isFinite(dt)) return;
        this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, dt));
        this.finished = this.elapsed + 1e-9 >= this.duration;
        if (this.finished) this.elapsed = this.duration;
    }

    skip(): void { this.elapsed = this.duration; this.finished = true; }
}
