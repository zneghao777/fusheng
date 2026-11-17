import type { MusicTrack } from '../core/MusicScene';

export interface MusicInfo {
    id: MusicTrack;
    title: string;
    author: string;
    source: string;
    resource: string | null;
    fallback: MusicTrack;
}
export interface MusicCatalog { tracks: MusicInfo[]; }
interface MusicPreferences { muted: boolean; volume: number; }
interface Voice { track: MusicTrack; source: AudioBufferSourceNode; gain: GainNode; }

const PREFERENCES_KEY = 'fs.music';
const FADE_SECONDS = 1.4;

/** Browser audio stays in the platform layer, independent of simulation time. */
export class GameMusic {
    muted = false;
    volume = .4;
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private voice: Voice | null = null;
    private retiring = new Set<Voice>();
    private catalog: MusicCatalog = { tracks: [] };
    private desired: MusicTrack = 'title';
    private hidden = false;
    private disposed = false;
    private generation = 0;
    private loading: MusicTrack | null = null;
    private buffers = new Map<MusicTrack, AudioBuffer>();
    private failures = new Map<MusicTrack, number>();
    private lastError: string | null = null;
    private gesture = () => { void this.unlock(); };

    constructor(private readonly load: (resource: string) => Promise<ArrayBuffer>) {
        try {
            const saved: Partial<MusicPreferences> = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}');
            if (typeof saved.muted === 'boolean') this.muted = saved.muted;
            if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) this.volume = Math.max(0, Math.min(1, saved.volume));
        } catch { /* Storage can be unavailable in private browsing. */ }
        for (const type of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(type, this.gesture, true);
    }

    configure(catalog: MusicCatalog): void { this.catalog = catalog; }
    get tracks(): readonly MusicInfo[] { return this.catalog.tracks; }
    get current(): MusicInfo | undefined { return this.catalog.tracks.find(t => t.id === this.voice?.track); }
    get status(): object {
        return { requested: this.desired, current: this.voice?.track ?? null, loading: this.loading,
            state: this.context?.state ?? 'locked', muted: this.muted, volume: this.volume,
            hidden: this.hidden, gain: this.master?.gain.value ?? 0, error: this.lastError };
    }

    setMuted(muted: boolean): void {
        this.muted = muted; this.persist(); this.applyVolume();
        if (muted) this.cancelPending();
        else { void this.unlock(); }
    }
    setVolume(volume: number): void {
        if (!Number.isFinite(volume)) return;
        this.volume = Math.max(0, Math.min(1, volume)); this.persist(); this.applyVolume();
        if (!this.volume) this.cancelPending();
        else this.ensurePlaying();
    }
    sync(track: MusicTrack): void {
        if (this.desired !== track) { this.desired = track; this.cancelPending(); }
        this.ensurePlaying();
    }
    onHide(): void {
        this.hidden = true; this.cancelPending();
        if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
    }
    onShow(): void { this.hidden = false; void this.unlock(false); }

    private persist(): void {
        try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ muted: this.muted, volume: this.volume })); } catch { /* Keep session preferences. */ }
    }
    private applyVolume(): void {
        if (!this.context || !this.master) return;
        const now = this.context.currentTime, gain = this.master.gain;
        gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + .12);
    }
    private async unlock(create = true): Promise<void> {
        if (this.disposed || this.hidden || this.muted || !this.volume) return;
        if (!this.context) {
            if (!create) return;
            try {
                const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (!Constructor) return;
                this.context = new Constructor({ sampleRate: 24000 });
                this.master = this.context.createGain(); this.master.gain.value = this.volume;
                this.master.connect(this.context.destination);
            } catch (error) { this.lastError = String(error); return; }
        }
        try { await this.context.resume(); this.ensurePlaying(); } catch { /* Retry at the next gesture. */ }
    }
    private cancelPending(): void { this.generation++; this.loading = null; }
    private resolveTrack(): MusicInfo | undefined {
        let track = this.catalog.tracks.find(t => t.id === this.desired);
        const visited = new Set<MusicTrack>();
        while (track && !track.resource && !visited.has(track.id)) {
            visited.add(track.id); track = this.catalog.tracks.find(t => t.id === track!.fallback);
        }
        return track?.resource ? track : undefined;
    }
    private ensurePlaying(): void {
        if (this.disposed || this.hidden || this.muted || !this.volume || this.context?.state !== 'running') return;
        const track = this.resolveTrack();
        if (!track || this.voice?.track === track.id || this.loading === track.id) return;
        if (Date.now() - (this.failures.get(track.id) ?? 0) < 15000) return;
        const generation = this.generation; this.loading = track.id;
        void this.startTrack(track, generation);
    }
    private async startTrack(track: MusicInfo, generation: number): Promise<void> {
        const context = this.context!;
        try {
            let buffer = this.buffers.get(track.id);
            if (!buffer) {
                const packed = new Uint8Array(await this.load(track.resource!));
                if (this.disposed || generation !== this.generation) return;
                if (String.fromCharCode(...packed.subarray(0, 4)) !== 'FSB1') throw new Error('Invalid music asset: ' + track.id);
                const bytes = packed.slice(4);
                for (let i = 0; i < bytes.length; i++) bytes[i] ^= (0x5a + i * 13) & 255;
                buffer = await context.decodeAudioData(bytes.buffer);
                if (this.disposed || generation !== this.generation) return;
                this.buffers.set(track.id, buffer);
                // Bound decoded PCM memory on mobile; keep only current and next tracks.
                for (const id of this.buffers.keys()) {
                    if (this.buffers.size <= 2) break;
                    if (id !== track.id && id !== this.voice?.track) this.buffers.delete(id);
                }
            }
            if (generation !== this.generation || this.hidden || this.muted || !this.volume) return;
            const now = context.currentTime, source = context.createBufferSource(), gain = context.createGain();
            source.buffer = buffer; source.loop = true; source.connect(gain); gain.connect(this.master!);
            gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + FADE_SECONDS);
            source.start();
            const previous = this.voice;
            this.voice = { track: track.id, source, gain }; this.lastError = null;
            if (previous) {
                this.retiring.add(previous);
                previous.gain.gain.cancelScheduledValues(now);
                previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
                previous.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
                previous.source.onended = () => { previous.source.disconnect(); previous.gain.disconnect(); this.retiring.delete(previous); };
                previous.source.stop(now + FADE_SECONDS + .05);
            }
        } catch (error) {
            if (generation === this.generation) { this.lastError = String(error); this.failures.set(track.id, Date.now()); }
        } finally { if (generation === this.generation) this.loading = null; }
    }
    dispose(): void {
        this.disposed = true; this.cancelPending();
        for (const type of ['pointerdown', 'touchend', 'keydown']) document.removeEventListener(type, this.gesture, true);
        for (const voice of [this.voice, ...this.retiring]) if (voice) { try { voice.source.stop(); } catch {} voice.source.disconnect(); voice.gain.disconnect(); }
        this.voice = null; this.retiring.clear(); this.buffers.clear();
        if (this.context) void this.context.close().catch(() => {});
    }
}
