import {chromium} from 'playwright';import fs from 'node:fs/promises';
const report={checks:[],errors:[]},check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name);};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto((process.env.FUSHENG_WEB_URL||'http://127.0.0.1:18931/')+'web-desktop/?test=1&skip=1&house=flat&origin=normal');await page.waitForFunction(()=>window.__FUSHENG__?.frameCount>15&&__FUSHENG__.artPending===0&&!document.getElementById('fusheng-loading'));
 const point=async(x,y)=>page.evaluate(({x,y})=>{const f=__FUSHENG__.ui.sceneFrame;return{x:640+f.x+(x-640)*f.scaleX,y:360-f.y-(360-y)*f.scaleY};},{x,y});
 check('desktop-no-action-buttons',await page.evaluate(()=>__FUSHENG__.ui.touch.children.length===0));
 await page.mouse.click(540,400);await page.keyboard.press('Space');await page.waitForFunction(()=>!__FUSHENG__.state.player.grounded);check('desktop-space-jumps',true);await page.waitForFunction(()=>__FUSHENG__.state.player.grounded);
 await page.evaluate(()=>{__FUSHENG__.state.money=1000;__FUSHENG__.content.rules.event.chance=0;});await page.keyboard.press('b');await page.waitForFunction(()=>__FUSHENG__.screen==='Build');check('desktop-build-shortcut',true);
 const button=await page.evaluate(()=>{const ui=__FUSHENG__.ui,name=ui.t(ui.content.furniture.plant.name),b=ui.buttons.find(b=>b.label.string.startsWith(name)),p=b.node.worldPosition;return{x:640+p.x,y:360-p.y};});await page.mouse.click(button.x,button.y);
 const target=await page.evaluate(()=>{const ui=__FUSHENG__.ui;for(const y of ui.sim.house.floors)for(let x=ui.sim.house.x1+40;x<ui.sim.house.x2-40;x+=20){const p=ui.sim.canPlace('plant',x,y);if(p.ok&&!ui.overUI(p))return{...p,count:ui.sim.state.placed.length};}return null;});check('valid-build-space-available',!!target,target);
 const t=await point(target.x,target.y);await page.mouse.move(t.x,t.y);await page.waitForTimeout(200);
 check('placement-ghost-keeps-proportions',await page.evaluate(()=>{const g=__FUSHENG__.ui.buildView.node.getChildByName('PlacementGhost');return Math.abs(g.worldScale.x-g.worldScale.y)<.0001;}));
 await page.mouse.click(t.x,t.y);await page.waitForFunction(n=>__FUSHENG__.state.placed.length===n+1,target.count);check('click-places-at-mapped-coordinate',await page.evaluate(t=>__FUSHENG__.state.placed.some(p=>p.furnitureId==='plant'&&p.x===t.x&&p.y===t.y),target));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>__FUSHENG__.screen===null);await page.evaluate(()=>__FUSHENG__.save());check('placement-persists-in-save',await page.evaluate(t=>JSON.parse(localStorage.getItem('fs.slot.1')).state.placed.some(p=>p.furnitureId==='plant'&&p.x===t.x&&p.y===t.y),target));
 await page.screenshot({path:'output/playwright/mobile-display/approved-desktop.png'});
}catch(error){report.errors.push(String(error));}finally{await browser.close();}
report.passed=report.errors.length===0&&report.checks.every(c=>c.passed);await fs.writeFile('output/mobile-display-qa/desktop-room.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
