import { weekText } from '../core/WeekText';
import { Sim } from '../core/Sim';
import { Command, SimPanel } from '../core/Types';
import { Artwork, artName, LifeCommand, NEIGHBORS, STYLES, styleName, SUBJECTS } from '../core/WeekLife';
import { renderLifePanel } from './LifePanels';

export interface WeekButton {
    key: string;
    run: () => void;
    primary?: boolean;
}
export interface PanelPresentation {
    mode?: 'reading' | 'journal' | 'gallery';
    sections?: { title: string; body: string }[];
    gallery?: { artwork: Artwork; title: string; detail: string; run: () => void }[];
    empty?: { title: string; body: string };
}
export interface WeekPanelHost {
    show: (kind: string, title: string, body: string, actions: WeekButton[], preview?: Artwork, presentation?: PanelPresentation) => void;
    send: (command: Command) => void;
    /** Clear the current panel and synchronize Sim.paused before follow-up navigation. */
    close: () => void;
    finish?: () => void;
}
const text = (key: string, params: Record<string, string | number | undefined> = {}) => weekText(`life.ui.${key}`, params);
const DAYS = () => Array.from({ length: 7 }, (_, i) => text(`day.${i + 1}`));

export function renderWeekPanel(sim: Sim, panel: SimPanel, host: WeekPanelHost): void {
    if (renderLifePanel(sim, panel, host)) return;
    const s = sim.state, l = s.life!, life = sim.life, stage = sim.course.stage;
    const send = (action: LifeCommand['action'], id?: string, extra: Partial<LifeCommand> = {}) => host.send({ type: 'Life', action, id, ...extra });
    const button = (key: string, run: () => void, primary = false): WeekButton => ({ key, run, primary });
    const back = () => button(text('backScene'), host.close);
    const show = (title: string, body: string, actions: WeekButton[], preview?: Artwork, presentation?: PanelPresentation) => host.show(panel.kind, title, body, actions, preview, presentation);
    const goJournal = () => send('journal');
    const goCollection = () => send('collection');
    const yearRecords = () => {
        const weekPrefix = weekText('week.copy.5ab86c0a64df', { p0: s.week });
        const coursePrefixes = Array.from({ length: 7 }, (_, i) => sim.course.text('course.dayLog', { age: s.age, day: i + 1, text: '' }));
        return l.log.filter(line => line.startsWith(weekPrefix) || coursePrefixes.some(prefix => line.startsWith(prefix)));
    };
    const artTitle = (w: Artwork) => text('artTitle', { name: artName(w) });
    const artState = (w: Artwork) => text(`artState.${w.status}`, { slot: (w.slot ?? 0) + 1, person: NEIGHBORS.find(n => n.id === w.recipient)?.name ?? w.recipient ?? '' });
    const priceNames = { friendly: text('price.friendly'), fair: text('price.fair'), premium: text('price.premium') };

    if (panel.kind === 'Journal') {
        const c = life.commission;
        const status = text(`taskState.${l.commission.status}`);
        const project = c ? text('journal.project', { name: c.name, status }) : text('journal.noProject', { name: stage.commissionName });
        const promise = text(`promise.${l.help}`);
        const market = text(`marketState.${l.market.status}`, { name: stage.marketName, sold: l.market.sold, earned: l.market.earned });
        const overview = text('journal.overview', { age: s.age, stage: stage.name, day: DAYS()[s.day - 1], focus: l.focus, inspiration: l.inspiration, goal: stage.yearGoal, project, promise, market });
        const sections = [
            { title: text('journal.sectionToday'), body: text('journal.todayBody', { stage: stage.name, day: DAYS()[s.day - 1], focus: l.focus, inspiration: l.inspiration }) },
            { title: text('journal.sectionWish'), body: stage.yearGoal },
            { title: text('journal.sectionPromises'), body: [project, promise, market].join('\n\n') },
        ];
        const journalBack = () => button(text('backJournal'), goJournal);
        const showRecords = () => show(text('journal.records'), l.log.slice(-12).join('\n\n') || text('journal.emptyRecords'), [journalBack()], undefined, { mode: 'reading' });
        const showSchedule = () => {
            const category = s.age < 13 ? 'child' : s.age < 18 ? 'teen' : 'adult';
            const rows = DAYS().map((day, i) => text('journal.scheduleRow', { day, plan: text(`schedule.${category}.${i + 1}`), current: s.day === i + 1 ? text('journal.today') : '' })).join('\n\n');
            show(text('journal.schedule'), text('journal.scheduleIntro', { age: s.age, plan: rows }), [journalBack()], undefined, { mode: 'reading' });
        };
        const showNeighbors = () => show(text('journal.people'), NEIGHBORS.map(n => text('journal.person', { name: n.name, trust: l.neighbors[n.id].trust, memory: l.neighbors[n.id].memories.slice(-1).join('') || text('journal.noMemory') })).join('\n\n'), [journalBack()], undefined, { mode: 'reading' });
        show(text('journal.title', { age: s.age }), overview, [
            button(text('journal.course'), () => host.send({ type: 'Course', action: 'open' }), true),
            button(text('journal.schedule'), showSchedule),
            button(text('collection.title'), goCollection),
            button(text('journal.people'), showNeighbors),
            button(text('journal.records'), showRecords),
            button(text('journal.echo'), () => show(text('journal.echo'), l.followup, [journalBack()], undefined, { mode: 'reading' })),
        ], undefined, { mode: 'journal', sections });
        return;
    }
    if (panel.kind === 'Compose') {
        const sub = SUBJECTS.find(x => x.id === panel.id && l.subjects.includes(x.id));
        if (!sub) {
            const sources = SUBJECTS.filter(x => !l.subjects.includes(x.id)).map(x => text('compose.source', { name: x.name, source: x.source })).join('\n');
            show(text('compose.title'), text('compose.overview', { focus: l.focus, inspiration: l.inspiration, sources: sources || text('compose.allSubjects') }), [
                ...SUBJECTS.filter(x => l.subjects.includes(x.id)).map(x => button(text('compose.subject', { name: x.name }), () => send('compose', x.id))),
                button(text('collection.title'), goCollection), back(),
            ]);
        } else {
            const styles = STYLES.map(x => text('compose.styleLine', { name: x.name, desc: x.desc })).join('\n');
            show(text('compose.chooseStyle', { name: sub.name }), text('compose.cost', { focus: l.focus, inspiration: l.inspiration, materials: s.age < 18 ? text('compose.familyMaterials') : text('compose.ownMaterials'), styles }), [
                ...STYLES.map(x => button(text('compose.paintStyle', { style: x.name }), () => send('paint', sub.id, { style: x.id }), x.id === 'warm')),
                button(text('compose.backSubjects'), () => send('compose')), back(),
            ]);
        }
        return;
    }
    if (panel.kind === 'Collection') {
        const available = l.works.filter(w => !['sold', 'gifted'].includes(w.status));
        const hasEasel = () => s.placed.some(f => f.furnitureId === 'easel');
        const atHome = () => s.scene === 'home';
        const createLabel = () => text(!hasEasel() ? 'collection.prepareStudio' : s.scene === 'home' ? 'collection.create' : 'collection.returnCreate');
        const create = () => {
            if (!hasEasel()) {
                show(text('collection.prepareStudio'), text('collection.noEasel'), [button(text('backCollection'), goCollection)], undefined, { mode: 'reading' });
                return;
            }
            if (!atHome()) {
                // Travel rejects an open panel and a paused simulation. The host closes
                // its surface and recomputes pause state; it must not bypass other pauses.
                host.close();
                host.send({ type: 'Travel', scene: 'home' });
                if (!atHome()) {
                    send('collection');
                    sim.toast('life.ui.collection.returnBlocked');
                    return;
                }
            }
            // Compose still enforces the home/easel and current activity rules.
            if (hasEasel()) send('compose');
        };
        const galleryFor = (works: Artwork[]): NonNullable<PanelPresentation['gallery']> => works.slice().reverse().map(artwork => ({
            artwork,
            title: artTitle(artwork),
            detail: text('collection.workDetail', { style: styleName(artwork.style), quality: artwork.quality, state: artState(artwork) }),
            run: () => send('inspect', artwork.id),
        }));
        // Keep the same callbacks in legacy actions so gallery hosts can suppress the
        // duplicate text rows without removing navigation from older renderers.
        const workButtons = (gallery: NonNullable<PanelPresentation['gallery']>) => gallery.map(item => button(text('collection.workRow', { name: artName(item.artwork), style: styleName(item.artwork.style), state: artState(item.artwork) }), item.run));
        const empty = (body: string, title = text('collection.emptyTitle')) => ({ title, body });
        const creationHint = () => text(!hasEasel() ? 'collection.noEasel' : s.scene === 'home' ? 'collection.emptyHome' : 'collection.emptyAway');
        const showWorks = (title: string, works: Artwork[], emptyBody = creationHint(), emptyTitle = text('collection.emptyTitle')) => {
            const gallery = galleryFor(works);
            show(title, works.length ? text('collection.pickWork', { count: works.length }) : emptyBody, [
                ...workButtons(gallery),
                ...(!works.length ? [button(createLabel(), create, true)] : []),
                button(text('backCollection'), goCollection),
            ], undefined, { mode: 'gallery', gallery, ...(!works.length ? { empty: empty(emptyBody, emptyTitle) } : {}) });
        };
        const showKeepsakes = () => show(text('collection.keepsakes'), text('collection.keepsakeIntro'), [
            ...l.keepsakes.map(k => button(text(k.displayed ? 'collection.putAway' : 'collection.display', { name: k.name }), () => send('keepsake', k.id))),
            button(text('backCollection'), goCollection),
        ]);
        const gallery = galleryFor(available);
        const overview = text('collection.overview', { count: available.length, displayed: l.works.filter(w => w.status === 'displayed').length, reserved: l.works.filter(w => w.status === 'reserved').length, keepsakes: l.keepsakes.length, market: stage.marketName });
        show(text('collection.title'), [overview, ...(!available.length ? [creationHint()] : [])].join('\n\n'), [
            ...workButtons(gallery),
            button(createLabel(), create, !available.length),
            ...(available.length ? [button(text('collection.allWorks'), () => showWorks(text('collection.allWorks'), available))] : []),
            button(text('collection.exhibit', { name: stage.marketName }), () => showWorks(stage.marketName, available.filter(w => w.status === 'reserved'), text('collection.noReserved', { market: stage.marketName }), text('collection.emptyExhibitTitle'))),
            ...(l.keepsakes.length ? [button(text('collection.keepsakes'), showKeepsakes)] : []),
            ...(l.works.some(w => ['sold', 'gifted'].includes(w.status)) ? [button(text('collection.departed'), () => showWorks(text('collection.departed'), l.works.filter(w => ['sold', 'gifted'].includes(w.status))))] : []),
            button(text('backJournal'), goJournal),
        ], undefined, { mode: 'gallery', gallery, ...(!available.length ? { empty: empty(creationHint()) } : {}) });
        return;
    }
    if (panel.kind === 'Artwork') {
        const w = life.work(panel.id);
        if (!w) { goCollection(); return; }
        const editable = ['stored', 'reserved', 'displayed'].includes(w.status);
        const near = NEIGHBORS.find(n => n.scene === s.scene && (n.id !== 'zhou' || sim.npcActive()));
        const view = () => send('inspect', w.id);
        const viewBack = () => button(text('artwork.back'), view);
        const showWall = () => show(text('artwork.wallTitle'), text('artwork.wallHint'), [
            ...Array.from({ length: 3 }, (_, slot) => {
                const current = l.works.find(a => a.status === 'displayed' && a.slot === slot);
                return button(text('artwork.wallSlot', { slot: slot + 1, current: current ? artName(current) : text('artwork.emptySlot') }), () => send('hang', w.id, { slot }));
            }), viewBack(),
        ], w);
        const sellLabel = text(s.age < 18 ? 'artwork.familySell' : 'artwork.sell', { value: w.value });
        const confirmSell = () => show(sellLabel, text(s.age < 18 ? 'artwork.familySellHint' : 'artwork.sellHint', { name: artName(w), value: w.value }), [button(sellLabel, () => send('sell', w.id), true), viewBack()], w);
        const confirmGift = () => {
            if (!near) return;
            show(text('artwork.gift', { name: near.name }), text('artwork.giftHint', { name: artName(w), person: near.name, preference: near.favorite === w.subject ? text('artwork.favorite') : text('artwork.generalGift') }), [button(text('artwork.giveNow'), () => send('gift', w.id, { slot: NEIGHBORS.indexOf(near) }), true), viewBack()], w);
        };
        const showTransfer = () => show(text('artwork.transfer'), text('artwork.transferHint'), [button(sellLabel, confirmSell), ...(near ? [button(text('artwork.gift', { name: near.name }), confirmGift)] : []), viewBack()], w);
        const actions: WeekButton[] = [];
        if (editable) {
            if (w.status !== 'reserved' && ['planning', 'open'].includes(l.market.status)) actions.push(button(text('artwork.reserve', { name: stage.marketName }), () => send('reserve', w.id), true));
            if (s.scene === 'home') actions.push(button(text('artwork.hang'), showWall));
            if (w.status !== 'stored') actions.push(button(text('artwork.store'), () => send('store', w.id)));
            actions.push(button(text('artwork.transfer'), showTransfer));
        }
        actions.push(button(text('backCollection'), goCollection), back());
        show(artTitle(w), text('artwork.overview', { style: styleName(w.style), quality: w.quality, age: Math.max(sim.course.data.startedAge, s.age - (s.week - w.week)), value: w.value, state: artState(w) }), actions, w);
        return;
    }
    if (panel.kind === 'Neighbor') {
        const n = NEIGHBORS.find(n => n.id === panel.id);
        if (!n) { host.close(); return; }
        const mem = l.neighbors[n.id], actions: WeekButton[] = [];
        if (mem.lastTalk !== life.dayIndex) actions.push(button(text('neighbor.talk'), () => send('talk', n.id), true));
        if (n.id === 'zhou') {
            if (l.help === 'open' && s.day <= 4) actions.push(button(text('neighbor.promise'), () => send('promise', 'zhou')));
            if (l.help === 'promised' && s.day <= 5) actions.push(button(text('neighbor.help'), () => send('help', 'zhou')));
            if (s.age >= 18) actions.push(button(mem.loan ? text('neighbor.repay') : text('neighbor.borrow'), () => send(mem.loan ? 'repay' : 'borrow', 'zhou')));
        } else {
            const c = life.commissionFor(n.id);
            if (c && l.commission.status === 'open' && s.day <= 2) {
                const project = () => show(c.name, text('neighbor.projectHint', { desc: c.desc, subject: SUBJECTS.find(x => x.id === c.subject)!.name, style: styleName(c.style), reward: c.reward, rewardName: text(s.age < 18 ? 'neighbor.materialReward' : 'neighbor.fee') }), [button(text('neighbor.acceptProject'), () => send('accept', n.id), true), button(text('neighbor.back'), () => send('neighbor', n.id))]);
                actions.push(button(text('neighbor.viewProject', { name: stage.commissionName }), project));
            }
            if (l.commission.id === n.id && l.commission.status === 'accepted') actions.push(button(text('neighbor.deliver'), () => send('deliver', n.id), s.day === 3));
        }
        actions.push(button(text('neighbor.selectGift'), goCollection), back());
        const next = l.commission.id === n.id && l.commission.status === 'accepted' ? text('neighbor.deliveryDay') : n.id === 'zhou' && l.help === 'promised' ? text('neighbor.promiseDue') : mem.lastTalk === life.dayIndex ? text('neighbor.talkDone') : text('neighbor.talkCost');
        const memory = () => show(text('neighbor.memories', { name: n.name }), mem.memories.join('\n\n') || text('journal.noMemory'), [button(text('neighbor.back'), () => send('neighbor', n.id)), back()]);
        if (mem.memories.length) actions.splice(actions.length - 1, 0, button(text('neighbor.memoriesButton'), memory));
        show(n.name, text('neighbor.overview', { intro: n.intro, trust: mem.trust, favorite: SUBJECTS.find(x => x.id === n.favorite)!.name, next, loan: mem.loan ? text('neighbor.loan', { amount: mem.loan }) : '' }), actions);
        return;
    }
    if (panel.kind === 'Market') {
        const m = l.market;
        if (m.status === 'complete' || m.status === 'missed') {
            const details = () => show(text('market.receipts'), m.report.join('\n\n') || text('market.noTrade'), [button(text('market.backResult'), () => send('market')), back()]);
            show(text(m.status === 'complete' ? 'market.result' : 'market.missed', { name: stage.marketName }), text('market.resultBody', { name: stage.marketName, sold: m.sold, earned: m.earned, line: m.status === 'complete' ? text('market.finishedLine') : text('market.missedLine') }), [button(text('collection.title'), goCollection, true), button(text('market.receipts'), details), back()]);
            return;
        }
        const c = life.customer, works = l.works.filter(w => w.status === 'reserved');
        const view = () => send('market');
        const chooseWork = () => show(text('market.chooseWork', { name: c.name }), text('market.offers', { offers: works.map(w => { const q = life.quote(w); return text('market.offerLine', { name: artName(w), price: q.price, reason: q.reason }); }).join('\n\n') }), [...works.map(w => { const q = life.quote(w); return button(text('market.offerButton', { name: artName(w), price: q.price }), () => send('serve', w.id), q.willBuy); }), button(text('market.backCustomer'), view)]);
        const choosePrice = () => show(text('market.pricing'), text('market.priceHint'), [...(['friendly', 'fair', 'premium'] as const).map(price => button(text('market.setPrice', { name: priceNames[price], current: l.price === price ? text('market.selected') : '' }), () => send('price', undefined, { price }), l.price === price)), button(text('market.backCustomer'), view)]);
        const leave = () => show(text('market.leave'), text('market.leaveHint', { remaining: 3 - m.round }), [button(text('market.leaveNow'), () => send('leave')), button(text('market.keepGoing'), view, true)]);
        show(text('market.customerTitle', { name: stage.marketName, round: m.round + 1 }), text('market.customerBody', { hint: stage.marketHint, name: c.name, subject: SUBJECTS.find(x => x.id === c.subject)!.name, style: styleName(c.style), budget: c.budget, price: priceNames[l.price], count: works.length }), [
            ...(works.length ? [button(text('market.pickOffer'), chooseWork, true)] : [button(text('market.prepareWorks'), goCollection, true)]),
            button(text('market.pricing'), choosePrice), button(text('market.pass'), () => send('pass')), button(text('market.leave'), leave),
        ]);
        return;
    }
    if (panel.kind === 'RestConfirm') {
        show(text('rest.title'), text('rest.body', { name: stage.marketName }), [button(text('rest.stay'), host.close, true), button(text('rest.sleep'), () => send('rest'))]);
        return;
    }
    if (panel.kind === 'WeekRecap') {
        const records = () => show(text('recap.records', { age: s.age }), yearRecords().slice(-8).join('\n\n') || text('journal.emptyRecords'), [button(text('recap.back'), () => renderWeekPanel(sim, panel, host))]);
        show(text('recap.title', { age: s.age }), text('recap.body', { age: s.age, body: panel.body ?? '', next: s.age >= 30 ? text('recap.final') : text('recap.next', { age: s.age + 1 }) }), [button(text(s.age >= 30 ? 'recap.toEnding' : 'recap.continue', { age: s.age + 1 }), () => host.send({ type: 'Continue' }), true), button(text('recap.viewRecords'), records)]);
    }
}
