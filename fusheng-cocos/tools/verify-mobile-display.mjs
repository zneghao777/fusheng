import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.FUSHENG_WEB_URL||'http://127.0.0.1:18923/';
const report={checks:[],errors:[],devices:[],screens:[]};
await fs.mkdir('output/playwright/mobile-display',{recursive:true});
const check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name+': '+JSON.stringify(detail));};
const ready=p=>p.waitForFunction(()=>window.__FUSHENG__?.frameCount>15&&__FUSHENG__.artPending===0&&!document.querySelector('#fusheng-loading'),{timeout:45000});
const metrics=p=>p.evaluate(()=>{const canvas=document.querySelector('canvas'),rect=canvas.getBoundingClientRect(),d=__FUSHENG__.display;return {inner:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{width:canvas.width,height:canvas.height,x:rect.x,y:rect.y,cssWidth:rect.width,cssHeight:rect.height},display:d,papers:__FUSHENG__.ui.root.parent.getComponentsInChildren('cc.UITransform').filter(c=>c.node.name==='FullPaperBackground'&&c.node.activeInHierarchy).map(c=>({width:c.width,height:c.height}))};});
function audit(name,m){
 const c=m.canvas,d=m.display,v=d.visible;
 check(name+'-canvas-fills-css-viewport',Math.abs(c.cssWidth-m.inner.width)<1&&Math.abs(c.cssHeight-m.inner.height)<1&&c.x===0&&c.y===0,m);
 check(name+'-no-letterbox',d.viewport.x===0&&d.viewport.y===0&&Math.abs(d.viewport.width-c.width)<2&&Math.abs(d.viewport.height-c.height)<2,d);
 check(name+'-paper-covers-screen',m.papers.length>0&&m.papers.every(p=>Math.abs(p.width-v.width)<1&&Math.abs(p.height-v.height)<1),m.papers);
 check(name+'-native-density',Math.abs(c.width/c.cssWidth-Math.min(m.inner.dpr,3))<.02,m);
 check(name+'-uniform-world-scale',Math.abs(v.width/v.height-c.cssWidth/c.cssHeight)<.001,v);
}
async function tap(p,key){
 const button=await p.evaluate(key=>{const b=__FUSHENG__.buttons.find(b=>b.key===key);if(!b)return null;const scale=Math.min(innerWidth/1280,innerHeight/720);return {x:innerWidth/2+b.x*scale,y:innerHeight/2-b.y*scale};},key);
 if(!button)throw Error('Missing button '+key);
 await p.touchscreen.tap(button.x,button.y);await p.waitForTimeout(200);
}
async function toggleStatus(p){
 const point=await p.evaluate(()=>{const n=__FUSHENG__.ui.statusToggle.node,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+n.worldPosition.x*s,y:innerHeight/2-n.worldPosition.y*s};});
 await p.touchscreen.tap(point.x,point.y);await p.waitForTimeout(200);
}
for(const [name,engine,viewport,dpr]of[
 ['xiaomi-wide',chromium,{width:869,height:400},3],
 ['iphone-air',webkit,{width:874,height:402},3],
 ['iphone17-large',webkit,{width:956,height:440},3],
 ['small-phone',chromium,{width:667,height:375},2],
 ['tablet',chromium,{width:1024,height:768},2]
]){
 let browser;
 try{
  browser=await engine.launch(engine===chromium?{channel:'chrome',headless:true}:{headless:true});
  const context=await browser.newContext({viewport,deviceScaleFactor:dpr,isMobile:true,hasTouch:true}),p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await p.goto(base+'web-mobile/?test=1&touch=1');await ready(p);
  const m=await metrics(p);report.devices.push({name,...m});audit(name,m);
  await tap(p,'ui.help');check(name+'-help-tap',await p.evaluate(()=>__FUSHENG__.screen==='Help'));
  await tap(p,'ui.close');await tap(p,'ui.new');check(name+'-create-tap',await p.evaluate(()=>__FUSHENG__.screen==='Create'));
  check(name+'-creation-actions-visible',await p.evaluate(()=>__FUSHENG__.buttons.every(b=>{const s=Math.min(innerWidth/1280,innerHeight/720);return Math.abs(b.x)*s+b.width*s/2<=innerWidth/2+.1&&Math.abs(b.y)*s+b.height*s/2<=innerHeight/2+.1;})));
  for(const house of ['rental','flat','villa']){
   await p.goto(base+'web-mobile/?test=1&touch=1&skip=1&house='+house);await ready(p);
   check(name+'-'+house+'-status-starts-expanded',await p.evaluate(()=>__FUSHENG__.ui.statusExpanded&&__FUSHENG__.ui.needLabels[0].node.parent.activeInHierarchy));
   for(const expanded of [true,false]){
   if(!expanded)await toggleStatus(p);
   const geometry=await p.evaluate(()=>{
    const ui=__FUSHENG__.ui,f=ui.sceneFrame,room=f.room;
    const controls=[ui.hudTop,ui.statusTray,ui.needLabels[0].node.parent,ui.weeklyHint.node,ui.weeklyButton,...ui.touch.children];
    const overlaps=controls.filter(n=>n.activeInHierarchy).map(n=>{const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return {name:n.name,x:b.x,y:b.y,width:b.width,height:b.height};}).filter(b=>Math.min(room.right,b.x+b.width)>Math.max(room.left,b.x)+.1&&Math.min(room.top,b.y+b.height)>Math.max(room.bottom,b.y)+.1);
    const safe=ui.platform.viewport.safe,visible=__FUSHENG__.display.visible;const rendered=ui.root.parent.getChildByName('SceneView');return {expanded:ui.statusExpanded,leftAligned:Math.abs(room.left-(-visible.width/2+safe.x+8))<.1,coverage:(room.right-room.left)*(room.top-room.bottom)/(safe.width*safe.height),renderMatches:Math.abs(rendered.position.y-f.y)<.1&&Math.abs(rendered.scale.x-f.scaleX)<.0001,room,overlaps,inside:room.left>=-visible.width/2+safe.x&&room.right<=-visible.width/2+safe.x+safe.width&&room.top<=-visible.height/2+safe.y+safe.height&&room.bottom>=-visible.height/2+safe.y};
   });
   check(name+'-'+house+'-'+expanded+'-complete-room-visible',geometry.inside,geometry);
   check(name+'-'+house+'-'+expanded+'-no-HUD-over-room',geometry.overlaps.length===0,geometry);
   check(name+'-'+house+'-'+expanded+'-left-aligned-and-layout-applied',geometry.leftAligned&&geometry.renderMatches&&geometry.expanded===expanded,geometry);
   check(name+'-'+house+'-'+expanded+'-room-is-primary',geometry.coverage>(viewport.width/viewport.height>1.6?.75:.5),geometry);
   check(name+'-'+house+'-'+expanded+'-touch-targets',await p.evaluate(()=>{const ui=__FUSHENG__.ui,s=Math.min(innerWidth/1280,innerHeight/720);return[...ui.topControls,ui.statusToggle,...(ui.statusExpanded?[ui.weeklyControl]:[])].every(b=>{const t=b.node.getComponent('cc.UITransform');return t.width*s>=40&&t.height*s>=30;});}));
   if(house==='rental'){const shot=`output/playwright/mobile-display/${name}-${expanded?'expanded':'folded'}.png`;await p.screenshot({path:shot});report.screens.push(shot);}
   }
   await toggleStatus(p);check(name+'-'+house+'-status-restores-expanded',await p.evaluate(()=>__FUSHENG__.ui.statusExpanded));
  }
  if(name==='xiaomi-wide'){
   await p.goto(base+'web-mobile/?test=1&touch=1&screen=create');await ready(p);
   await p.setViewportSize({width:400,height:869});await p.waitForFunction(()=>__FUSHENG__.display.visible.height>1000);await p.waitForTimeout(200);audit(name+'-portrait',await metrics(p));
   check(name+'-rotate-hint',await p.evaluate(()=>__FUSHENG__.ui.rotate.active));
   await p.setViewportSize(viewport);await p.waitForFunction(()=>Math.abs(__FUSHENG__.display.visible.height-720)<1);await p.waitForTimeout(200);audit(name+'-back-landscape',await metrics(p));
   check(name+'-rotate-keeps-screen',await p.evaluate(()=>__FUSHENG__.screen==='Create'&&!__FUSHENG__.ui.rotate.active));
   await p.goto(base+'web-mobile/?test=1&touch=1&skip=1');await ready(p);await p.waitForTimeout(250);
   await p.evaluate(()=>{const s=document.documentElement.style;s.setProperty('--native-safe-left','38px');s.setProperty('--native-safe-right','12px');window.dispatchEvent(new Event('fusheng:insets'));});
   const hud=await p.evaluate(()=>{const ui=__FUSHENG__.ui,scale=Math.min(innerWidth/1280,innerHeight/720);return {top:ui.hudTop.getComponent('cc.UITransform').width,buttons:ui.hudTop.getComponentsInChildren('cc.Button').map(b=>{const pos=b.node.worldPosition,tr=b.node.getComponent('cc.UITransform');return {left:innerWidth/2+(pos.x-tr.width/2)*scale,right:innerWidth/2+(pos.x+tr.width/2)*scale};}),touch:ui.touch.children.map(n=>{const tr=n.getComponent('cc.UITransform');return innerWidth/2+(n.worldPosition.x+tr.width/2)*scale;})};});
   check(name+'-cutout-safe-actions',hud.buttons.every(b=>b.left>=38&&b.right<=viewport.width-12)&&hud.touch.every(right=>right<=viewport.width-12),hud);
   await p.evaluate(()=>{const s=document.documentElement.style;s.removeProperty('--native-safe-left');s.removeProperty('--native-safe-right');window.dispatchEvent(new Event('fusheng:insets'));});
   const before=await p.evaluate(()=>__FUSHENG__.state.player.x);
   const target=await p.evaluate(()=>{const s=__FUSHENG__.state,scale=Math.min(innerWidth/1280,innerHeight/720);const f=__FUSHENG__.ui.sceneFrame;return {x:innerWidth/2+(f.x+(s.player.x+90-640)*f.scaleX)*scale,y:innerHeight/2-(f.y+(360-s.player.y)*f.scaleY)*scale};});
   await p.touchscreen.tap(target.x,target.y);await p.waitForTimeout(1200);
   const after=await p.evaluate(()=>__FUSHENG__.state.player.x);check(name+'-walk-tap-has-correct-world-coordinate',after>before+20,{before,after});
   await p.waitForFunction(()=>!document.querySelector('#fusheng-fullscreen').hidden);
   await p.locator('#fusheng-fullscreen').click();await p.waitForTimeout(350);
   check(name+'-fullscreen-enters',await p.evaluate(()=>!!document.fullscreenElement));audit(name+'-fullscreen',await metrics(p));
   await p.locator('#fusheng-fullscreen').click();check(name+'-fullscreen-exits',await p.evaluate(()=>!document.fullscreenElement));
  }
  const shot=`output/playwright/mobile-display/${name}.png`;await p.screenshot({path:shot});report.screens.push(shot);
  if(name==='iphone-air'){
   await p.evaluate(()=>{document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;});
   await p.waitForFunction(()=>!document.querySelector('#fusheng-fullscreen').hidden);
   await p.locator('#fusheng-fullscreen').click();check('unsupported-fullscreen-home-screen-guidance',await p.locator('#fusheng-fullscreen-hint').isVisible());
   await p.getByRole('button',{name:'知道了'}).click();check('fullscreen-guidance-dismissible',await p.locator('#fusheng-fullscreen-hint').isHidden());
  }
 }catch(error){report.errors.push(name+': '+String(error));}
 finally{await browser?.close();}
}
report.passed=report.checks.every(c=>c.passed)&&report.errors.length===0;
await fs.writeFile('output/mobile-display-qa/browser-display.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors}));
if(!report.passed)process.exitCode=1;
