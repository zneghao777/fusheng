// Geometry ported from the immutable v4.1 drawing algorithms; rendered by Cocos Graphics.
import { Sim } from '../core/Sim';
import { Look, Placed } from '../core/Types';
import { I18n } from '../data/I18n';
import { InkPainter } from './InkPainter';
export function renderArt(G:InkPainter,sim:Sim,i18n:I18n,mode:'house'|'outside'|'furniture'|'person',f?:Placed,time=0,overrideLook?:Partial<Look>&{stage?:string;hairColor?:string}):void {
const S=sim.state,HOUSE=sim.house,FURN=sim.content.furniture,W=1280,H=720,INK='#2b2a26',RED='#a6402f',tGlobal=time;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const rand=(a:number,b:number)=>a+(b-a)*.5;
function nz(x:number,y:number,s=0){
  s = s || 0;
  const v = Math.sin(x*12.9898 + y*78.233 + s*37.719) * 43758.5453;
  return v - Math.floor(v);
}
function rr(x:number,y:number,w:number,h:number,r:number){
  r = Math.min(r, w/2, h/2);
  G.beginPath();
  G.moveTo(x+r,y);
  G.arcTo(x+w,y,x+w,y+h,r);
  G.arcTo(x+w,y+h,x,y+h,r);
  G.arcTo(x,y+h,x,y,r);
  G.arcTo(x,y,x+w,y,r);
  G.closePath();
}
function rough(x1:number,y1:number,x2:number,y2:number,opt:{w?:number;a?:number;c?:string;seed?:number}={}){
  opt = opt || {};
  const w = opt.w===undefined?2:opt.w;
  const a = opt.a===undefined?.7:opt.a;
  const c = opt.c || INK;
  const seed = opt.seed || 1;
  const dx = x2-x1, dy = y2-y1;
  const len = Math.hypot(dx,dy) || 1;
  const n = Math.max(1, Math.round(len/24));
  G.save();
  G.strokeStyle = c; G.globalAlpha = a; G.lineWidth = w; G.lineCap='round';
  G.beginPath();
  for(let i=0;i<=n;i++){
    const t = i/n;
    const px = x1+dx*t, py = y1+dy*t;
    const amp = (i===0||i===n) ? .8 : 2.6;
    const j = (nz(px,py,seed)-.5)*amp;
    const nx = -dy/len*j, ny = dx/len*j;
    if(i===0) G.moveTo(px+nx,py+ny);
    else G.lineTo(px+nx,py+ny);
  }
  G.stroke();
  G.restore();
}
function wash(x:number,y:number,w:number,h:number,a=.06,c=INK){
  G.save();
  G.globalAlpha = a===undefined?.06:a;
  G.fillStyle = c || '#3a3830';
  G.fillRect(x,y,w,h);
  G.restore();
}
function txt(s:string,x:number,y:number,opt:{size?:number;alpha?:number;color?:string;align?:string;weight?:string;font?:string}={}){
  opt = opt || {};
  const size = opt.size || 14;
  G.save();
  G.globalAlpha = opt.alpha===undefined?1:opt.alpha;
  G.fillStyle = opt.color || INK;
  G.textAlign = opt.align || 'left';
  G.textBaseline = 'middle';
  G.font = (opt.weight?opt.weight+' ':'') + size + 'px ' + (opt.font || '"Songti SC","STSong","Noto Serif SC",serif');
  G.fillText(s,x,y);
  G.restore();
}
function hexToRgb(h:string){
  const n = parseInt(h.slice(1),16);
  return [ (n>>16)&255, (n>>8)&255, n&255 ];
}
function mixHex(a:string,b:string,t:number){
  const A = hexToRgb(a), B = hexToRgb(b);
  return 'rgb('+Math.round(A[0]+(B[0]-A[0])*t)+','+Math.round(A[1]+(B[1]-A[1])*t)+','+Math.round(A[2]+(B[2]-A[2])*t)+')';
}
function vlabel(str:string,x:number,y:number,size:number){
  size = size || 19;
  str=i18n.t(str); for(let i=0;i<str.length;i++){
    txt(str[i], x, y+i*(size+6), { size:size, align:'center', alpha:.19 });
  }
}
function buildHouse(){
  const h = HOUSE;
  
  
  
  G.lineCap = 'round'; G.lineJoin = 'round';

  const rich = h.tier === 0;
  const poor = h.tier === 2;
  const cx = (h.x1 + h.x2)/2;
  const upper = h.floors.filter(fy => fy < h.f1).sort((a,b)=>b-a);
  const ceil1 = upper.length ? upper[0] : h.roofY;
  const topFloor = upper.length ? upper[upper.length-1] : h.f1;

  // 室内底色
  G.fillStyle = rich ? 'rgba(255,253,246,.46)' : (poor ? 'rgba(238,232,218,.30)' : 'rgba(255,252,242,.34)');
  G.fillRect(h.x1, h.roofY, h.x2-h.x1, h.f1-h.roofY);

  // ---- 屋顶 ----
  const rL = h.x1-36, rR = h.x2+36, rApex = h.roofY - (rich?48:(poor?26:42));
  G.save();
  G.globalAlpha = .14; G.lineWidth = 26; G.strokeStyle = INK;
  G.beginPath(); G.moveTo(rL,h.roofY+10); G.quadraticCurveTo(cx,rApex,rR,h.roofY+10); G.stroke();
  G.restore();
  G.save();
  G.globalAlpha = poor?.62:.8; G.lineWidth = rich?8:7; G.strokeStyle = INK;
  G.beginPath(); G.moveTo(rL,h.roofY+10); G.quadraticCurveTo(cx,rApex,rR,h.roofY+10); G.stroke();
  G.restore();

  const tiles = rich?30:22;
  for(let i=1;i<tiles;i++){
    const t = i/tiles;
    const bx = rL + (rR-rL)*t;
    const by = h.roofY+10 - ((h.roofY+10)-rApex)*4*t*(1-t);
    rough(bx, by+4, bx-2, by+16, {w:1.1,a:.18,seed:i});
  }

  // ---- 墙体 ----
  G.fillStyle = 'rgba(120,108,86,.04)';
  G.fillRect(h.x1, h.roofY, h.x2-h.x1, 690-h.roofY);
  rough(h.x1,h.roofY,h.x1,690,{w:3.6,a:poor?.7:.86});
  rough(h.x2,h.roofY,h.x2,690,{w:3.6,a:poor?.7:.86});
  rough(h.x1,h.roofY,h.x2,h.roofY,{w:3.6,a:poor?.7:.86});
  rough(h.x1,690,h.x2,690,{w:3.8,a:.9});

  for(let i=0;i<22;i++){
    const x = h.x1+30 + i*47;
    if(x > h.x2-10) break;
    rough(x, h.roofY+14, x+rand(-2,2), 688, {w:.8,a:.035,seed:i+3});
  }

  // ---- 各层楼板 ----
  upper.forEach((fy,si)=>{
    const segs = h.ladder
      ? [[h.x1,h.ladder.x1-10],[h.ladder.x2+10,h.x2]]
      : [[h.x1,h.x2]];
    segs.forEach((s,ii)=>{
      G.fillStyle = 'rgba(72,64,48,.12)';
      G.fillRect(s[0],fy-6,s[1]-s[0],16);
      rough(s[0],fy-6,s[1],fy-6,{w:2.8,a:.8,seed:si*11+ii*3+10});
      rough(s[0],fy+10,s[1],fy+10,{w:2.8,a:.8,seed:si*11+ii*3+12});
      for(let x=s[0]+18;x<s[1]-6;x+=34){
        rough(x,fy-4,x,fy+8,{w:.9,a:.10,seed:x});
      }
    });
    const sg = G.createLinearGradient(0,fy+10,0,fy+92);
    sg.addColorStop(0,'rgba(60,55,45,.10)');
    sg.addColorStop(1,'rgba(60,55,45,0)');
    G.fillStyle = sg;
    G.fillRect(h.x1,fy+10,h.x2-h.x1,82);
  });

  // ---- 一层地面 ----
  G.fillStyle = 'rgba(72,64,48,.055)';
  G.fillRect(h.x1,h.f1,h.x2-h.x1,70);
  rough(h.x1,h.f1,h.x2,h.f1,{w:3.2,a:.8});
  for(let x=h.x1+20;x<h.x2-10;x+=36){
    rough(x,h.f1+2,x+2,688,{w:.9,a:.07,seed:x+5});
  }
  wash(h.x1,684,h.x2-h.x1,6,.16);

  // ---- 梯子 ----
  if(h.ladder){
    const L = h.ladder;
    G.globalAlpha = .62; G.lineWidth = 2.4; G.strokeStyle = INK;
    rough(L.x1+2,topFloor+12,L.x1+2,L.bot,{w:2.6,a:.55});
    rough(L.x2-2,topFloor+12,L.x2-2,L.bot,{w:2.6,a:.55});
    for(let y=topFloor+24;y<L.bot-2;y+=30){
      rough(L.x1+4,y,L.x2-4,y,{w:2.2,a:.5,seed:y});
    }
  }

  // ---- 门 ----
  const dw = poor?54:62, dh = poor?112:122;
  const dx1 = h.doorX - dw, dy1 = h.f1 - dh;
  G.fillStyle = 'rgba(72,64,48,.10)';
  G.fillRect(dx1,dy1,dw,dh);
  rough(dx1,dy1,dx1,h.f1,{w:2.8,a:.75});
  rough(dx1+dw,dy1,dx1+dw,h.f1,{w:2.8,a:.75});
  rough(dx1,dy1,dx1+dw,dy1,{w:2.8,a:.75});
  rough(dx1+dw/2,dy1+8,dx1+dw/2,h.f1-4,{w:1.2,a:.22});
  G.beginPath(); G.arc(dx1+12, h.f1-54, 3, 0, 7); G.fillStyle=INK; G.globalAlpha=.6; G.fill(); G.globalAlpha=1;
  G.save(); G.globalAlpha=.5; G.fillStyle=RED;
  G.fillRect(dx1-8, dy1+10, 5, 50);
  G.restore();

  // ---- 印章 ----
  G.save();
  G.translate(h.x2-16, h.f1-168); G.rotate(-.06);
  G.globalAlpha=.8; G.fillStyle=RED;
  G.fillRect(0,0,20,20);
  G.globalAlpha=1; G.fillStyle='#fdf7ec';
  G.font='11px "Songti SC",serif'; G.textAlign='center'; G.textBaseline='middle';
  G.fillText("@legacy.11186",10,11);
  G.restore();

  // ---- 各档位的性格细节 ----
  if(rich){
    // 吊灯挂在一层天花板
    rough(cx, ceil1+10, cx, ceil1+58, {w:1.4,a:.4});
    rough(cx-26, ceil1+58, cx+26, ceil1+58, {w:2.2,a:.5});
    for(let i=-1;i<=1;i++){
      G.beginPath(); G.arc(cx+i*22, ceil1+64, 4.5, 0, 7);
      G.fillStyle='rgba(255,250,236,.9)'; G.fill();
      G.strokeStyle=INK; G.globalAlpha=.4; G.lineWidth=1; G.stroke(); G.globalAlpha=1;
    }
    // 一层挂画
    const px = h.x1 + 520, py = ceil1 + 58;
    G.save();
    G.fillStyle='rgba(255,253,246,.8)';
    G.fillRect(px, py, 96, 60);
    G.strokeStyle=INK; G.globalAlpha=.45; G.lineWidth=1.6;
    G.strokeRect(px, py, 96, 60);
    G.globalAlpha=.32; G.fillStyle='rgba(60,62,66,.6)';
    G.beginPath();
    G.moveTo(px+16, py+48);
    G.quadraticCurveTo(px+40, py+16, px+60, py+40);
    G.quadraticCurveTo(px+76, py+22, px+84, py+50);
    G.lineTo(px+16, py+50); G.fill();
    G.restore();
    // 踢脚线
    rough(h.x1+6, h.f1-10, h.x2-6, h.f1-10, {w:1.2,a:.18});
    // 三楼栏杆
    if(upper.length > 1){
      for(let x=h.x1+6;x<h.x2-6;x+=26){
        rough(x, topFloor-26, x, topFloor-4, {w:1.4,a:.22,seed:x});
      }
      rough(h.x1+4, topFloor-27, h.x2-4, topFloor-27, {w:2,a:.3});
    }
  }

  if(poor){
    // 裂缝
    for(let i=0;i<3;i++){
      const bx = h.x2-300 + i*76, by = 210 + i*52;
      rough(bx,by,bx+12,by+26,{w:1,a:.26,seed:i+31});
      rough(bx+12,by+26,bx-2,by+48,{w:1,a:.22,seed:i+37});
      rough(bx-2,by+48,bx+14,by+66,{w:.9,a:.18,seed:i+41});
    }
    // 水渍
    const wg = G.createRadialGradient(h.x2-230,190,4,h.x2-230,190,90);
    wg.addColorStop(0,'rgba(122,104,74,.10)');
    wg.addColorStop(1,'rgba(122,104,74,0)');
    G.fillStyle = wg;
    G.beginPath(); G.arc(h.x2-230,190,90,0,7); G.fill();
    // 明管
    rough(h.x2-28, h.roofY+30, h.x2-28, h.f1, {w:3,a:.28});
    for(let y=h.roofY+60;y<h.f1;y+=90){
      G.beginPath(); G.arc(h.x2-28,y,4,0,7);
      G.strokeStyle=INK; G.globalAlpha=.28; G.lineWidth=1.4; G.stroke(); G.globalAlpha=1;
    }
    // 晾衣绳
    const lx1 = h.x1+60, lx2 = h.x2-90, ly = h.roofY+74;
    rough(lx1,ly,lx2,ly+16,{w:1,a:.3});
    ([[lx1+60,'#c9b9a4'],[lx1+210,'#b9c2c4']] as [number,string][]).forEach(it=>{
      const gx = it[0], gy = ly + 16*((gx-lx1)/(lx2-lx1));
      G.fillStyle = it[1]; G.globalAlpha=.55;
      G.beginPath();
      G.moveTo(gx-11,gy); G.lineTo(gx+11,gy); G.lineTo(gx+8,gy+42); G.lineTo(gx-8,gy+42);
      G.closePath(); G.fill();
      G.globalAlpha=.4; G.strokeStyle=INK; G.lineWidth=1; G.stroke();
      G.globalAlpha=1;
    });
    // 吊灯泡
    rough(560, h.roofY+16, 560, h.roofY+72, {w:1.1,a:.3});
    G.beginPath(); G.arc(560,h.roofY+80,7,0,7);
    G.fillStyle='rgba(255,248,222,.8)'; G.fill();
    G.strokeStyle=INK; G.globalAlpha=.35; G.lineWidth=1.2; G.stroke(); G.globalAlpha=1;
  }

  // ---- 房间名 ----
  (h.labels||[]).forEach(l=>vlabel(l[0], l[1], l[2], l[3]));

  
}
function skyCols(){
  const h = (S.clock/60)%24;
  let top, bot;
  if(h<5 || h>=20){ top='#2f3852'; bot='#48536e'; }
  else if(h<7){
    const t=(h-5)/2;
    top=mixHex('#2f3852','#cfd9e2',t);
    bot=mixHex('#5a6480','#f0d9b8',t);
  }
  else if(h<17){ top='#cfd9e2'; bot='#ece4d1'; }
  else {
    const t=(h-17)/3;
    top=mixHex('#cfd9e2','#43506e',t);
    bot=mixHex('#ece4d1','#c9906a',t);
  }
  return { top:top, bot:bot, h:h };
}
function drawSkyIn(rect:{x:number;y:number;w:number;h:number},big:boolean){
  const c = skyCols();
  const h = c.h;
  const k = big ? 1.7 : 1;

  G.save();
  G.beginPath();
  G.rect(rect.x,rect.y,rect.w,rect.h);
  G.clip();

  const g = G.createLinearGradient(0,rect.y,0,rect.y+rect.h);
  g.addColorStop(0,c.top); g.addColorStop(1,c.bot);
  G.fillStyle = g;
  G.fillRect(rect.x,rect.y,rect.w,rect.h);

  // 远山（水墨）
  ridge(rect.x-10, rect.y+rect.h*0.70, rect.w+20, rect.h*0.30, big?.24:.15, 3);
  ridge(rect.x-10, rect.y+rect.h*0.82, rect.w+20, rect.h*0.24, big?.34:.21, 7);

  // 日月
  if(h>=6 && h<18){
    const t = (h-6)/12;
    const sx = rect.x + rect.w*(0.12 + t*0.76);
    const sy = rect.y + rect.h*(0.30 - Math.sin(t*Math.PI)*0.14);
    G.globalAlpha=.55; G.fillStyle='#fdf3d8';
    G.beginPath(); G.arc(sx,sy,11*k,0,7); G.fill();
    G.globalAlpha=.14; G.fillStyle='#fff6d8';
    G.beginPath(); G.arc(sx,sy,22*k,0,7); G.fill();
    G.globalAlpha=1;
  } else {
    const hh = (h>=18)? h-18 : h+6;
    const t = clamp(hh/12,0,1);
    const mx = rect.x + rect.w*(0.15 + t*0.7);
    const my = rect.y + rect.h*(0.28 - Math.sin(t*Math.PI)*0.10);
    G.globalAlpha=.75; G.fillStyle='#f4efdf';
    G.beginPath(); G.arc(mx,my,10*k,0,7); G.fill();
    G.globalAlpha=.14; G.fillStyle='#8a94ab';
    G.beginPath(); G.arc(mx-4*k,my-2*k,3*k,0,7); G.fill();
    G.beginPath(); G.arc(mx+4*k,my+3*k,2*k,0,7); G.fill();
    G.globalAlpha=1;
    const stars = big ? 40 : 14;
    for(let i=0;i<stars;i++){
      const sx = rect.x + nz(i,1)*rect.w;
      const sy = rect.y + nz(i,2)*rect.h*0.55;
      G.globalAlpha = .18 + nz(i,3)*.35;
      G.fillStyle='#f7f1df';
      G.beginPath(); G.arc(sx,sy,.9+nz(i,4)*.8,0,7); G.fill();
    }
    G.globalAlpha=1;
  }

  G.restore();
}
function ridge(x:number,y:number,w:number,h:number,alpha:number,seed:number){
  G.save();
  G.beginPath();
  G.moveTo(x, y+h);
  G.lineTo(x, y+h*0.45);
  for(let i=0;i<4;i++){
    const x1 = x + w*(i/4), x2 = x + w*((i+1)/4);
    const peak = y + h*(0.06 + 0.34*nz(i,seed));
    G.quadraticCurveTo((x1+x2)/2, peak, x2, y + h*(0.42 + 0.16*nz(i+9,seed)));
  }
  G.lineTo(x+w, y+h);
  G.closePath();
  G.fillStyle = 'rgba(52,60,74,'+alpha+')';
  G.fill();
  G.restore();
}
function drawWindows(){
  for(const w of HOUSE.windows){
    drawSkyIn(w, false);

    G.save();
    G.strokeStyle = INK; G.globalAlpha=.78; G.lineWidth=3;
    G.strokeRect(w.x, w.y, w.w, w.h);
    G.globalAlpha=.55; G.lineWidth=2;
    G.beginPath();
    G.moveTo(w.x + w.w/2, w.y); G.lineTo(w.x + w.w/2, w.y + w.h);
    G.moveTo(w.x, w.y + w.h*0.46); G.lineTo(w.x + w.w, w.y + w.h*0.46);
    G.stroke();
    G.restore();

    G.fillStyle='rgba(72,64,48,.18)';
    G.fillRect(w.x-6, w.y+w.h, w.w+12, 5);
    rough(w.x-6, w.y+w.h, w.x+w.w+6, w.y+w.h, {w:2,a:.55});
  }
}
function tree(x:number,baseY:number,s=1,seed=1){
  s = s || 1;
  G.strokeStyle = INK; G.globalAlpha=.55; G.lineWidth=3.4*s;
  G.beginPath();
  G.moveTo(x, baseY);
  G.quadraticCurveTo(x-3*s, baseY-30*s, x+2*s, baseY-52*s);
  G.stroke();
  G.globalAlpha=1;
  const blobs = [[0,-62,26],[-16,-52,18],[17,-54,17],[-6,-74,16],[10,-70,14]];
  blobs.forEach((b,i)=>{
    G.globalAlpha = .38 + (i%2)*.05;
    G.fillStyle = '#46543f';
    G.beginPath();
    G.ellipse(x + b[0]*s, baseY + b[1]*s, b[2]*s, b[2]*.78*s, 0, 0, 7);
    G.fill();
    G.globalAlpha = .46;
    G.strokeStyle = '#3f4a3a'; G.lineWidth = 1;
    G.stroke();
  });
  G.globalAlpha=1;
}
function drawPavement(topY:number){
  G.fillStyle='rgba(72,64,48,.15)';
  G.fillRect(0,topY,W,H-topY);
  rough(0,topY,W,topY,{w:3.4,a:.8});
  for(let x=30;x<W;x+=64){
    rough(x,topY+2,x+rand(-1,1),700,{w:.8,a:.07,seed:x});
  }
  rough(0,topY+64,W,topY+64,{w:1,a:.10});
  G.fillStyle='rgba(72,64,48,.05)';
  G.fillRect(0,topY+64,W,H-topY-64);
}
function drawHomeFacade(){
  const x=42, y=300, w=180, h=320;
  G.fillStyle='rgba(255,252,244,.55)';
  G.fillRect(x,y,w,h);
  // 屋顶
  G.strokeStyle=INK; G.globalAlpha=.72; G.lineWidth=5;
  G.beginPath(); G.moveTo(x-16,y+6); G.quadraticCurveTo(x+w/2,y-46,x+w+16,y+6); G.stroke();
  G.globalAlpha=.5; G.lineWidth=2;
  rough(x,y,x,y+h,{w:2.6,a:.7});
  rough(x+w,y,x+w,y+h,{w:2.6,a:.7});
  rough(x,y+h,x+w,y+h,{w:2.6,a:.7});
  // 窗
  G.globalAlpha=.55; G.lineWidth=1.8;
  G.strokeRect(x+24,y+40,52,46);
  G.strokeRect(x+104,y+40,52,46);
  G.globalAlpha=.16; G.fillStyle='#8fa0aa';
  G.fillRect(x+25,y+41,50,44); G.fillRect(x+105,y+41,50,44);
  G.globalAlpha=1;
  // 门
  G.fillStyle='rgba(72,64,48,.12)';
  G.fillRect(x+66,y+h-92,48,92);
  rough(x+66,y+h-92,x+66,y+h,{w:2,a:.6});
  rough(x+114,y+h-92,x+114,y+h,{w:2,a:.6});
  rough(x+66,y+h-92,x+114,y+h-92,{w:2,a:.6});
  G.save(); G.globalAlpha=.5; G.fillStyle=RED;
  G.fillRect(x+58,y+h-84,4,42); G.restore();
  // 门牌
  txt("@legacy.11186", x+90, y+h-116, { size:13, align:'center', alpha:.5 });
}
function drawShop(cx:number,label:string,awning:string[]){
  const w=156, h=176, x=cx-w/2, y=620-h;
  G.fillStyle='rgba(255,252,244,.5)';
  G.fillRect(x,y,w,h);
  rough(x,y,x,y+h,{w:2.4,a:.7});
  rough(x+w,y,x+w,y+h,{w:2.4,a:.7});
  rough(x,y,x+w,y,{w:2.4,a:.7});
  // 遮阳棚
  const stripes = 6;
  for(let i=0;i<stripes;i++){
    G.fillStyle = awning[i%2];
    G.globalAlpha=.55;
    G.beginPath();
    G.moveTo(x + i*w/stripes, y);
    G.lineTo(x + (i+1)*w/stripes, y);
    G.lineTo(x + (i+1)*w/stripes - 4, y+18);
    G.lineTo(x + i*w/stripes - 4, y+18);
    G.closePath(); G.fill();
  }
  G.globalAlpha=1;
  // 玻璃门
  G.globalAlpha=.18; G.fillStyle='#7d8f96';
  G.fillRect(x+22,y+54,w-44,94);
  G.globalAlpha=.5; G.strokeStyle=INK; G.lineWidth=1.6;
  G.strokeRect(x+22,y+54,w-44,94);
  G.beginPath(); G.moveTo(x+w/2,y+54); G.lineTo(x+w/2,y+148); G.stroke();
  G.globalAlpha=.10; G.fillStyle='#5a5346';
  G.fillRect(x+30,y+84,w-60,4);
  G.fillRect(x+30,y+108,w-60,4);
  G.globalAlpha=1;

  // 招牌
  G.fillStyle='rgba(250,245,232,.85)';
  G.fillRect(x+18,y-16,64,22);
  rough(x+18,y-16,x+82,y-16,{w:1.4,a:.45});
  txt(label, x+50, y-5, { size:12, align:'center', alpha:.8 });
}
function drawParkGate(){
  const x=1030;
  G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=4;
  G.beginPath(); G.moveTo(x-56,620); G.lineTo(x-56,470); G.stroke();
  G.beginPath(); G.moveTo(x+56,620); G.lineTo(x+56,470); G.stroke();
  G.globalAlpha=.45; G.lineWidth=2;
  G.beginPath(); G.moveTo(x-64,470); G.lineTo(x+64,470); G.stroke();
  G.globalAlpha=1;
  txt("@scenes.park.name", x, 494, { size:16, align:'center', alpha:.55 });
  tree(x-96, 620, .9, 21);
  tree(x+96, 620, 1.0, 22);
}
function drawStreet(){
  drawSkyIn({x:0,y:0,w:W,h:620}, true);
  drawPavement(620);

  G.save();
  G.globalAlpha=.09; G.fillStyle='#3a4250';
  [[20,330,110,290],[150,300,120,320],[860,340,100,280],[1150,300,110,320]].forEach(b=>{
    G.fillRect(b[0],b[1],b[2],b[3]);
  });
  G.restore();

  drawHomeFacade();
  drawShop(330, "@legacy.81053", ['#b98a6a','#efe6d2']);
  drawShop(720, "@legacy.81099", ['#7d8a72','#efe6d2']);
  drawParkGate();

  // 路灯
  [230, 900].forEach(x=>{
    rough(x,620,x,470,{w:2.6,a:.45});
    G.beginPath(); G.arc(x,462,9,0,7);
    G.fillStyle='rgba(255,246,214,.6)'; G.fill();
    G.strokeStyle=INK; G.globalAlpha=.4; G.lineWidth=1.4; G.stroke(); G.globalAlpha=1;
  });
}
function drawPark(){
  drawSkyIn({x:0,y:0,w:W,h:620}, true);
  drawPavement(620);

  // 草地
  G.fillStyle='rgba(94,112,82,.10)';
  G.fillRect(0,596,W,44);
  for(let i=0;i<70;i++){
    const gx = nz(i,5)*W;
    rough(gx,620,gx+rand(-3,3),604+nz(i,6)*12,{w:1.1,a:.30,seed:i});
  }

  tree(210,620,1.15,11);
  tree(900,620,1.0,12);
  tree(1130,620,.85,13);

  // 长椅
  const bx=430, by=620;
  rough(bx-56,by-30,bx+56,by-30,{w:5,a:.7});
  rough(bx-56,by-48,bx+56,by-48,{w:4,a:.6});
  rough(bx-48,by-46,bx-48,by-30,{w:2,a:.4});
  rough(bx+48,by-46,bx+48,by-30,{w:2,a:.4});
  rough(bx-44,by-30,bx-44,by,{w:2.6,a:.55});
  rough(bx+44,by-30,bx+44,by,{w:2.6,a:.55});

  // 路灯
  rough(760,620,760,470,{w:2.6,a:.4});
  G.beginPath(); G.arc(760,462,8,0,7);
  G.fillStyle='rgba(255,246,214,.5)'; G.fill();
  G.strokeStyle=INK; G.globalAlpha=.35; G.lineWidth=1.2; G.stroke(); G.globalAlpha=1;

  // 垃圾桶
  G.fillStyle='rgba(72,64,48,.18)';
  G.fillRect(508,558,34,62);
  G.strokeStyle=INK; G.globalAlpha=.4; G.lineWidth=1.6;
  G.strokeRect(508,558,34,62); G.globalAlpha=1;

  // 池塘
  const px=950, py=640;
  G.save();
  G.globalAlpha=.16; G.fillStyle='#5c7b86';
  G.beginPath(); G.ellipse(px,py-16,120,30,0,0,7); G.fill();
  G.globalAlpha=.35; G.strokeStyle='#44606a'; G.lineWidth=1.6;
  for(let i=0;i<3;i++){
    G.beginPath(); G.ellipse(px,py-16,44+i*30,10+i*7,0,0,7); G.stroke();
  }
  G.restore();
  // 荷叶
  for(let i=0;i<3;i++){
    G.globalAlpha=.22; G.fillStyle='#5d6b52';
    G.beginPath(); G.ellipse(px-30+i*34, py-22+((i%2)*8), 10, 4, 0, 0, 7); G.fill();
  }
  G.globalAlpha=1;

  // 鸽子
  for(let i=0;i<5;i++){
    const gx = 620 + i*22, gy = 612 + (i%2)*6;
    G.fillStyle='rgba(70,70,64,.55)';
    G.beginPath(); G.ellipse(gx,gy,4,3,0,0,7); G.fill();
    G.beginPath(); G.arc(gx+4,gy-4,2,0,7); G.fill();
    G.strokeStyle='rgba(70,70,64,.4)'; G.lineWidth=1;
    G.beginPath(); G.moveTo(gx-4,gy); G.lineTo(gx-8,gy-2); G.stroke();
  }
}
function drawStore(){
  // 室内墙
  G.fillStyle='rgba(255,252,244,.42)';
  G.fillRect(0,120,W,500);
  rough(0,120,W,120,{w:3,a:.6});
  drawPavement(620);

  drawSkyIn({x:850,y:270,w:120,h:120}, false);
  G.strokeStyle=INK; G.globalAlpha=.5; G.lineWidth=2;
  G.strokeRect(850,270,120,120); G.globalAlpha=1;

  G.fillStyle='rgba(255,253,246,.7)';
  G.fillRect(180,320,92,108);
  G.strokeStyle=INK; G.globalAlpha=.32; G.lineWidth=1.4;
  G.strokeRect(180,320,92,108);
  G.globalAlpha=1;
  txt("@legacy.83822", 226, 352, { size:12, align:'center', alpha:.62, color:RED });
  txt('24H', 226, 376, { size:9, align:'center', alpha:.35 });

  // 货架 A
  const shelf=(x:number,y:number,w:number,h:number,rows:number)=>{
    G.fillStyle='rgba(255,253,246,.65)';
    G.fillRect(x,y,w,h);
    G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=2.2;
    G.strokeRect(x,y,w,h);
    G.globalAlpha=.4; G.lineWidth=1.4;
    for(let i=1;i<rows;i++){
      const yy=y+h*i/rows;
      G.beginPath(); G.moveTo(x,yy); G.lineTo(x+w,yy); G.stroke();
    }
    for(let r=0;r<rows;r++){
      let bx=x+6;
      const by=y+h*r/rows+8;
      while(bx<x+w-8){
        const bw=6+nz(bx,r)*8, bh=12+nz(bx,r+3)*8;
        G.globalAlpha=.55;
        G.fillStyle=['#b98a6a','#8a9a7a','#8d9aa8','#b7a06a'][Math.floor(nz(bx,r+7)*4)%4];
        G.fillRect(bx,by+18-bh,bw,bh);
        bx+=bw+4;
      }
    }
    G.globalAlpha=1;
    G.fillStyle='rgba(43,42,38,.06)';
    G.fillRect(x,y+h,w,8);
  };
  shelf(300,450,180,170,4);
  shelf(510,450,150,170,3);

  // 冰柜
  G.fillStyle='rgba(210,225,230,.45)';
  G.fillRect(700,470,120,150);
  G.strokeStyle=INK; G.globalAlpha=.55; G.lineWidth=2.2;
  G.strokeRect(700,470,120,150);
  G.globalAlpha=.35; G.lineWidth=1.4;
  G.beginPath(); G.moveTo(700,520); G.lineTo(820,520); G.stroke();
  G.globalAlpha=1;

  // 收银台
  G.fillStyle='rgba(255,253,246,.6)';
  G.fillRect(900,530,170,90);
  G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=2.4;
  G.strokeRect(900,530,170,90);
  G.globalAlpha=.5;
  G.fillRect(930,502,56,28);
  G.strokeRect(930,502,56,28);
  G.globalAlpha=1;
  txt("@legacy.85366", 985, 516, { size:9, align:'center', alpha:.5 });

  // 吊灯
  for(let i=0;i<3;i++){
    const lx = 280 + i*300;
    rough(lx,120,lx,168,{w:1.1,a:.25});
    G.beginPath(); G.arc(lx,174,8,0,7);
    G.fillStyle='rgba(255,248,222,.8)'; G.fill();
    G.strokeStyle=INK; G.globalAlpha=.3; G.lineWidth=1.2; G.stroke(); G.globalAlpha=1;
  }
}
function drawBook(){
  G.fillStyle='rgba(255,252,244,.4)';
  G.fillRect(0,110,W,510);
  rough(0,110,W,110,{w:3,a:.6});
  drawPavement(620);

  const tallShelf=(x:number,y:number,w:number,h:number)=>{
    G.fillStyle='rgba(255,253,246,.6)';
    G.fillRect(x,y,w,h);
    G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=2.2;
    G.strokeRect(x,y,w,h);
    const rows=6;
    for(let r=0;r<rows;r++){
      const yy=y+h*r/rows;
      G.globalAlpha=.35; G.lineWidth=1.2;
      G.beginPath(); G.moveTo(x,yy); G.lineTo(x+w,yy); G.stroke();
      let bx=x+5;
      while(bx<x+w-6){
        const bw=4+nz(bx,r)*6;
        G.globalAlpha=.55;
        G.fillStyle=['#9a6a52','#6d7d6a','#6a7a88','#8a7a5a','#7a6a80'][Math.floor(nz(bx,r+4)*5)%5];
        G.fillRect(bx, yy+6, bw, h/rows-12);
        bx+=bw+2;
      }
    }
    G.globalAlpha=1;
  };
  tallShelf(300,230,180,390);
  tallShelf(520,230,160,390);
  tallShelf(720,230,160,390);

  // 柜台
  G.fillStyle='rgba(255,253,246,.6)';
  G.fillRect(940,510,180,110);
  G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=2.4;
  G.strokeRect(940,510,180,110);
  G.globalAlpha=1;
  // 柜台上的书堆
  for(let i=0;i<3;i++){
    G.fillStyle='rgba(160,120,90,.5)';
    G.fillRect(975,486-i*9,54,7);
  }
  // 猫
  G.fillStyle='rgba(60,58,52,.55)';
  G.beginPath(); G.ellipse(1080,486,16,9,0,0,7); G.fill();
  G.beginPath(); G.arc(1092,478,7,0,7); G.fill();
  G.beginPath(); G.moveTo(1087,472); G.lineTo(1089,466); G.lineTo(1092,472); G.fill();
  G.beginPath(); G.moveTo(1094,472); G.lineTo(1097,466); G.lineTo(1098,473); G.fill();
}
function drawOutdoorScene(){
  const id = S.scene;
  if(id === 'street') drawStreet();
  else if(id === 'park') drawPark();
  else if(id === 'store') drawStore();
  else if(id === 'book') drawBook();
  else drawStreet();
}
function drawFurn(f:{t:string;x:number;y:number},ghost:boolean){
  const d = FURN[f.t];
  if(!d) return;
  const x = f.x, y = f.y;
  const L = x - d.w/2;
  const T = y - d.h;

  // 落地阴影
  if(!ghost && f.t !== 'rug'){
    G.save();
    G.globalAlpha = .10; G.fillStyle = '#3a3830';
    G.beginPath(); G.ellipse(x, y-2, Math.min(d.w*0.48, 58), 5.5, 0, 0, 7); G.fill();
    G.restore();
  }

  G.save();
  if(ghost) G.globalAlpha = .42;

  switch(f.t){
    case 'bed': {
      G.fillStyle='rgba(72,64,48,.10)'; rr(L,T+12,d.w,d.h-12,4); G.fill();
      G.fillStyle='rgba(255,253,246,.9)'; rr(L+6,T+16,d.w-12,24,6); G.fill();
      G.fillStyle='rgba(122,106,134,.38)'; rr(L+42,T+18,d.w-50,22,5); G.fill();
      G.fillStyle='rgba(255,255,255,.95)'; rr(L+10,T+17,28,17,6); G.fill();
      rough(L,T+8,L,T+d.h,{w:3,a:.82});
      rough(L,T+8,L+9,T+8,{w:3,a:.82});
      rough(L,y,L+d.w,y,{w:2.6,a:.7});
      rough(L+56,T+20,L+56,T+40,{w:1.2,a:.22});
      break;
    }
    case 'stove': {
      G.fillStyle='rgba(72,64,48,.10)'; rr(L,T+20,d.w,d.h-20,3); G.fill();
      G.fillStyle='rgba(255,253,246,.85)'; rr(L,T+10,d.w,12,2); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=1.6;
      G.beginPath(); G.arc(L+18,T+6,7,0,7); G.stroke();
      G.beginPath(); G.arc(L+50,T+6,7,0,7); G.stroke();
      G.beginPath(); G.arc(L+50,T-2,10,Math.PI,0); G.stroke();
      G.globalAlpha=1;
      rough(L,T+10,L,T+d.h,{w:2.4,a:.7});
      rough(L+d.w,T+10,L+d.w,y,{w:2.4,a:.7});
      rough(L,T+d.h,L+d.w,y,{w:2,a:.5});
      G.fillStyle=RED; G.globalAlpha=.65; G.fillRect(L+8,T+30,4,16); G.globalAlpha=1;
      break;
    }
    case 'fridge': {
      G.fillStyle='rgba(255,253,246,.92)'; rr(L,T,d.w,d.h,4); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.72; G.lineWidth=2.4; G.stroke();
      G.globalAlpha=.5; G.lineWidth=1.6;
      G.beginPath(); G.moveTo(L,T+d.h*0.36); G.lineTo(L+d.w,T+d.h*0.36); G.stroke();
      G.beginPath(); G.moveTo(L+d.w-10,T+12); G.lineTo(L+d.w-10,T+30); G.stroke();
      G.beginPath(); G.moveTo(L+d.w-10,T+50); G.lineTo(L+d.w-10,T+72); G.stroke();
      G.globalAlpha=1;
      G.fillStyle=RED; G.globalAlpha=.7; G.fillRect(L+10,T+22,10,10); G.globalAlpha=1;
      break;
    }
    case 'shower': {
      G.strokeStyle=INK; G.globalAlpha=.65; G.lineWidth=2.6;
      G.beginPath(); G.moveTo(L+8,T); G.lineTo(L+8,T+22); G.lineTo(L+34,T+22); G.stroke();
      G.beginPath(); G.arc(L+34,T+26,7,Math.PI*0.15,Math.PI*0.85); G.stroke();
      G.globalAlpha=1;
      rough(L+4,T+22,L+4,y,{w:1.4,a:.22});
      for(let i=0;i<5;i++){
        const dx = L+28+i*7, dy = T+36+nz(i,3)*40;
        rough(dx,dy,dx-2,dy+9,{w:1,a:.22,seed:i});
      }
      G.fillStyle='rgba(72,64,48,.08)'; rr(L+10,y-8,44,8,2); G.fill();
      rough(L+10,y-8,L+54,y-8,{w:2,a:.5});
      break;
    }
    case 'sofa': {
      G.fillStyle='rgba(72,64,48,.10)'; rr(L,T+8,d.w,d.h-8,7); G.fill();
      G.fillStyle='rgba(140,120,100,.22)'; rr(L+4,T+4,d.w-8,24,9); G.fill();
      G.fillStyle='rgba(255,253,246,.55)'; rr(L+10,T+18,d.w*0.36,18,6); G.fill();
      rr(L+d.w*0.52,T+18,d.w*0.36,18,6); G.fill();
      rough(L,T+10,L,y,{w:2.6,a:.72});
      rough(L+d.w,T+10,L+d.w,y,{w:2.6,a:.72});
      rough(L,y,L+d.w,y,{w:2.4,a:.6});
      break;
    }
    case 'tv': {
      G.fillStyle='rgba(72,64,48,.10)'; rr(L+d.w*0.2,T+38,d.w*0.6,14,2); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.7; G.lineWidth=2.2;
      G.beginPath(); G.moveTo(L+d.w*0.3,T+38); G.lineTo(L+d.w*0.7,T+38); G.stroke();
      G.fillStyle='rgba(40,42,44,.78)'; rr(L+2,T+6,d.w-4,34,4); G.fill();
      G.globalAlpha=.5; G.fillStyle='rgba(200,215,220,.5)';
      G.fillRect(L+8,T+12,d.w*0.3,3);
      G.fillRect(L+8,T+18,d.w*0.18,2);
      G.globalAlpha=.6; G.strokeStyle=INK;
      G.beginPath(); G.moveTo(L+16,T+6); G.lineTo(L+8,T-10); G.stroke();
      G.beginPath(); G.moveTo(L+d.w-16,T+6); G.lineTo(L+d.w-6,T-10); G.stroke();
      G.globalAlpha=1;
      rough(L+2,T+6,L+2,T+40,{w:1.8,a:.5});
      break;
    }
    case 'easel': {
      G.strokeStyle=INK; G.globalAlpha=.75; G.lineWidth=3;
      G.beginPath(); G.moveTo(x,T); G.lineTo(L+4,y); G.stroke();
      G.beginPath(); G.moveTo(x,T); G.lineTo(L+d.w-4,y); G.stroke();
      G.beginPath(); G.moveTo(x,T+10); G.lineTo(x+6,y-4); G.stroke();
      G.globalAlpha=1;
      G.save();
      G.translate(x,T+18); G.rotate(-.03);
      G.fillStyle='rgba(255,253,246,.95)';
      G.fillRect(-d.w/2+2,-14,d.w-6,42);
      G.strokeStyle=INK; G.globalAlpha=.55; G.lineWidth=1.6;
      G.strokeRect(-d.w/2+2,-14,d.w-6,42);
      G.globalAlpha=.55; G.strokeStyle='rgba(60,62,66,.7)'; G.lineWidth=1.4;
      G.beginPath(); G.moveTo(-18,16); G.quadraticCurveTo(-6,-6,6,10); G.stroke();
      G.beginPath(); G.moveTo(-2,18); G.quadraticCurveTo(10,2,20,14); G.stroke();
      G.restore();
      G.save(); G.globalAlpha=.8; G.fillStyle=RED; G.fillRect(x+12,T+2,9,9); G.restore();
      break;
    }
    case 'desk': {
      G.fillStyle='rgba(255,253,246,.7)'; rr(L,T+8,d.w,10,2); G.fill();
      rough(L,T+8,L+d.w,T+8,{w:2.4,a:.72});
      rough(L+8,T+18,L+8,y,{w:2.4,a:.62});
      rough(L+d.w-8,T+18,L+d.w-8,y,{w:2.4,a:.62});
      G.fillStyle='rgba(40,42,44,.6)'; rr(L+d.w*0.55,T-18,d.w*0.34,28,2); G.fill();
      G.fillStyle='rgba(255,253,246,.9)'; rr(L+12,T-4,30,12,1); G.fill();
      rough(L+12,T-4,L+42,T-4,{w:1,a:.4});
      G.fillStyle=RED; G.globalAlpha=.6; G.beginPath(); G.arc(L+26,T+14,3,0,7); G.fill(); G.globalAlpha=1;
      break;
    }
    case 'tea': {
      G.fillStyle='rgba(255,253,246,.55)'; rr(L,T+10,d.w,9,2); G.fill();
      rough(L,T+10,L+d.w,T+10,{w:2.2,a:.66});
      rough(L+6,T+18,L+8,y,{w:2,a:.55});
      rough(L+d.w-6,T+18,L+d.w-8,y,{w:2,a:.55});
      G.strokeStyle=INK; G.globalAlpha=.6; G.lineWidth=1.8;
      G.beginPath(); G.arc(x-6,T+2,10,Math.PI*0.1,Math.PI*0.9); G.stroke();
      G.beginPath(); G.moveTo(x-16,T+2); G.lineTo(x+4,T+2); G.stroke();
      G.beginPath(); G.arc(x+16,T+6,4,0,7); G.stroke();
      G.globalAlpha=1;
      G.save(); G.globalAlpha=.18; G.strokeStyle='#6a6252'; G.lineWidth=1.4;
      G.beginPath(); G.moveTo(x-8,T-8); G.quadraticCurveTo(x-2,T-18,x-8,T-28); G.stroke();
      G.restore();
      break;
    }
    case 'plant': {
      G.fillStyle='rgba(72,64,48,.14)';
      G.beginPath();
      G.moveTo(L+6,y); G.lineTo(L+d.w-6,y); G.lineTo(L+d.w-11,y-22); G.lineTo(L+11,y-22);
      G.closePath(); G.fill();
      rough(L+6,y,L+d.w-6,y,{w:2,a:.6});
      rough(L+11,y-22,L+d.w-11,y-22,{w:1.6,a:.45});
      G.strokeStyle=INK; G.globalAlpha=.62; G.lineWidth=2;
      G.beginPath(); G.moveTo(x,y-22); G.quadraticCurveTo(x-4,y-42,x-12,y-50); G.stroke();
      G.beginPath(); G.moveTo(x,y-22); G.quadraticCurveTo(x+3,y-46,x+14,y-54); G.stroke();
      G.beginPath(); G.moveTo(x,y-22); G.quadraticCurveTo(x+1,y-50,x-2,y-62); G.stroke();
      G.globalAlpha=.45; G.fillStyle='#5d6b52';
      G.beginPath(); G.ellipse(x-13,y-51,7,4,-.6,0,7); G.fill();
      G.beginPath(); G.ellipse(x+15,y-55,7,4,.6,0,7); G.fill();
      G.beginPath(); G.ellipse(x-2,y-63,6,4,0,0,7); G.fill();
      G.globalAlpha=1;
      break;
    }
    case 'bookshelf': {
      G.fillStyle='rgba(255,253,246,.55)'; rr(L,T,d.w,d.h,2); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.7; G.lineWidth=2.4;
      G.strokeRect(L,T,d.w,d.h);
      G.globalAlpha=.45; G.lineWidth=1.6;
      for(let i=1;i<3;i++){
        const yy = T + d.h*(i/3);
        G.beginPath(); G.moveTo(L,yy); G.lineTo(L+d.w,yy); G.stroke();
      }
      const cols = ['rgba(166,64,47,.55)','rgba(70,90,110,.5)','rgba(110,120,90,.5)','rgba(120,100,120,.45)'];
      for(let r=0;r<3;r++){
        let bx = L+6;
        const by = T + d.h*(r/3) + 8;
        while(bx < L+d.w-8){
          const bw = 4 + nz(bx,r)*5;
          const bh = 14 + nz(bx,r+2)*10;
          G.globalAlpha=.75; G.fillStyle = cols[Math.floor(nz(bx,r+6)*cols.length)%cols.length];
          G.fillRect(bx, by + (20-bh), bw, bh);
          bx += bw + 2;
        }
      }
      G.globalAlpha=1;
      break;
    }
    case 'wardrobe': {
      G.fillStyle='rgba(255,253,246,.6)'; rr(L,T,d.w,d.h,2); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.72; G.lineWidth=2.4;
      G.strokeRect(L,T,d.w,d.h);
      G.globalAlpha=.5; G.lineWidth=1.6;
      G.beginPath(); G.moveTo(x,T); G.lineTo(x,y); G.stroke();
      G.beginPath(); G.arc(x-6,T+d.h*0.5,2.2,0,7); G.stroke();
      G.beginPath(); G.arc(x+6,T+d.h*0.5,2.2,0,7); G.stroke();
      G.globalAlpha=1;
      G.fillStyle=RED; G.globalAlpha=.5; G.fillRect(x-9,T+10,18,3); G.globalAlpha=1;
      break;
    }
    case 'lamp': {
      rough(x,T+16,x,y,{w:2.4,a:.6});
      G.fillStyle='rgba(255,250,236,.85)';
      G.beginPath();
      G.moveTo(x-15,T+16); G.lineTo(x+15,T+16); G.lineTo(x+9,T+2); G.lineTo(x-9,T+2);
      G.closePath(); G.fill();
      G.strokeStyle=INK; G.globalAlpha=.55; G.lineWidth=1.6; G.stroke();
      G.globalAlpha=1;
      G.fillStyle='rgba(72,64,48,.16)';
      G.beginPath(); G.ellipse(x,y-3,16,4,0,0,7); G.fill();
      break;
    }
    case 'rug': {
      G.save();
      G.globalAlpha=.42;
      G.fillStyle='rgba(122,102,96,.55)';
      G.beginPath(); G.ellipse(x,y-3,d.w/2,7,0,0,7); G.fill();
      G.globalAlpha=.62;
      G.strokeStyle='rgba(90,74,70,.75)'; G.lineWidth=1.4;
      G.beginPath(); G.ellipse(x,y-3,d.w/2-9,4.2,0,0,7); G.stroke();
      G.globalAlpha=.5;
      G.beginPath(); G.ellipse(x,y-3,d.w/2-20,2.2,0,0,7); G.stroke();
      G.restore();
      break;
    }
  }

  G.restore();
}
function drawPerson(px:number,py:number,facing:number,walking:boolean,look:Partial<Look>&{stage?:string;hairColor?:string}={}){
  look = look || {};
  const stage = look.stage || 'young';
  const kid = stage === 'kid';
  const mid = stage === 'mid';
  const grow = kid ? .74 : (mid ? 1.06 : 1);
  const K = (look.scale || 1) * 1.3 * grow;
  const R = kid ? 11.8 : 10.5;
  G.save();
  G.translate(px,py); G.scale(K,K); G.translate(-px,-py);

  const skin = look.skin || '#f4ecdc';
  const cloth = look.cloth || '#efe7d4';
  const hairColor = look.hairColor || '#2b2a26';
  const hairStyle = look.hair || 'short';
  const acc = look.acc || 'none';
  const skirt = !!look.skirt;

  const t = tGlobal;
  const bob = walking ? Math.abs(Math.sin(t*11))*2.2 : Math.sin(t*2.2)*.8;

  const hipY = py - (kid?20:24);
  const shoulderY = hipY - (kid?16:20) + bob*.4;
  const headY = shoulderY - (kid?11:10) + bob*.4 + (mid?.8:0);

  // 腿
  const sw = walking ? Math.sin(t*13)*6 : 0;
  G.strokeStyle=INK; G.lineWidth=3.2; G.globalAlpha=.9; G.lineCap='round';
  G.beginPath(); G.moveTo(px-4,hipY+2); G.lineTo(px-4+sw,py-2); G.stroke();
  G.beginPath(); G.moveTo(px+4,hipY+2); G.lineTo(px+4-sw,py-2); G.stroke();
  G.globalAlpha=1;

  // 身体（裙子会外扩）
  const hem = (skirt ? 15 : 11) + (mid ? 1.8 : 0);
  G.beginPath();
  G.moveTo(px-(mid?9.2:8), shoulderY+4);
  G.quadraticCurveTo(px-hem+3, hipY-9, px-hem, hipY+2);
  G.lineTo(px+hem, hipY+2);
  G.quadraticCurveTo(px+hem-3, hipY-9, px+(mid?9.2:8), shoulderY+4);
  G.closePath();
  G.fillStyle = cloth; G.fill();
  G.strokeStyle=INK; G.lineWidth=2.2; G.globalAlpha=.85; G.stroke();
  G.globalAlpha=1;
  if(skirt){
    G.strokeStyle='rgba(43,42,38,.35)'; G.lineWidth=1.1;
    G.beginPath(); G.moveTo(px-hem+2, hipY); G.lineTo(px+hem-2, hipY); G.stroke();
  }

  // 手臂
  const armSw = walking ? -Math.sin(t*13)*5 : 0;
  const armLift = S.action ? 6 + Math.sin(t*8)*4 : 0;
  G.strokeStyle=INK; G.globalAlpha=.8; G.lineWidth=2.8;
  G.beginPath();
  G.moveTo(px+facing*7, shoulderY+8);
  G.lineTo(px+facing*(11)+armSw, hipY-2-armLift);
  G.stroke();
  G.globalAlpha=1;

  // 头
  G.beginPath(); G.arc(px, headY, R, 0, 7);
  G.fillStyle = skin; G.fill();
  G.strokeStyle=INK; G.lineWidth=2; G.globalAlpha=.85; G.stroke();
  G.globalAlpha=1;

  // 头发
  G.save();
  G.translate(px, headY); G.scale(R/10.5, R/10.5); G.translate(-px, -headY);
  G.fillStyle = hairColor;
  G.strokeStyle = hairColor;

  if(hairStyle === 'bob'){
    G.beginPath(); G.arc(px, headY, 11, Math.PI*1.03, Math.PI*1.97); G.fill();
    rr(px-12.4, headY-5, 4.6, 15, 2.2); G.fill();
    rr(px+7.8, headY-5, 4.6, 15, 2.2); G.fill();
  } else if(hairStyle === 'braid'){
    G.beginPath(); G.arc(px, headY, 11, Math.PI*1.03, Math.PI*1.97); G.fill();
    for(const s of [-1,1]){
      G.lineWidth = 4.2; G.lineCap = 'round';
      G.beginPath();
      G.moveTo(px + s*9, headY+2);
      G.quadraticCurveTo(px + s*15, headY+12, px + s*11, headY+23);
      G.stroke();
      G.beginPath(); G.arc(px + s*11, headY+24, 2.6, 0, 7); G.fill();
    }
  } else if(hairStyle === 'pony'){
    G.lineWidth = 5.2; G.lineCap = 'round';
    G.beginPath();
    G.moveTo(px - facing*8, headY-3);
    G.quadraticCurveTo(px - facing*21, headY+3, px - facing*16, headY+17);
    G.stroke();
    G.beginPath(); G.arc(px, headY, 11, Math.PI*1.03, Math.PI*1.97); G.fill();
  } else if(hairStyle === 'curl'){
    for(let i=-2;i<=2;i++){
      G.beginPath();
      G.arc(px + i*4.7, headY-7.4 + Math.abs(i)*1.7, 4, 0, 7);
      G.fill();
    }
    rr(px-12.6, headY-5, 4.4, 12, 2); G.fill();
    rr(px+8.2, headY-5, 4.4, 12, 2); G.fill();
  } else if(hairStyle === 'buzz'){
    G.beginPath(); G.arc(px, headY, 10.9, Math.PI*1.12, Math.PI*1.88); G.fill();
  } else {
    // short
    G.beginPath(); G.arc(px, headY, 11, Math.PI*1.04, Math.PI*1.96); G.fill();
    G.beginPath();
    G.moveTo(px-10, headY-3);
    G.quadraticCurveTo(px-2, headY-11, px+6, headY-7);
    G.quadraticCurveTo(px-1, headY-6, px-5, headY-1);
    G.closePath(); G.fill();
  }

  if(mid){
    G.fillStyle='rgba(224,220,206,.62)';
    G.beginPath(); G.arc(px-9.3, headY-5.2, 2.5, 0, 7); G.fill();
    G.beginPath(); G.arc(px+9.3, headY-5.2, 2.5, 0, 7); G.fill();
    G.strokeStyle='rgba(43,42,38,.2)'; G.lineWidth=1;
    G.beginPath(); G.moveTo(px-1.2, shoulderY+7); G.lineTo(px-1.2, hipY-2); G.stroke();
    G.strokeStyle='rgba(232,228,216,.9)'; G.lineWidth=1.5; G.lineCap='round';
    G.beginPath(); G.moveTo(px-6.4, headY-8.6); G.lineTo(px-4.4, headY-2.4); G.stroke();
    G.beginPath(); G.moveTo(px+2.6, headY-9.4); G.lineTo(px+4.2, headY-3.2); G.stroke();
  }
  G.restore();

  // 配饰
  if(acc === 'cap'){
    G.beginPath(); G.arc(px, headY-3.5, 10.2, Math.PI, 0); G.fill();
    G.beginPath();
    G.ellipse(px + facing*8, headY-3.2, 8.6, 2.6, 0, 0, 7);
    G.fill();
  }

  // 眼睛
  G.fillStyle = '#25241f';
  G.beginPath(); G.arc(px - 3 + facing*2.2, headY+1, 1.35, 0, 7); G.fill();
  G.beginPath(); G.arc(px + 3 + facing*2.2, headY+1, 1.35, 0, 7); G.fill();

  if(acc === 'glasses'){
    G.strokeStyle='rgba(43,42,38,.75)'; G.lineWidth=.9;
    G.beginPath(); G.arc(px - 3 + facing*2.2, headY+1, 3.1, 0, 7); G.stroke();
    G.beginPath(); G.arc(px + 3 + facing*2.2, headY+1, 3.1, 0, 7); G.stroke();
    G.beginPath();
    G.moveTo(px - 0.2 + facing*2.2, headY+1);
    G.lineTo(px + 0.2 + facing*2.2, headY+1);
    G.stroke();
  }

  // 嘴
  G.strokeStyle='rgba(70,50,45,.7)'; G.lineWidth=1.1;
  G.beginPath();
  G.arc(px + facing*1.4, headY+4.5, 2.6, .25, Math.PI-.25);
  G.stroke();

  // 朱红点缀
  G.strokeStyle=RED; G.globalAlpha=.75; G.lineWidth=2.4;
  G.beginPath(); G.moveTo(px-7, shoulderY+6); G.lineTo(px+7, shoulderY+7); G.stroke();
  G.globalAlpha=1;

  G.restore();
}
if(mode==='house'){buildHouse();drawWindows();}else if(mode==='outside')drawOutdoorScene();else if(mode==='furniture'&&f)drawFurn({t:f.furnitureId,x:f.x,y:f.y},false);else if(mode==='person')drawPerson(0,0,S.player.facing,S.player.moving,overrideLook??{...S.look,stage:sim.stage});
}
