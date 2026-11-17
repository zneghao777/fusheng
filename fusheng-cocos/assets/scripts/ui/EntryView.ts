import { Color, Graphics, Label, Mask, Node, UIOpacity, UITransform } from 'cc';
import { EntryKind, EntryTimeline, entryRoom } from '../core/EntryMotion';
import { Sim } from '../core/Sim';
import { I18n } from '../data/I18n';
import { WorldView } from '../view/WorldView';
import { UIButton, UIFactory } from './UIFactory';

const bounded = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => 1 - Math.pow(1 - bounded(v), 3);
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

// Native Cocos scenery, built from a read-only copy of this save's actual room.
// Only the paper and door are overlays; furnishings and art come from WorldView.
export class EntryView {
    readonly node: Node;
    readonly skipButton: UIButton;
    readonly timeline: EntryTimeline;
    readonly room: Sim;
    readonly world: WorldView;
    private readonly opacity: UIOpacity;
    private readonly viewport: Node;
    private readonly viewportTransform: UITransform;
    private readonly back: Graphics;
    private readonly front: Graphics;
    private readonly bookCopy: Node;
    private readonly subtitle: Label;
    private readonly caption: string;
    private ready = false;
    private waiting = 0;
    private closed = false;

    constructor(parent: Node, readonly kind: EntryKind, source: Sim,
        private readonly ui: UIFactory, i18n: I18n, reduced: boolean,
        touch: boolean, private readonly done: () => void) {
        this.timeline = new EntryTimeline(kind, reduced);
        this.node = ui.create('PaperRow', parent, 0, 0, 1280, 720);
        this.node.name = 'EntryMotion';
        ui.fullSurface(this.node, '#f3eddf', '#f3eddf');
        ui.background(this.node);
        ui.block(this.node);
        this.opacity = this.node.addComponent(UIOpacity);

        this.back = this.layer('EntryPaperBehind').addComponent(Graphics);
        this.viewport = this.layer('EntryRoomViewport');
        this.viewportTransform = this.viewport.getComponent(UITransform)!;
        this.viewport.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        this.room = new Sim(source.content, { state: entryRoom(source.state, source.house) });
        this.world = new WorldView(this.viewport, ui, i18n, this.room);
        this.world.update(0);
        this.viewport.active = false;

        this.bookCopy = this.layer('EntryJournalCopy');
        this.bookCopy.setPosition(0, -36);
        ui.display(this.bookCopy, i18n.plain('entry.previousWeek', { week: Math.max(1, source.state.week - 1), age: Math.max(7,source.state.age-1) }), -254, 196, 390, 50, touch ? 30 : 27);
        const records = source.state.life?.history ?? [];
        const history = records[records.length - 1] ?? i18n.plain('entry.blankWeek');
        const note = ui.label(this.bookCopy, history, -250, 50, 390, 208, touch ? 22 : 18);
        note.lineHeight = 32;
        ui.label(this.bookCopy, 'ui.brand', -250, -214, 390, 30, touch ? 21 : 14).color = new Color('#736b5c');
        this.bookCopy.active = kind === 'book' && !reduced;
        this.front = this.layer('EntryPaperInFront').addComponent(Graphics);

        const heading = ui.create('PaperRow', this.node, 0, 312, 1280, 96);
        ui.box(heading, 1280, 96, '#f3eddf', '#00000000');
        const name = source.content.characters.find(c => c.id === source.state.charId)!.name;
        const params = { name, age:source.state.age, week: source.state.week, day: source.state.day };
        ui.display(this.node, i18n.plain('entry.' + kind + 'Title', params), -240, 322, 760, 44, touch ? 30 : 23);
        this.caption = i18n.plain('entry.' + kind + 'Body', params);
        this.subtitle = ui.label(this.node, 'entry.preparing', -240, 282, 760, 34, touch ? 22 : 14);
        this.subtitle.color = new Color('#736b5c');
        this.skipButton = ui.button(this.node, 'entry.skip', 526, 311, 174, touch ? 96 : 44, () => this.skip());
        this.skipButton.label.fontSize = touch ? 27 : 15;
        this.draw(0);
    }

    private layer(name: string): Node {
        const node = this.ui.create('PaperRow', this.node, 0, 0, 1280, 720);
        node.name = name;
        return node;
    }

    private rectangle(g: Graphics, x: number, y: number, w: number, h: number, fill: string, stroke = '#b6a78d'): void {
        g.fillColor = new Color(fill); g.rect(x, y, w, h); g.fill();
        g.strokeColor = new Color(stroke); g.lineWidth = 1.5; g.rect(x, y, w, h); g.stroke();
    }

    private polygon(g: Graphics, points: number[][], fill: string): void {
        g.fillColor = new Color(fill); g.strokeColor = new Color('#897a62'); g.lineWidth = 2;
        g.moveTo(points[0][0], points[0][1]);
        for (const p of points.slice(1)) g.lineTo(p[0], p[1]);
        g.close(); g.fill(); g.stroke();
    }

    private draw(p: number): void {
        this.back.clear(); this.front.clear();
        if (this.timeline.reduced) {
            this.bookCopy.active = false;
            this.opacity.opacity = 255 * (1 - p);
            return;
        }
        this.opacity.opacity = 255 * (1 - ease((p - .94) / .06));
        if (this.kind === 'fold') {
            const spread = ease(p / .2), floor = 360 - this.room.house.f1;
            this.rectangle(this.back, -598 * spread, floor - 12, 1196 * spread, 24, '#daceb7', '#c8baa0');
            this.world.unfold(p);
        } else if (this.kind === 'door') {
            const opening = ease((p - .1) / .64), widening = ease((p - .24) / .66);
            const w = mix(366, 1320, widening), h = mix(530, 760, widening);
            this.viewportTransform.setContentSize(w, h);
            const fade = 1 - ease((p - .66) / .21);
            const ink = new Color(126, 107, 79, Math.round(fade * 255));
            const paper = new Color(222, 209, 183, Math.round(fade * 255));
            const g = this.front, left = -w / 2, right = left + w * (1 - opening);
            g.strokeColor = ink; g.lineWidth = 10;
            g.moveTo(left - 5, -h / 2); g.lineTo(left - 5, h / 2 + 5); g.lineTo(w / 2 + 5, h / 2 + 5); g.lineTo(w / 2 + 5, -h / 2); g.stroke();
            g.fillColor = paper; g.strokeColor = ink; g.lineWidth = 2;
            g.moveTo(left, -h / 2); g.lineTo(right, -h / 2 + opening * 40); g.lineTo(right, h / 2 - opening * 40); g.lineTo(left, h / 2); g.close(); g.fill(); g.stroke();
            if (opening < .97) {
                g.fillColor = new Color(166, 64, 47, Math.round(fade * 255));
                g.circle(right - 30 * (1 - opening), -12, 5); g.fill();
                g.strokeColor = ink; g.lineWidth = 1;
                g.moveTo(left + 18, h / 2 - 24); g.lineTo(right - 18 * (1 - opening), h / 2 - 24 - opening * 28); g.stroke();
            }
        } else {
            const turning = bounded((p - .12) / .48), zoom = ease((p - .61) / .31);
            const paperOpacity = this.bookCopy.getComponent(UIOpacity) ?? this.bookCopy.addComponent(UIOpacity);
            paperOpacity.opacity = 255 * (1 - zoom) * (1 - ease((turning - .52) / .35));
            if (zoom < .999) {
                const fade = Math.round((1 - zoom) * 255).toString(16).padStart(2, '0');
                this.rectangle(this.back, -506, -313, 1012, 562, '#c9b99a' + fade, '#c9b99a' + fade);
                this.rectangle(this.back, -498, -303, 996, 552, '#f9f2e3' + fade, '#a99b81' + fade);
                this.back.strokeColor = new Color('#b5a58a' + fade); this.back.lineWidth = 2;
                this.back.moveTo(0, -303); this.back.lineTo(0, 249); this.back.stroke();
            }
            this.viewport.setPosition(mix(250, 0, zoom), mix(-61, 0, zoom));
            const scale = mix(.38, 1, zoom); this.viewport.setScale(scale, scale, 1);
            if (turning < 1) {
                const edge = 498 * Math.cos(turning * Math.PI), bend = Math.sin(turning * Math.PI) * 28;
                this.polygon(this.front, [[0, -303], [edge, -303 + bend], [edge, 249 - bend], [0, 249]], turning < .5 ? '#eee4d0' : '#faf4e7');
                if (turning < .45) {
                    this.front.strokeColor = new Color('#b9ab92'); this.front.lineWidth = 1;
                    for (let i = 0; i < 6; i++) { this.front.moveTo(30, 137 - i * 48); this.front.lineTo(edge - 32, 137 - i * 48); }
                    this.front.stroke();
                }
            }
        }
    }

    update(dt: number, visible: boolean): void {
        if (this.closed) return;
        this.world.update(0);
        if (!visible) return;
        if (!this.ready) {
            this.ready = this.world.ready;
            this.waiting += Math.max(0, dt);
            if (!this.ready) { if (this.waiting >= 4) this.skip(); return; }
            this.viewport.active = true;
            this.subtitle.string = this.caption;
        }
        this.timeline.advance(dt, true, true);
        this.draw(this.timeline.progress);
        if (this.timeline.finished) this.finish();
    }

    skip(): void { this.timeline.skip(); this.finish(); }

    private finish(): void {
        if (this.closed) return;
        this.closed = true;
        this.node.active = false;
        this.node.removeFromParent();
        this.node.destroy();
        this.done();
    }
}
