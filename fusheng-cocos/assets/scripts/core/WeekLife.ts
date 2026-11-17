import { CourseState, createCourse, validCourse } from './LifeCourse';
import { weekText } from './WeekText';
import type { Sim } from './Sim';
import { clamp, Command, GameState, SceneId, SimPanel } from './Types';
export const SUBJECTS = [
    { id: 'window', get name() {
            return weekText("week.copy.0ca678346f42");
        }, scene: 'home', get source() {
            return weekText("week.copy.0c9282c3e398");
        }, color: '#b28055' },
    { id: 'alley', get name() {
            return weekText("week.copy.b305b6e93a60");
        }, scene: 'street', get source() {
            return weekText("week.copy.ebe4ac8149c3");
        }, color: '#ad6450' },
    { id: 'pond', get name() {
            return weekText("week.copy.ac410b29618a");
        }, scene: 'park', get source() {
            return weekText("week.copy.60e975ac19e2");
        }, color: '#63878a' },
    { id: 'tree', get name() {
            return weekText("week.copy.e32ac06bac42");
        }, scene: 'park', get source() {
            return weekText("week.copy.ceefb2064298");
        }, color: '#78835c' },
    { id: 'book', get name() {
            return weekText("week.copy.271b134f4266");
        }, scene: 'book', get source() {
            return weekText("week.copy.4edb06c4dbb3");
        }, color: '#84718f' },
    { id: 'portrait', get name() {
            return weekText("week.copy.7cfd9357cb44");
        }, scene: 'home', get source() {
            return weekText("week.copy.7a63e5dae7e0");
        }, color: '#ad8265' },
] as const;
export const STYLES = [{ id: 'warm', get name() {
            return weekText("week.copy.1a407ccbb6dc");
        }, get desc() {
            return weekText("week.copy.4e6b29a09726");
        } }, { id: 'ink', get name() {
            return weekText("week.copy.7a9d6d6d7c07");
        }, get desc() {
            return weekText("week.copy.27570d89fb02");
        } }, { id: 'quiet', get name() {
            return weekText("week.copy.db55995d748e");
        }, get desc() {
            return weekText("week.copy.487ec7a150b3");
        } }] as const;
export const NEIGHBORS = [
    { id: 'zhou', get name() {
            return weekText("week.copy.91065bc20a8d");
        }, scene: 'home', favorite: 'portrait', get intro() {
            return weekText("week.copy.287145371380");
        }, get gift() {
            return weekText("week.copy.ab52bce64338");
        } },
    { id: 'lin', get name() {
            return weekText("week.copy.bb8b40a6b626");
        }, scene: 'store', favorite: 'alley', get intro() {
            return weekText("week.copy.7cccd1712e15");
        }, get gift() {
            return weekText("week.copy.7418b572aaa6");
        } },
    { id: 'ye', get name() {
            return weekText("week.copy.753ef2152203");
        }, scene: 'book', favorite: 'book', get intro() {
            return weekText("week.copy.7ddd92b0d448");
        }, get gift() {
            return weekText("week.copy.bb65d9416c8b");
        } },
] as const;
export const THEMES = [{ id: 'alley', get name() {
            return weekText("week.copy.49d15371958f");
        }, subjects: ['alley', 'window'] }, { id: 'pond', get name() {
            return weekText("week.copy.e132236dae91");
        }, subjects: ['pond', 'tree'] }, { id: 'portrait', get name() {
            return weekText("week.copy.b55f96a51490");
        }, subjects: ['portrait', 'book'] }];
export const COMMISSIONS = [
    { id: 'lin', get name() {
            return weekText("week.copy.67072cf9000d");
        }, subject: 'alley', style: 'warm', reward: 100, get desc() {
            return weekText("week.copy.089a810263b7");
        } },
    { id: 'ye', get name() {
            return weekText("week.copy.b8dbdf6881a5");
        }, subject: 'book', style: 'ink', reward: 90, get desc() {
            return weekText("week.copy.f6b34b9928c0");
        } },
] as const;
export type NeighborId = typeof NEIGHBORS[number]['id'];
export type ArtStyle = typeof STYLES[number]['id'];
export interface Artwork {
    id: string;
    subject: string;
    style: ArtStyle;
    quality: number;
    value: number;
    week: number;
    status: 'stored' | 'sold' | 'gifted' | 'displayed' | 'reserved';
    recipient?: string;
    slot?: number;
}
export interface NeighborMemory {
    trust: number;
    lastTalk: number;
    giftWeek: number;
    loan: number;
    memories: string[];
}
export interface LifeState {
    version: 1;
    course?: CourseState;
    focus: number;
    inspiration: number;
    subjects: string[];
    works: Artwork[];
    serial: number;
    neighbors: Record<NeighborId, NeighborMemory>;
    commission: {
        id: string | null;
        status: 'open' | 'accepted' | 'done' | 'missed';
    };
    help: 'open' | 'promised' | 'done' | 'missed';
    price: 'friendly' | 'fair' | 'premium';
    market: {
        status: 'planning' | 'open' | 'complete' | 'missed';
        round: number;
        earned: number;
        sold: number;
        themed: number;
        report: string[];
    };
    keepsakes: {
        id: string;
        name: string;
        displayed: boolean;
    }[];
    log: string[];
    history: string[];
    followup: string;
    visited: string[];
}
export type LifeAction = 'journal' | 'collection' | 'inspect' | 'compose' | 'paint' | 'explore' | 'neighbor' | 'talk' | 'accept' | 'deliver' | 'promise' | 'help' | 'borrow' | 'repay' | 'sell' | 'gift' | 'hang' | 'store' | 'reserve' | 'market' | 'price' | 'serve' | 'pass' | 'leave' | 'rest' | 'keepsake';
export interface LifeCommand {
    type: 'Life';
    action: LifeAction;
    id?: string;
    style?: ArtStyle;
    slot?: number;
    price?: LifeState['price'];
}
export const createLife = (age = 7): LifeState => ({
    version: 1, course: createCourse(age), focus: 3, inspiration: 0, subjects: ['window'], works: [], serial: 0,
    neighbors: { zhou: { trust: 18, lastTalk: 0, giftWeek: 0, loan: 0, memories: [] }, lin: { trust: 12, lastTalk: 0, giftWeek: 0, loan: 0, memories: [] }, ye: { trust: 12, lastTalk: 0, giftWeek: 0, loan: 0, memories: [] } },
    commission: { id: null, status: 'open' }, help: 'open', price: 'fair', market: { status: 'planning', round: 0, earned: 0, sold: 0, themed: 0, report: [] },
    keepsakes: [], log: [], history: [], followup: weekText("week.copy.234d3db6b20c"), visited: [],
});
export const artName = (work: Artwork): string => SUBJECTS.find(s => s.id === work.subject)?.name ?? weekText("week.copy.86d0b7f720e0");
export const styleName = (style: string): string => STYLES.find(s => s.id === style)?.name ?? style;
export const lifePanel = (kind: string): boolean => ['Journal', 'Collection', 'Artwork', 'Compose', 'Neighbor', 'Market', 'WeekRecap', 'RestConfirm', 'LifeCourse', 'LifeChoice', 'LifeEnding'].includes(kind);
// Old envelopes have no life field and continue using the original simulation.
// New progress is validated before it can enter Sim, including every item owner.
export function validLife(value: unknown): value is LifeState {
    const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    const num = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
    const strings = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.length <= 500);
    if (!obj(value))
        return false;
    const v = value;
    if (v.course !== undefined && !validCourse(v.course)) return false;
    if (v.version !== 1 || !num(v.focus, 0, 3) || !num(v.inspiration, 0, 6) || !num(v.serial) || !strings(v.subjects, 6) || !(v.subjects as string[]).every(id => SUBJECTS.some(s => s.id === id)))
        return false;
    if (!Array.isArray(v.works) || v.works.length > 48)
        return false;
    const ids = new Set<string>(), slots = new Set<number>();
    for (const a of v.works) {
        if (!obj(a) || typeof a.id !== 'string' || a.id.length > 40 || ids.has(a.id) || !SUBJECTS.some(s => s.id === a.subject) || !STYLES.some(s => s.id === a.style) || !num(a.quality, 1, 100) || !num(a.value, 1, 500) || !num(a.week, 1) || !['stored', 'sold', 'gifted', 'displayed', 'reserved'].includes(String(a.status)))
            return false;
        ids.add(a.id);
        if (a.status === 'displayed') {
            if (!Number.isInteger(a.slot) || !num(a.slot, 0, 2) || slots.has(a.slot as number))
                return false;
            slots.add(a.slot as number);
        }
        if (a.recipient !== undefined && typeof a.recipient !== 'string')
            return false;
    }
    if (!obj(v.neighbors))
        return false;
    for (const id of ['zhou', 'lin', 'ye']) {
        const n = v.neighbors[id];
        if (!obj(n) || !num(n.trust, 0, 100) || !num(n.lastTalk) || !num(n.giftWeek) || !num(n.loan, 0, 60) || !strings(n.memories, 5))
            return false;
    }
    const commission = v.commission;
    if (!obj(commission) || !(commission.id === null || COMMISSIONS.some(c => c.id === commission.id)) || !['open', 'accepted', 'done', 'missed'].includes(String(commission.status)))
        return false;
    if (!['open', 'promised', 'done', 'missed'].includes(String(v.help)) || !['friendly', 'fair', 'premium'].includes(String(v.price)))
        return false;
    const m = v.market;
    if (!obj(m) || !['planning', 'open', 'complete', 'missed'].includes(String(m.status)) || !num(m.round, 0, 3) || !num(m.earned) || !num(m.sold, 0, 3) || !num(m.themed, 0, 3) || !strings(m.report, 5))
        return false;
    if (!Array.isArray(v.keepsakes) || v.keepsakes.length > 10 || v.keepsakes.some(k => !obj(k) || typeof k.id !== 'string' || typeof k.name !== 'string' || k.name.length > 40 || typeof k.displayed !== 'boolean'))
        return false;
    return strings(v.log, 32) && strings(v.history, 8) && strings(v.visited, 4) && typeof v.followup === 'string' && v.followup.length <= 2000;
}
export class WeekLife {
    constructor(private readonly sim: Sim) { }
    get state(): GameState { return this.sim.state; }
    get data(): LifeState { return this.state.life!; }
    get theme() { return THEMES[(this.state.week - 1) % THEMES.length]; }
    get dayIndex(): number { return (this.state.week - 1) * 7 + this.state.day; }
    commissionFor(id: string) { const base = COMMISSIONS.find(c => c.id === id); if (!base) return undefined; if (this.state.age >= 18) return base; const prefix = this.state.age < 13 ? 'course.childCommission.' : 'course.teenCommission.'; return { ...base, name: this.sim.course.text(prefix + id + '.name'), desc: this.sim.course.text(prefix + id + '.desc'), reward: this.state.age < 13 ? (id === 'lin' ? 35 : 30) : (id === 'lin' ? 50 : 45) }; }
    get commission() { return this.commissionFor(this.data.commission.id ?? ''); }
    get customer() { const subjects = [this.theme.subjects[0], 'book', 'portrait']; return [{ name: weekText("week.copy.8d1025301e99"), subject: subjects[0], style: 'warm', budget: 110 }, { name: weekText("week.copy.6254e2eb4f3a"), subject: subjects[1], style: 'ink', budget: 140 }, { name: weekText("week.copy.971c7c8b98a9"), subject: subjects[2], style: 'quiet', budget: 95 }][Math.min(2, this.data.market.round)]; }
    work(id?: string): Artwork | undefined { return this.data.works.find(w => w.id === id); }
    private note(text: string): void { this.data.log.push(weekText("week.copy.539aabd480ea", { p0: this.state.week, p1: this.state.day, p2: text })); this.data.log = this.data.log.slice(-32); }
    private remember(id: NeighborId, text: string): void { const n = this.data.neighbors[id]; n.memories.push(text); n.memories = n.memories.slice(-5); this.note(text); }
    private trust(id: NeighborId, delta: number): void { this.data.neighbors[id].trust = clamp(this.data.neighbors[id].trust + delta); if (id === 'zhou')
        this.state.rel.trust = this.data.neighbors.zhou.trust; }
    private toast(text: string): void { this.sim.toast(text); }
    private reply(title: string, text: string): void { this.state.panel = { kind: 'Reply', title, body: text }; }
    private spend(focus: number, minutes: number, money = 0): boolean {
        if (this.data.focus < focus) {
            this.toast(weekText("week.copy.948d00e0568b"));
            return false;
        }
        if (this.state.clock + minutes >= this.sim.content.rules.endClock) {
            this.toast(weekText("week.copy.297f55167ed2"));
            return false;
        }
        if (this.state.money < money) {
            this.toast(weekText("week.copy.27ae70b20f32"));
            return false;
        }
        this.data.focus -= focus;
        this.state.clock += minutes;
        this.state.money -= money;
        return true;
    }
    private grant(id: string, name: string): void { if (!this.data.keepsakes.some(k => k.id === id))
        this.data.keepsakes.push({ id, name, displayed: true }); }
    private atNeighbor(id: NeighborId): boolean { const n = NEIGHBORS.find(n => n.id === id)!; return this.state.scene === n.scene && (id !== 'zhou' || this.sim.npcActive()); }
    private editable(work?: Artwork): work is Artwork { return !!work && ['stored', 'reserved', 'displayed'].includes(work.status); }
    quote(work: Artwork): {
        price: number;
        willBuy: boolean;
        reason: string;
    } {
        const c = this.customer, match = work.subject === c.subject, style = work.style === c.style;
        const price = Math.round(work.value * ({ friendly: .8, fair: 1, premium: 1.45 }[this.data.price]));
        const willingness = Math.min(c.budget, Math.round(work.value * (.9 + (match ? .4 : 0) + (style ? .2 : 0) + (this.data.help === 'done' ? .15 : 0) + Math.min(.15, this.state.stats.rep * .01))));
        return { price, willBuy: price <= willingness, reason: price <= willingness ? weekText("week.copy.ea455403b1f5") : weekText("week.copy.2e18dc8f6986", { p0: willingness }) };
    }
    open(kind: SimPanel['kind'], id?: string): void { this.state.panel = { kind, id }; this.sim.resetInput(); }
    handle(command: Command): boolean {
        if (command.type !== 'Life' || !this.state.life)
            return false;
        const { action, id } = command, s = this.state, l = this.data, p = s.panel;
        if (this.sim.course.finished || s.dayEnded || s.action || (p && (!lifePanel(p.kind) || ['LifeChoice', 'LifeEnding'].includes(p.kind))))
            return true;
        if (['journal', 'collection'].includes(action)) {
            this.open(action === 'journal' ? 'Journal' : 'Collection');
            return true;
        }
        if (action === 'inspect') {
            if (this.work(id))
                this.open('Artwork', id);
            return true;
        }
        if (action === 'neighbor') {
            if (NEIGHBORS.some(n => n.id === id) && this.atNeighbor(id as NeighborId))
                this.open('Neighbor', id);
            else
                this.toast(weekText("week.copy.2ef0f80b5e6f"));
            return true;
        }
        if (action === 'compose') {
            if (s.scene === 'home' && s.placed.some(f => f.furnitureId === 'easel'))
                this.open('Compose', id);
            else
                this.toast(weekText("week.copy.d27f6b5b480a"));
            return true;
        }
        if (action === 'explore') {
            const sub = SUBJECTS.find(x => x.id === id);
            if (!sub || s.scene !== sub.scene || sub.id === 'portrait')
                return true;
            if (!this.spend(1, 90))
                return true;
            if (!l.subjects.includes(sub.id))
                l.subjects.push(sub.id);
            l.inspiration = Math.min(6, l.inspiration + 2);
            if (!l.visited.includes(s.scene))
                l.visited.push(s.scene);
            this.sim.need('fun', 8);
            this.note(weekText("week.copy.11c7fbb511e3", { p0: sub.source, p1: sub.name }));
            this.reply(weekText("week.copy.3594cba7c12a"), weekText("week.copy.f347174f2fbc", { p0: sub.name, p1: l.inspiration }));
            return true;
        }
        if (action === 'paint') {
            const sub = SUBJECTS.find(x => x.id === id), style = command.style;
            if (s.scene !== 'home' || !s.placed.some(f => f.furnitureId === 'easel') || !sub || !l.subjects.includes(sub.id) || !STYLES.some(x => x.id === style))
                return true;
            if (l.works.filter(w => !['sold', 'gifted'].includes(w.status)).length >= 36) {
                this.toast(weekText("week.copy.d3eefaac69c2"));
                return true;
            }
            if (!this.spend(1, 150, s.age < 18 ? 0 : 6))
                return true;
            l.works = l.works.filter(w => !['sold', 'gifted'].includes(w.status) || l.works.indexOf(w) >= l.works.length - 10);
            const inspired = l.inspiration > 0, decor = (style === 'ink' && s.placed.some(f => f.furnitureId === 'bookshelf')) || (style === 'quiet' && s.placed.some(f => f.furnitureId === 'tea'));
            const quality = Math.round(clamp(40 + s.skills.paint.lv * 4 + (inspired ? 12 : 0) + (decor ? 6 : 0) + this.sim.random() * 10, 1, 100));
            if (inspired)
                l.inspiration--;
            const work: Artwork = { id: `w${s.week}-${++l.serial}`, subject: sub.id, style: style!, quality, value: Math.round(quality * .85 * this.sim.mods().paint * this.sim.mods().income), week: s.week, status: 'stored' };
            l.works.push(work);
            s.stats.paintings++;
            this.sim.xp('paint', 20 + (l.course?.direction === 'create' ? 4 : 0));
            this.sim.need('energy', -6);
            this.sim.need('fun', 10);
            this.note(weekText("week.copy.b53613e7d07e", { p0: styleName(style!), p1: sub.name }));
            this.open('Artwork', work.id);
            return true;
        }
        if (['sell', 'gift', 'hang', 'store', 'reserve'].includes(action)) {
            const w = this.work(id);
            if (!this.editable(w))
                return true;
            if (action === 'sell') {
                w.status = 'sold';
                delete w.slot;
                s.money += w.value;
                s.stats.earned += w.value;
                this.note(s.age < 18 ? this.sim.course.text('course.childSale', { work: artName(w), money: w.value }) : weekText("week.copy.903dc312ddbe", { p0: artName(w), p1: w.value }));
                this.open('Collection');
            }
            if (action === 'reserve') {
                if(l.market.status==='open'&&s.clock>=1200){this.finishMarket();return true;}
            if (l.market.status === 'complete' || l.market.status === 'missed') {
                    this.toast(weekText("week.copy.8bae017f2fa4"));
                    return true;
                }
                if (l.works.filter(w => w.status === 'reserved').length >= 3 && w.status !== 'reserved') {
                    this.toast(weekText("week.copy.ab7dbebfc9eb"));
                    return true;
                }
                w.status = 'reserved';
                delete w.slot;
                this.open('Artwork', w.id);
            }
            if (action === 'store') {
                w.status = 'stored';
                delete w.slot;
                this.open('Artwork', w.id);
            }
            if (action === 'hang') {
                if (s.scene !== 'home') {
                    this.toast(weekText("week.copy.e75417a1ddad"));
                    return true;
                }
                const slot = command.slot;
                if (slot === undefined || !Number.isInteger(slot) || slot < 0 || slot > 2)
                    return true;
                for (const other of l.works)
                    if (other.status === 'displayed' && other.slot === slot) {
                        other.status = 'stored';
                        delete other.slot;
                    }
                w.status = 'displayed';
                w.slot = slot;
                this.note(weekText("week.copy.ef5a7e6bed6a", { p0: artName(w) }));
                this.open('Artwork', w.id);
            }
            if (action === 'gift') {
                const n = NEIGHBORS[command.slot ?? -1];
                if (!n || !this.atNeighbor(n.id)) {
                    this.toast(weekText("week.copy.a7fb691733b7"));
                    return true;
                }
                const mem = l.neighbors[n.id];
                if (mem.giftWeek === s.week) {
                    this.toast(weekText("week.copy.8cb32a8be7c9"));
                    return true;
                }
                w.status = 'gifted';
                delete w.slot;
                w.recipient = n.id;
                mem.giftWeek = s.week;
                const favorite = n.favorite === w.subject;
                this.trust(n.id, favorite ? 15 : 8);
                this.remember(n.id, weekText("week.copy.9ec24cc55bb7", { p0: styleName(w.style), p1: artName(w), p2: n.name }));
                if (favorite)
                    this.grant(n.id, n.gift);
                this.reply(n.name, weekText("week.copy.116f745e3573", { p0: favorite ? 15 : 8, p1: favorite ? weekText("week.copy.a3ec8902fef4", { p0: n.gift }) : '' }));
            }
            return true;
        }
        if (action === 'keepsake') {
            const k = l.keepsakes.find(k => k.id === id);
            if (k && s.scene === 'home') {
                k.displayed = !k.displayed;
                this.open('Collection');
            }
            return true;
        }
        if (['talk', 'accept', 'deliver', 'promise', 'help', 'borrow', 'repay'].includes(action)) {
            if (!NEIGHBORS.some(n => n.id === id) || !this.atNeighbor(id as NeighborId))
                return true;
            const nid = id as NeighborId, n = l.neighbors[nid], def = NEIGHBORS.find(x => x.id === nid)!;
            if (action === 'talk') {
                if (n.lastTalk === this.dayIndex) {
                    this.toast(weekText("week.copy.f4d809c9d294"));
                    return true;
                }
                if (!this.spend(1, 60))
                    return true;
                n.lastTalk = this.dayIndex;
                this.trust(nid, 5);
                this.sim.need('fun', 8);
                this.sim.xp('social', 10);
                if (nid === 'zhou' && !l.subjects.includes('portrait'))
                    l.subjects.push('portrait');
                this.reply(def.name, s.age < 18 ? this.sim.course.text((s.age < 13 ? 'course.childTalk.' : 'course.teenTalk.') + nid) : n.memories.length ? weekText("week.copy.ecbdee8dd280", { p0: n.memories[n.memories.length - 1], p1: nid === 'zhou' ? weekText("week.copy.0ddc997b0af9") : nid === 'lin' ? weekText("week.copy.a05c96f0e326") : weekText("week.copy.169567d5a13d") }) : weekText("week.copy.2b140ca7d90a", { p0: def.intro, p1: nid === 'zhou' ? weekText("week.copy.e0ba8917e300") : weekText("week.copy.8f1265d605e6") }));
            }
            if (action === 'accept') {
                if (nid === 'zhou' || l.commission.status !== 'open' || s.day > 2) {
                    this.toast(weekText("week.copy.31aadc699570"));
                    return true;
                }
                l.commission = { id: nid, status: 'accepted' };
                this.remember(nid, weekText("week.copy.eae55b22ef11", { p0: nid === 'lin' ? weekText("week.copy.048f7c15f352") : weekText("week.copy.94e83f9886e7") }));
                this.reply(s.age < 18 ? this.sim.course.stage.commissionName : weekText("week.copy.b37cb97e5ec3"), s.age < 18 ? this.sim.course.text('course.childCommissionAccepted', { project: this.commissionFor(nid)!.desc }) : weekText("week.copy.3b7d16eb7444", { p0: this.commissionFor(nid)!.desc }));
            }
            if (action === 'deliver') {
                const c = this.commission;
                if (!c || c.id !== nid || l.commission.status !== 'accepted' || s.day !== 3) {
                    this.toast(weekText("week.copy.5cf9393f8a70"));
                    return true;
                }
                const w = l.works.find(w => ['stored', 'reserved'].includes(w.status) && w.subject === c.subject && w.style === c.style && w.quality >= 45);
                if (!w) {
                    this.toast(weekText("week.copy.b1cc4a92ce16", { p0: styleName(c.style), p1: SUBJECTS.find(s => s.id === c.subject)!.name }));
                    return true;
                }
                if (!this.spend(1, 180))
                    return true;
                w.status = 'gifted';
                w.recipient = nid;
                l.commission.status = 'done';
                s.money += c.reward;
                s.stats.earned += c.reward;
                s.stats.rep += 2;
                this.trust(nid, 12);
                this.remember(nid, weekText("week.copy.e411651e91c1", { p0: def.name }));
                if (nid === 'ye')
                    this.grant('ye', def.gift);
                this.reply(weekText("week.copy.bb7dcbaa6f7f"), s.age < 18 ? this.sim.course.text('course.childCommissionDone', { work: artName(w), money: c.reward }) : weekText("week.copy.0f6201244779", { p0: artName(w), p1: c.reward, p2: nid === 'lin' ? weekText("week.copy.003c37eb0857") : weekText("week.copy.007d4ec0c60b") }));
            }
            if (action === 'promise') {
                if (nid !== 'zhou' || l.help !== 'open' || s.day > 4)
                    return true;
                l.help = 'promised';
                this.remember('zhou', weekText("week.copy.339e53f7c093"));
                this.reply(weekText("week.copy.1d8308f77b7d"), s.age < 18 ? this.sim.course.text('course.childHelp') : weekText("week.copy.50c080e84582"));
            }
            if (action === 'help') {
                if (nid !== 'zhou' || l.help !== 'promised' || s.day > 5)
                    return true;
                if (!this.spend(2, 240))
                    return true;
                l.help = 'done';
                this.trust('zhou', 12);
                this.remember('zhou', weekText("week.copy.3d8f0689765b"));
                this.reply(weekText("week.copy.59c57d42207c"), s.age < 18 ? this.sim.course.text('course.childHelpDone') : weekText("week.copy.6808671a9bd2"));
            }
            if (action === 'borrow') {
                if (s.age < 18) { this.toast(this.sim.course.text('course.childBorrow')); return true; }
                if (nid !== 'zhou' || n.trust < 30) {
                    this.toast(weekText("week.copy.864d72272903"));
                    return true;
                }
                if (n.loan) {
                    this.toast(weekText("week.copy.2324fe25febd"));
                    return true;
                }
                n.loan = 60;
                s.money += 60;
                this.remember('zhou', weekText("week.copy.1f626fa06f2a"));
                this.open('Neighbor', 'zhou');
            }
            if (action === 'repay') {
                if (nid !== 'zhou' || n.loan === 0)
                    return true;
                if (s.money < n.loan) {
                    this.toast(weekText("week.copy.5e72d7ec4d65"));
                    return true;
                }
                s.money -= n.loan;
                n.loan = 0;
                this.remember('zhou', weekText("week.copy.d14c9d4a4fd3"));
                this.open('Neighbor', 'zhou');
            }
            return true;
        }
        if (action === 'market') {
            if (s.scene !== 'street') {
                this.toast(weekText("week.copy.c90f6ada929b"));
                return true;
            }
            if (s.day !== 7) {
                this.reply(weekText("week.copy.40c6775470ef"), weekText("week.copy.2ab7fc06749c"));
                return true;
            }
            if(l.market.status==='open'&&s.clock>=1200){this.finishMarket();return true;}
            if (l.market.status === 'complete' || l.market.status === 'missed') {
                this.open('Market');
                return true;
            }
            if (s.clock < 600) s.clock = 600;
            if (s.clock >= 1200) {
                this.toast(weekText("week.copy.785c1c612e5f"));
                return true;
            }
            if(l.market.status==='planning'&&!l.works.some(w=>w.status==='reserved')){for(const w of l.works.filter(w=>w.status==='stored').slice(0,3))w.status='reserved';}
            l.market.status = 'open';
            this.open('Market');
            return true;
        }
        if (['price', 'serve', 'pass', 'leave'].includes(action)) {
            if (s.scene !== 'street' || s.day !== 7 || p?.kind !== 'Market' || l.market.status !== 'open')
                return true;
            if(s.clock>=1200){this.finishMarket();return true;}
            if (action === 'price') {
                if (command.price && ['friendly', 'fair', 'premium'].includes(command.price))
                    l.price = command.price;
                return true;
            }
            if (action === 'leave') {
                this.finishMarket();
                return true;
            }
            if (action === 'serve') {
                const w = this.work(id);
                if (!w || w.status!=='reserved')
                    return true;
                const q = this.quote(w), name = this.customer.name;
                if (q.willBuy) {
                    w.status = 'sold';
                    w.recipient = name;
                    s.money += q.price;
                    s.stats.earned += q.price;
                    l.market.earned += q.price;
                    l.market.sold++;
                    if (this.theme.subjects.includes(w.subject))
                        l.market.themed++;
                    l.market.report.push(weekText("week.copy.95756a66dfb9", { p0: name, p1: artName(w), p2: q.price }));
                }
                else
                    l.market.report.push(weekText("week.copy.65dd76183242", { p0: name, p1: artName(w) }));
            }
            else
                l.market.report.push(weekText("week.copy.d4e7e99f5920", { p0: this.customer.name }));
            s.clock = Math.min(1200, s.clock + 60);
            l.market.round++;
            if (l.market.round >= 3 || s.clock>=1200)
                this.finishMarket();
            else
                this.open('Market');
            return true;
        }
        if (action === 'rest') {
            if (p?.kind === 'RestConfirm') {
                s.panel = null;
                this.missMarket();
                this.sim.endDay(false);
            }
            return true;
        }
        return true;
    }
    private finishMarket(): void {
        const l = this.data;
        if (l.market.status === 'complete')
            return;
        l.market.status = 'complete';
        this.state.story.fair = true;
        this.state.stats.rep += l.market.sold;
        if (l.market.themed > 0) {
            this.grant('market', weekText("week.copy.680308d68eb7"));
            l.market.report.push(weekText("week.copy.ed42854b1fad"));
        }
        for (const w of l.works)
            if (w.status === 'reserved')
                w.status = 'stored';
        this.note(weekText("week.copy.6072001b6f58", { p0: l.market.sold, p1: l.market.earned }));
        this.open('Market');
    }
    private missMarket(): void { if (['planning', 'open'].includes(this.data.market.status)) {
        if (this.data.market.status === 'open')
            this.finishMarket();
        else {
            this.data.market.status = 'missed';
            this.note(weekText("week.copy.1e72a1e1ac60"));
        }
        for (const w of this.data.works)
            if (w.status === 'reserved')
                w.status = 'stored';
    } }
    beforeRest(auto: boolean): boolean {
        if (this.state.day === 7 && ['planning', 'open'].includes(this.data.market.status)) {
            if (!auto && this.state.clock < 1200) {
                this.open('RestConfirm');
                return true;
            }
            this.missMarket();
        }
        return false;
    }
    finishDay(): void {
        const l = this.data, s = this.state;
        if (s.day === 3 && l.commission.status === 'accepted') {
            l.commission.status = 'missed';
            const id = l.commission.id as NeighborId;
            this.trust(id, -6);
            this.remember(id, weekText("week.copy.cc098dc0cde0"));
        }
        if (s.day === 5 && l.help === 'promised') {
            l.help = 'missed';
            this.trust('zhou', -5);
            this.remember('zhou', weekText("week.copy.da2dffb44511"));
        }
    }
    nextDay(): void { this.data.focus = 3; this.sim.need('food', 30); this.sim.need('clean', 20); this.sim.need('fun', 10); }
    recap(): void {
        this.missMarket();
        const l = this.data, m = l.market;
        const year = this.sim.course.finishYear();
        const title = m.sold >= 2 ? weekText("week.copy.b9b27c0d0f1e") : l.works.some(w => w.week === this.state.week && ['gifted', 'displayed'].includes(w.status)) || l.help === 'done' ? weekText("week.copy.65abd993c4d2") : weekText("week.copy.7ea2f32eea28");
        const line = weekText("week.copy.9b4472ef158f", { p0: this.state.week, p1: title, p2: m.earned, p3: m.sold });
        if (!l.history.some(h => h.startsWith(weekText("week.copy.5da981c0143d", { p0: this.state.week })))) {
            l.history.push(line);
            l.history = l.history.slice(-8);
        }
        this.state.panel = { kind: 'WeekRecap', title: this.sim.course.text('course.recapTitle', { age: this.state.age }), body: this.sim.course.yearText(year) + '\n\n' + line };
    }
    nextWeek(): void {
        const l = this.data, s = this.state, follow: string[] = [];
        if (this.sim.course.finished) return;
        if (s.age >= 30) { this.sim.course.complete(); return; }
        if (l.help === 'done') {
            this.grant('zhou', weekText("week.copy.ab52bce64338"));
            follow.push(weekText("week.copy.aa1c10ccf1b5"));
        }
        if (l.commission.status === 'done') {
            if (l.commission.id === 'lin') {
                s.money += 6;
                follow.push(weekText("week.copy.aca804b937b1"));
            }
            else {
                l.inspiration = Math.min(6, l.inspiration + 2);
                follow.push(weekText("week.copy.cc4557acf846"));
            }
        }
        for (const n of NEIGHBORS) {
            const mem = l.neighbors[n.id];
            if (mem.giftWeek === s.week)
                follow.push(weekText("week.copy.4c30cfc662a0", { p0: n.name }));
            if (mem.loan) {
                this.trust(n.id, -2);
                follow.push(weekText("week.copy.297884e9612e"));
            }
        }
        if (l.market.themed)
            follow.push(weekText("week.copy.8f962e5b3cf1"));
        if (!follow.length)
            follow.push(weekText("week.copy.466b97ee7b7b"));
        s.week++;
        s.age++;
        s.growth.body++;
        s.day = 1;
        s.clock = this.sim.content.rules.startClock;
        s.dayEnded = false;
        s.action = null;
        s.scene = 'home';
        s.buffs = [];
        s.needs.energy = 100;
        s.eventsToday = 0;
        l.focus = 3;
        l.commission = { id: null, status: 'open' };
        l.help = 'open';
        l.market = { status: 'planning', round: 0, earned: 0, sold: 0, themed: 0, report: [] };
        l.price = 'fair';
        l.followup = follow.join('\n');
        l.visited = [];
        this.sim.resetPlayer();
        this.sim.generateTasks();
        s.dayStart = { money: s.money, needs: { ...s.needs } };
        this.nextDay();
        this.sim.course.beginYear();
    }
}
