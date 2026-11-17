import type { GameState } from './Types';

export type MusicTrack = 'title' | 'day' | 'book' | 'market' | 'night' | 'recap';

/** Menus keep the surrounding scene's music; only full pages use the theme. */
export function musicForScene(state: GameState, page: string | null): MusicTrack {
    if (page) return 'title';
    if (state.panel?.kind === 'WeekRecap') return 'recap';
    if (state.panel?.kind === 'DaySummary') return 'night';
    if (state.panel?.kind === 'Market') return 'market';
    if (state.life && state.day === 7 && state.scene === 'street' && state.clock >= 600 && state.clock < 1200) return 'market';
    if (state.clock >= 1200 || state.clock < 360) return 'night';
    if (state.scene === 'book' || state.panel?.kind === 'Compose') return 'book';
    return 'day';
}
