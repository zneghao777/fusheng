import { Button, Color, EventMouse, EventTouch, Graphics, HorizontalTextAlignment, Label, Node, UITransform, Vec3, view } from 'cc';
import type { GameSettings } from '../core/Types';
import type { GameMusic } from '../platform/GameMusic';
import { UIButton, UIControlState, UIFactory } from './UIFactory';
import { UI_COLORS as C, UI_METRICS as M } from './UITokens';

const INK = C.ink, MUTED = C.muted, ACCENT = C.accent;
type Painter = (graphics: Graphics, active: boolean, label: Label, state: Readonly<UIControlState>) => void;

/** Settings use the same raised surfaces and full-size hit areas as game buttons. */
function control(ui: UIFactory, parent: Node, key: string, x: number, y: number, w: number, h: number, run: () => void, painter?: Painter): UIButton {
    const button = ui.control(parent, key, x, y, w, h, run, {}, { bare: true }, (graphics, label, state) => {
        painter?.(graphics, state.enabled && (state.hovered || state.pressed || state.focused), label, state);
    });
    button.label.enableWrapText = false;
    return button;
}

export function settingsEntry(ui: UIFactory, parent: Node, touch: boolean, viewportScale: number, open: () => void): UIButton {
    const scale = touch ? 1.3 : Math.max(1, Math.min(1.5, .93 / viewportScale)), w = touch ? 140 : 108, h = touch ? 64 : 44;
    const b = ui.control(parent, 'ui.settings', 640 - 30 - w * scale / 2, -360 + 18 + h * scale / 2, w, h, open, {}, { quiet: true }, (g, label, state) => {
        const active = state.enabled && (state.hovered || state.pressed || state.focused);
        label.fontSize = touch ? 18 : 14;
        label.color = new Color(state.enabled ? active ? ACCENT : INK : C.disabledInk);
        const x = touch ? -35 : -30;
        g.fillColor = label.color;
        for (const [y, knob] of [[7, -2], [0, 5], [-7, -5]]) {
            g.fillColor = label.color; g.rect(x - 10, y - 1, 20, 2); g.fill();
            g.circle(x + knob, y, 3.2); g.fill();
            g.fillColor = new Color(C.paper); g.circle(x + knob, y, 1.5); g.fill();
        }
    });
    b.label.string = ui.i18n.plain('ui.settingsEntry');
    b.label.node.setPosition(12, 0);
    b.node.setScale(scale, scale, 1);
    return b;
}

export class SettingsView {
    readonly buttons: UIButton[] = [];
    readonly node: Node;
    constructor(ui: UIFactory, parent: Node, touch: boolean, viewportScale: number, settings: GameSettings, audio: GameMusic, save: () => void, close: () => void, credits: () => void) {
        ui.setReducedMotion(settings.reduceMotion);
        const scale = touch ? 1.5 : Math.max(1, Math.min(1.5, .93 / viewportScale)), w = 360, h = 418;
        const backdrop = ui.create('PaperRow', parent, 0, 0, 1280, 720);
        ui.fullSurface(backdrop);
        ui.block(backdrop); backdrop.on(Node.EventType.TOUCH_END, close);
        this.node = ui.create('PaperRow', parent, 640 - (touch ? 24 : 32) - w * scale / 2, -360 + (touch ? 68 : 78) + h * scale / 2, w, h);
        this.node.name = 'SettingsSheet'; this.node.setScale(scale, scale, 1);
        ui.paper(this.node, w, h); ui.block(this.node);
        const heading = ui.display(this.node, 'ui.settings', -20, 170, 256, 42, 23); heading.color = new Color(INK);
        const rule = (y: number) => ui.divider(this.node, 0, y, 296);
        const text = (key: string, y: number) => { const l = ui.label(this.node, key, -48, y, 200, 30, touch ? 18 : 14); l.color = new Color(INK); return l; };
        const add = (button: UIButton) => { this.buttons.push(button); return button; };
        add(ui.closeButton(this.node, 142, 170, 60, 60, close));
        rule(142); text('ui.musicLabel', 111);
        const toggle = (key: string, y: number, value: () => boolean, run: () => void) => add(control(ui, this.node, key, 121, y, 56, 56, () => { run(); save(); repaint(); }, (g, active, label, state) => {
            label.node.active = false;
            const on = value();
            g.fillColor = new Color(state.enabled ? on ? C.accentBase : C.surfaceBase : C.disabledBorder);
            g.roundRect(-18, -12, 36, 20, 10); g.fill();
            g.fillColor = new Color(state.enabled ? on ? state.pressed ? C.accentPressed : ACCENT : C.rule : C.disabled);
            g.roundRect(-18, -10, 36, 20, 10); g.fill();
            g.fillColor = new Color(C.surfaceBase); g.circle(on ? 8 : -8, -1, 7.5); g.fill();
            g.fillColor = new Color(C.surface); g.circle(on ? 8 : -8, 1, 7.5); g.fill();
            g.fillColor = new Color('#ffffffa0'); g.circle(on ? 6 : -10, 3.5, 2); g.fill();
            if (on) { g.strokeColor = new Color(C.onAccent); g.lineWidth = 1.5; g.moveTo(-13, 0); g.lineTo(-11, -2); g.lineTo(-7, 3); g.stroke(); }
        }));
        toggle('ui.audio', 111, () => !audio.muted, () => audio.setMuted(!audio.muted));
        const volumeLabel = text('ui.volumeLabel', 70); volumeLabel.fontSize = touch ? 18 : 13; volumeLabel.color = new Color(MUTED);
        const valueLabel = ui.label(this.node, '', 117, 70, 62, 26, touch ? 18 : 13, HorizontalTextAlignment.RIGHT); valueLabel.color = new Color(MUTED);
        let dragging = false;
        const updateVolume = (value: number, finish = false) => { settings.musicVolume = Math.max(0, Math.min(1, Math.round(value * 100) / 100)); audio.setVolume(settings.musicVolume); if (finish) save(); repaint(); };
        const slider = add(control(ui, this.node, 'ui.musicVolume', 0, 37, 312, 56, () => {}, (g, active, label, state) => {
            label.node.active = false; label.string = Math.round(audio.volume * 100) + '%'; valueLabel.string = label.string;
            const half = Math.max(1, state.width / 2 - 28), x = -half + half * 2 * audio.volume;
            g.fillColor = new Color(C.surfaceBase); g.roundRect(-half, -3, half * 2, 6, 3); g.fill();
            g.fillColor = new Color(!state.enabled ? C.disabledInk : audio.muted ? MUTED : ACCENT);
            if (x > -half) { g.roundRect(-half, -2, x + half, 4, Math.min(2, (x + half) / 2)); g.fill(); }
            const radius = active ? 11 : 10;
            g.fillColor = new Color(97, 69, 40, 14); g.circle(x, -3, radius + 1); g.fill();
            g.fillColor = new Color(C.surfaceBase); g.circle(x, -2, radius); g.fill();
            g.fillColor = new Color(C.surface); g.circle(x, 1, radius); g.fill();
            g.strokeColor = new Color(state.enabled ? ACCENT : C.disabledInk); g.lineWidth = M.focus; g.circle(x, 1, radius); g.stroke();
            g.fillColor = new Color('#ffffffb0'); g.circle(x - 3, 4, 3); g.fill();
        }));
        const point = (event: EventTouch | EventMouse) => {
            // Match the fullscreen canvas origin, including wider landscape viewports.
            const p = event.getUILocation(), size = view.getVisibleSize(), world = new Vec3(p.x - size.width / 2, p.y - size.height / 2, 0);
            return slider.node.getComponent(UITransform)!.convertToNodeSpaceAR(world).x;
        };
        const pointerVolume = (event: EventTouch) => { const half = Math.max(1, slider.node.getComponent(UITransform)!.width / 2 - 28); return (point(event) + half) / (half * 2); };
        const sliderEnabled = () => slider.node.getComponent(Button)!.interactable;
        slider.node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { if (!sliderEnabled()) return; dragging = true; updateVolume(pointerVolume(event)); });
        slider.node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { if (dragging && sliderEnabled()) updateVolume(pointerVolume(event)); });
        const finishDrag = () => { if (dragging) { dragging = false; save(); } };
        slider.node.on(Node.EventType.TOUCH_END, finishDrag);
        slider.node.on(Node.EventType.TOUCH_CANCEL, finishDrag);
        slider.activate = () => updateVolume(audio.volume >= .99 ? .2 : audio.volume + .1, true);
        slider.adjust = delta => { if (sliderEnabled()) updateVolume(audio.volume + delta * .05, true); };
        rule(6); text('ui.readingLabel', -25);
        const fontButtons: {button: UIButton; value: number}[] = [];
        for (const [index, value] of [1, 1.15, 1.3].entries()) {
            const button = add(control(ui, this.node, ['ui.fontStandard', 'ui.fontComfort', 'ui.fontLarge'][index], -104 + index * 104, -65, 92, 56, () => { settings.fontScale = value as GameSettings['fontScale']; save(); repaint(); }, (g, active, label) => {
                label.fontSize = touch ? 18 : 14; label.color = new Color(settings.fontScale === value ? ACCENT : MUTED);
                if (settings.fontScale === value) { g.fillColor = new Color(ACCENT); g.circle(0, -14, 1.5); g.fill(); }
            }));
            fontButtons.push({button,value});
        }
        text('ui.motionLabel', -125);
        toggle('ui.motion', -125, () => settings.reduceMotion, () => { settings.reduceMotion = !settings.reduceMotion; ui.setReducedMotion(settings.reduceMotion); });
        rule(-158);
        const credit = add(control(ui, this.node, 'ui.musicCredits', -63, -180, 190, 56, credits)); credit.label.fontSize = touch ? 18 : 13; credit.label.color = new Color(MUTED);
        const repaint = () => this.buttons.forEach(b => b.select(fontButtons.some(entry => entry.button === b && entry.value === settings.fontScale)));
        repaint();
        ui.transition(this.node, settings.reduceMotion);
    }
}
