import { Color, Graphics, Node } from 'cc';
import { SceneDef, SceneDecor } from '../core/Types';
import { UIFactory } from '../ui/UIFactory';

// The geometry and walkable floors share scene data, so furniture stays on its floor.
export function drawBookshop(parent: Node, ui: UIFactory, scene: SceneDef): void {
    const structure = ui.create('PaperRow', parent);
    structure.name = 'BookshopStructure';
    const g = structure.addComponent(Graphics);
    const ink = '#6c695e', wood = '#c7b597', paper = '#f8f2e5';
    const rect = (x: number, y: number, w: number, h: number, fill: string) => {
        g.fillColor = new Color(fill); g.rect(x, -y - h, w, h); g.fill();
    };
    const line = (x1: number, y1: number, x2: number, y2: number, width = 2, color = ink) => {
        g.strokeColor = new Color(color); g.lineWidth = width;
        g.moveTo(x1, -y1); g.lineTo(x2, -y2); g.stroke();
    };
    rect(60, 126, 1160, 494, '#fffaf342');
    rect(60, 620, 1160, 100, '#b4a58c22');
    line(60, 126, 1220, 126, 3); line(60, 126, 60, 620); line(1220, 126, 1220, 620);
    for (const f of scene.floors) {
        rect(f.x1, f.y, f.x2 - f.x1, f.y === 620 ? 5 : 12, wood);
        line(f.x1, f.y, f.x2, f.y, 2.5);
        if (f.y !== 620) line(f.x1, f.y + 12, f.x2, f.y + 12, 1);
    }
    // Light at the reading desk, with a low sill and clear space above the books.
    rect(922, 184, 96, 112, '#d9e0d8');
    line(922, 184, 1018, 184); line(922, 184, 922, 296); line(1018, 184, 1018, 296);
    line(914, 296, 1026, 296, 4, wood); line(970, 184, 970, 296, 1); line(922, 237, 1018, 237, 1);
    g.fillColor = new Color('#f9f0d6'); g.circle(992, -208, 13); g.fill();
    const ladder = scene.ladder!;
    for (const x of [ladder.x1, ladder.x2]) line(x, ladder.top - 38, x, ladder.bot, 4, '#8d7a5d');
    for (let y = ladder.top; y < ladder.bot; y += 27) {
        rect(ladder.x1 - 5, y, ladder.x2 - ladder.x1 + 10, 7, '#b7a282');
        line(ladder.x1 - 5, y, ladder.x2 + 5, y, 1, '#827154');
    }
    // The small ground-floor door keeps the street exit separate from the stairwell.
    rect(85, 500, 70, 120, '#e5daca');
    line(85, 500, 155, 500); line(85, 500, 85, 620); line(155, 500, 155, 620);
    g.fillColor = new Color('#a6402f'); g.circle(140, -562, 3); g.fill();
    for (const [x, y] of [[650, 165], [740, 390]]) {
        line(x, y, x, y + 31, 1, '#a79b86');
        g.fillColor = new Color('#f5e9c9'); g.circle(x, -y - 38, 10); g.fill();
    }
    ui.display(parent, 'book.upper', 262, -188, 350, 30, ui.touch ? 19 : 15).color = new Color('#786d5b');
    ui.display(parent, 'book.lower', 262, -407, 350, 30, ui.touch ? 19 : 15).color = new Color('#786d5b');
    ui.sceneLabel(parent, 'book.exit', 120, -477, 110);
    ui.sceneLabel(parent, 'book.stairs', 1110, -256, 140);
    for (const [index, d] of (scene.decor ?? []).entries()) {
        const n = ui.create('PaperRow', parent, d.x, -d.y, d.w, d.h);
        n.name = 'Bookshop_' + d.kind + '_' + index;
        drawFurniture(n.addComponent(Graphics), d);
    }
    // An open book and a cup make each table read as a place to pause.
    for (const d of (scene.decor ?? []).filter(d => d.kind === 'table')) {
        rect(d.x - 25, d.y - d.h - 4, 43, 4, paper);
        line(d.x - 25, d.y - d.h - 4, d.x - 3, d.y - d.h - 1, 1, '#a3947b');
        line(d.x - 3, d.y - d.h - 1, d.x + 18, d.y - d.h - 4, 1, '#a3947b');
        rect(d.x + 35, d.y - d.h - 12, 11, 12, '#9cae9c');
    }
    const counter = scene.decor!.find(d => d.kind === 'counter')!;
    for (let i = 0; i < 3; i++) rect(counter.x - 40 + i * 3, counter.y - counter.h - 6 - i * 6, 42, 5, ['#b6937f', '#96a392', '#c7b995'][i]);
    // Keep the familiar shop cat on the counter.
    g.fillColor = new Color('#8e8b7e'); g.ellipse(counter.x + 43, -counter.y + counter.h + 11, 16, 8); g.fill();
    g.circle(counter.x + 55, -counter.y + counter.h + 21, 7); g.fill();
    g.moveTo(counter.x + 50, -counter.y + counter.h + 24); g.lineTo(counter.x + 52, -counter.y + counter.h + 33); g.lineTo(counter.x + 57, -counter.y + counter.h + 25); g.close(); g.fill();
}

function drawFurniture(g: Graphics, d: SceneDecor): void {
    const left = -d.w / 2, right = d.w / 2, ink = new Color('#777266');
    const box = (x: number, y: number, w: number, h: number, color: string) => { g.fillColor = new Color(color); g.rect(x, y, w, h); g.fill(); };
    const line = (x: number, y: number, xx: number, yy: number, width = 2) => { g.strokeColor = ink; g.lineWidth = width; g.moveTo(x, y); g.lineTo(xx, yy); g.stroke(); };
    if (d.kind === 'shelf') {
        box(left, 0, d.w, d.h, '#f8f2e5');
        g.strokeColor = ink; g.lineWidth = 2; g.rect(left, 0, d.w, d.h); g.stroke();
        const colors = ['#b99b88', '#9ba897', '#99a7ae', '#b8ac8d', '#aea0b1'];
        for (let row = 0; row < 3; row++) {
            const y = row * d.h / 3;
            line(left, y, right, y, 1);
            for (let i = 0, x = left + 6; x < right - 13; i++) {
                const w = 7 + (i * 7 + row * 3) % 6, h = d.h / 3 - 10 - (i * 3 % 8);
                box(x, y + 4, w, h, colors[(i + row) % colors.length]);
                line(x + 2, y + h - 3, x + w - 2, y + h - 3, .5);
                x += w + 3;
            }
        }
    } else if (d.kind === 'chair') {
        box(left, 35, d.w, 6, '#b8a486');
        line(left + 3, 0, left + 3, d.h); line(right - 3, 0, right - 3, d.h);
        box(left, d.h - 21, d.w, 17, '#ccbaa0');
        line(left, d.h, right, d.h, 2);
    } else {
        box(left, d.h - 8, d.w, 8, '#bda785');
        line(left, d.h, right, d.h);
        if (d.kind === 'counter') {
            box(left + 5, 0, d.w - 10, d.h - 8, '#e4d8c2');
            line(left + 5, 0, left + 5, d.h); line(right - 5, 0, right - 5, d.h);
            line(left + 5, 10, right - 5, 10, 1);
        } else {
            line(left + 14, 0, left + 14, d.h - 8, 3); line(right - 14, 0, right - 14, d.h - 8, 3);
        }
    }
}
