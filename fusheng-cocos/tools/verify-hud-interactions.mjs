import {chromium,webkit} from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.FUSHENG_WEB_URL||'http://127.0.0.1:18930/';
const report={checks:[],errors:[]};
const check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name+': '+JSON.stringify(detail));};
for(const[name,engine]of[['Chrome',chromium],['WebKit',webkit]]){
 const browser=await engine.launch(engine===chromium?{channel:'chrome',headless:true}:{headless:true});
 try{
  const context=await browser.newContext({viewport:{width:869,height:400},isMobile:true,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  const ready=()=>page.waitForFunction(()=>window.__FUSHENG__?.frameCount>15&&__FUSHENG__.artPending===0&&!document.getElementById('fusheng-loading'));
  const point=async(x,y)=>page.evaluate(({x,y})=>{const f=__FUSHENG__.ui.sceneFrame,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+(f.x+(x-640)*f.scaleX)*s,y:innerHeight/2-(f.y+(360-y)*f.scaleY)*s};},{x,y});
  const tap=async target=>{const p=await page.evaluate(target=>{const ui=__FUSHENG__.ui,n=target==='close'?ui.buttons.find(b=>b.key==='ui.close').node:target==='menu'?ui.topControls[3].node:ui[target].node,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+n.worldPosition.x*s,y:innerHeight/2-n.worldPosition.y*s};},target);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(150);};
  async function swipe(from,dx,dy,{cancel=false,multi=false}={}){
   const touches=(x,y)=>[{identifier:1,clientX:x,clientY:y},...(multi?[{identifier:2,clientX:x+30,clientY:y}]:[])];
   await page.dispatchEvent('#GameCanvas','touchstart',{touches:touches(from.x,from.y),changedTouches:touches(from.x,from.y)});
   for(let i=1;i<=4;i++){await page.waitForTimeout(25);await page.dispatchEvent('#GameCanvas','touchmove',{touches:touches(from.x+dx*i/4,from.y+dy*i/4),changedTouches:touches(from.x+dx*i/4,from.y+dy*i/4)});}
   await page.dispatchEvent('#GameCanvas',cancel?'touchcancel':'touchend',{touches:[],changedTouches:touches(from.x+dx,from.y+dy)});
  }
  await page.goto(base+'web-mobile/?test=1&touch=1&skip=1&house=rental&origin=normal');await ready();
  await page.evaluate(()=>{__FUSHENG__.content.rules.event.chance=0;});
  check(name+'-action-buttons-removed',await page.evaluate(()=>__FUSHENG__.ui.touch.children.length===0));
  const original=await page.evaluate(()=>__FUSHENG__.ui.sceneFrame);
  await tap('statusToggle');check(name+'-fold-expands-room-width',await page.evaluate(f=>!__FUSHENG__.ui.statusExpanded&&__FUSHENG__.ui.sceneFrame.room.right>f.room.right,original));
  await tap('statusToggle');check(name+'-restore-reference-layout',await page.evaluate(()=>__FUSHENG__.ui.statusExpanded));
  const proportions=await page.evaluate(()=>{const world=__FUSHENG__.ui.root.parent.getChildByName('SceneView').getChildByName('World');return world.getChildByName('FurnitureLayer').children.filter(n=>n.name.startsWith('Furniture_')).every(n=>Math.abs(n.worldScale.x-n.worldScale.y)<.0001);});check(name+'-furniture-proportions-retained',proportions);
  await page.setViewportSize({width:400,height:869});await page.waitForFunction(()=>__FUSHENG__.ui.rotate.active);await page.setViewportSize({width:869,height:400});await page.waitForFunction(()=>!__FUSHENG__.ui.rotate.active&&__FUSHENG__.display.visible.height===720);
  check(name+'-rotation-preserves-rail',await page.evaluate(()=>__FUSHENG__.ui.statusExpanded));
  await tap('weeklyControl');await page.waitForFunction(()=>__FUSHENG__.screen==='Collection');check(name+'-collection-accessible',true);await tap('close');
  const from=await point(650,560),y=await page.evaluate(()=>__FUSHENG__.state.player.y);
  await swipe(from,3,-64);await page.waitForFunction(()=>__FUSHENG__.state.player.vy<0&&!__FUSHENG__.state.player.grounded,{},{timeout:3000});check(name+'-upward-swipe-jumps',true);await page.waitForFunction(()=>__FUSHENG__.state.player.grounded,{},{timeout:5000});
  for(const[caseName,dx,dy,options]of[['short',0,-22,{}],['horizontal',65,0,{}],['down',0,35,{}],['cancelled',0,-64,{cancel:true}],['multitouch',0,-64,{multi:true}]]){
   const before=await page.evaluate(()=>({...__FUSHENG__.state.player}));await swipe(from,dx,dy,options);await page.waitForTimeout(80);
   check(name+'-'+caseName+'-does-not-jump',await page.evaluate(before=>Math.abs(__FUSHENG__.state.player.y-before.y)<1&&Math.abs(__FUSHENG__.state.player.x-before.x)<1,before));
  }
  const rail=await page.evaluate(()=>{const f=__FUSHENG__.ui.sceneFrame,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+f.rail.x*s,y:220};});await swipe(rail,0,-64);await page.waitForTimeout(70);check(name+'-status-swipe-does-not-jump',await page.evaluate(y=>Math.abs(__FUSHENG__.state.player.y-y)<1,y));
  await tap('menu');await swipe(from,0,-64);check(name+'-menu-swipe-does-not-jump',await page.evaluate(y=>Math.abs(__FUSHENG__.state.player.y-y)<1,y));await tap('close');
  const bed=await page.evaluate(()=>{const ui=__FUSHENG__.ui,b=ui.sim.state.placed.find(f=>f.furnitureId==='bed');ui.sim.state.player.x=b.x-100;return{x:b.x,y:b.y-35};});await page.waitForTimeout(300);const bedPoint=await point(bed.x,bed.y);await page.touchscreen.tap(bedPoint.x,bedPoint.y);await page.waitForFunction(()=>['RestConfirm','DaySummary'].includes(__FUSHENG__.state.panel?.kind),{},{timeout:20000});check(name+'-tap-bed-still-sleeps',true);
 }catch(error){report.errors.push(name+': '+String(error));}finally{await browser.close();}
}
report.passed=report.errors.length===0&&report.checks.every(c=>c.passed);await fs.writeFile('output/mobile-display-qa/hud-interactions.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors}));if(!report.passed)process.exitCode=1;
