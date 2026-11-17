// Run in an isolated Playwright CLI session with run-code --filename.
async (page) => {
 const report={checks:[],errors:[],durations:[],screens:[]},contexts=[];
 const check=(name,ok,detail)=>{report.checks.push({name,passed:!!ok,...(detail===undefined?{}:{detail})});if(!ok)throw Error(name+': '+JSON.stringify(detail));};
 const waitFrames=async(p,count=4)=>{const n=await p.evaluate(()=>window.__FUSHENG__.frameCount);await p.waitForFunction(({n,count})=>window.__FUSHENG__.frameCount>=n+count,{n,count});};
 const ready=async p=>{await p.waitForSelector('#fusheng-loading',{state:'detached'});await p.waitForFunction(()=>window.__FUSHENG__?.frameCount>20&&window.__FUSHENG__.artPending===0);await waitFrames(p);await p.waitForFunction(()=>window.__FUSHENG__.ui.root.getComponentsInChildren('cc.UIOpacity').every(c=>!c.node.activeInHierarchy||c.node.name==='PlacementGhost'||c.opacity===255));};
 const screen=(p,kind)=>{report.stage='screen '+kind;return p.waitForFunction(kind=>window.__FUSHENG__.screen===kind,kind);};
 const click=async(p,key,mobile=false)=>{
  report.stage='click '+key;await p.waitForFunction(key=>window.__FUSHENG__.buttons.some(b=>b.key.startsWith(key)),key);
  let b=await p.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key.startsWith(key)),key);
  if(key!=='entry.skip')for(let i=0;i<6&&(b.y<-240||b.y>280);i++){await p.evaluate(key=>{const ui=window.__FUSHENG__.ui,b=ui.buttons.find(b=>b.key.startsWith(key));if(ui.scroll){const y=b.node.worldPosition.y,target=y<0?-180:220;ui.scroll.scrollToOffset({x:0,y:Math.max(0,ui.scroll.getScrollOffset().y+target-y)},0);}},key);await waitFrames(p,2);b=await p.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key.startsWith(key)),key);}
  const v=p.viewportSize(),s=Math.min(v.width/1280,v.height/720),x=v.width/2+b.x*s,y=v.height/2-b.y*s;
  if(mobile)await p.touchscreen.tap(x,y);else{await p.mouse.move(x,y);await waitFrames(p,1);await p.mouse.click(x,y);}
 };
 const frozen=p=>p.evaluate(()=>{const s=window.__FUSHENG__.state;return JSON.stringify({clock:s.clock,needs:s.needs,money:s.money,focus:s.life?.focus,week:s.week,day:s.day,placed:s.placed,works:s.life?.works});});
 const shot=async(p,name)=>{await p.screenshot({path:'output/playwright/'+name+'.png'});report.screens.push(name);};
 const motion=async(p,kind,mobile,skip=false)=>{
  await screen(p,'Entry');await p.waitForFunction(()=>window.__FUSHENG__.ui.entry?.ready);
  const before=await frozen(p),meta=await p.evaluate(()=>{const e=window.__FUSHENG__.ui.entry;return {kind:e.kind,duration:e.timeline.duration,start:performance.now()-e.timeline.elapsed*1000};});
  check((mobile?'touch-':'mouse-')+kind+'-trigger',meta.kind===kind,meta);
  await p.keyboard.press('d');await p.keyboard.press('e');await p.keyboard.press('b');
  await p.waitForFunction(()=>window.__FUSHENG__.ui.entry?.timeline.progress>.37);
  check((mobile?'touch-':'mouse-')+kind+'-pauses-simulation',before===await frozen(p));
  await shot(p,'entry-'+kind+'-'+(mobile?'mobile':'desktop'));
  if(skip)await click(p,'entry.skip',mobile);
  await p.waitForFunction(()=>!window.__FUSHENG__.ui.entry);
  const elapsed=await p.evaluate(start=>(performance.now()-start)/1000,meta.start);report.durations.push({kind,mobile,skipped:skip,elapsed});
  if(kind==='door'&&!skip)check('door-approximately-two-seconds',elapsed>=1.8&&elapsed<=2.7,elapsed);
  await ready(p);check((mobile?'touch-':'mouse-')+kind+'-overlay-removed',await p.evaluate(()=>!window.__FUSHENG__.ui.root.getChildByName('EntryMotion')));
 };
 const reload=async(p,mobile)=>{await p.reload();await ready(p);await click(p,'ui.load',mobile);await screen(p,'SaveSelect');await ready(p);await click(p,'ui.load',mobile);await screen(p,'Entry');};
 try{
  let transfer;
  for(const mobile of [false,true]){
   const context=await page.context().browser().newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile,reducedMotion:'no-preference'});contexts.push(context);
   const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
   await p.goto('http://127.0.0.1:8088/'+(mobile?'web-mobile':'web-desktop')+'/?test=1&origin=normal'+(mobile?'&touch=1':''));await ready(p);
   await click(p,'ui.new',mobile);await ready(p);await click(p,'ui.begin',mobile);await screen(p,'Prologue');await ready(p);await click(p,'ui.skip',mobile);await screen(p,'Origin');await ready(p);await click(p,'ui.start',mobile);
   await motion(p,'fold',mobile,mobile);
   check('first-entry-recorded-'+mobile,await p.evaluate(()=>window.__FUSHENG__.state.introSeen===true&&window.__FUSHENG__.saves.load(1).state.introSeen===true));
   const saved=await p.evaluate(mobile=>{
    const d=window.__FUSHENG__,s=d.state;s.house=mobile?'rental':'flat';s.scene='home';s.player.x=430;s.player.y=600;s.clock=630;
    s.placed=[{furnitureId:'bookshelf',x:360,y:600},{furnitureId:'easel',x:560,y:600},{furnitureId:'lamp',x:840,y:600}];
    d.command({type:'Life',action:'paint',id:'window',style:'quiet'});const w=s.life.works.at(-1);d.command({type:'Life',action:'hang',id:w.id,slot:2});s.panel=null;s.life.keepsakes=[{id:'ye',name:'旧书签相框',displayed:true}];d.settings.speed=4;d.save();return JSON.stringify({placed:s.placed,works:s.life.works,keepsakes:s.life.keepsakes});
   },mobile);
   await reload(p,mobile);
   check('real-save-room-'+mobile,await p.evaluate(saved=>{const d=window.__FUSHENG__,e=d.ui.entry,s=e.room.state;return e.kind==='door'&&JSON.stringify({placed:s.placed,works:s.life.works,keepsakes:s.life.keepsakes})===saved;},saved));
   await p.waitForFunction(()=>window.__FUSHENG__.ui.entry?.ready);
   check('real-room-nodes-'+mobile,await p.evaluate(()=>{const e=window.__FUSHENG__.ui.entry,n=e.world.node.getChildByName('FurnitureLayer');return n.children.filter(n=>n.name.startsWith('Furniture_')).length===3&&n.children.some(n=>n.name.startsWith('Artwork_'))&&n.children.some(n=>n.name==='Keepsake_ye')&&n.getChildByName('Furniture_easel').position.x===560;}));
   await motion(p,'door',mobile);
   await reload(p,mobile);await p.waitForFunction(()=>window.__FUSHENG__.ui.entry?.ready);
   await p.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await p.evaluate(()=>window.__FUSHENG__.ui.entry.timeline.elapsed);await waitFrames(p,12);
   check('background-pauses-motion-'+mobile,await p.evaluate(before=>window.__FUSHENG__.ui.entry.timeline.elapsed===before,paused));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await p.keyboard.press('Escape');await p.waitForFunction(()=>!window.__FUSHENG__.ui.entry);await ready(p);
   check('keyboard-skip-restores-input-'+mobile,await p.evaluate(()=>!window.__FUSHENG__.ui.paused));
   const beforeWeek=await p.evaluate(()=>{const d=window.__FUSHENG__,s=d.state;s.day=7;s.clock=1260;s.life.help='done';s.life.commission={id:'lin',status:'done'};s.life.market.status='complete';d.ui.sim.endDay(false);return {week:s.week,money:s.money};});
   await screen(p,'DaySummary');await ready(p);await click(p,'ui.nextWeek',mobile);await screen(p,'WeekRecap');await ready(p);await click(p,'翻到下一周',mobile);await screen(p,'Entry');
   check('week-reward-once-'+mobile,await p.evaluate(before=>{const d=window.__FUSHENG__;return d.state.week===before.week+1&&d.state.money===before.money+6&&d.ui.entry.room.state.life.keepsakes.some(k=>k.id==='zhou');},beforeWeek));
   await motion(p,'book',mobile,mobile);await screen(p,'Journal');await ready(p);
   check('week-journal-after-animation-'+mobile,await p.evaluate(before=>window.__FUSHENG__.state.week===before.week+1&&window.__FUSHENG__.state.money===before.money+6,beforeWeek));
   await click(p,'ui.close',mobile);await screen(p,null);await ready(p);
   await p.evaluate(()=>{const d=window.__FUSHENG__;d.command({type:'Travel',scene:'park'});d.save();});await reload(p,mobile);
   check('outdoor-save-stays-outside-'+mobile,await p.evaluate(()=>window.__FUSHENG__.state.scene==='park'&&window.__FUSHENG__.ui.entry.room.state.scene==='home'));await p.keyboard.press('Space');await screen(p,null);await ready(p);
   check('outdoor-location-resumed-'+mobile,await p.evaluate(()=>window.__FUSHENG__.state.scene==='park'));
   const reduced=await p.evaluate(()=>{const d=window.__FUSHENG__;d.settings.reduceMotion=true;d.save();d.ui.load(1);return {duration:d.ui.entry.timeline.duration,reduced:d.ui.entry.timeline.reduced};});
   check('saved-reduced-motion-'+mobile,reduced.reduced&&reduced.duration===.18);await screen(p,null);await ready(p);
   await p.evaluate(()=>{const d=window.__FUSHENG__;d.settings.reduceMotion=false;d.save();d.ui.load(1);Object.defineProperty(d.ui.entry.world,'ready',{get:()=>false});});
   await waitFrames(p,6);check('skip-available-during-loading-'+mobile,await p.evaluate(()=>window.__FUSHENG__.screen==='Entry'&&window.__FUSHENG__.buttons.some(b=>b.key==='entry.skip')));await click(p,'entry.skip',mobile);await screen(p,null);await ready(p);
   transfer=await p.evaluate(()=>{const d=window.__FUSHENG__;d.save();return d.saves.export(d.saves.load(1));});
   await context.close();contexts.splice(contexts.indexOf(context),1);
  }
  const context=await page.context().browser().newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});contexts.push(context);const reduced=await context.newPage();reduced.on('pageerror',e=>report.errors.push(String(e)));await reduced.goto('http://127.0.0.1:8088/web-desktop/?test=1');await ready(reduced);
  const result=await reduced.evaluate(code=>{const d=window.__FUSHENG__;d.saves.import(code,1);d.ui.load(1);return {duration:d.ui.entry.timeline.duration,reduced:d.ui.entry.timeline.reduced};},transfer);check('system-reduced-motion',result.reduced&&result.duration===.18);await screen(reduced,null);await ready(reduced);
 }catch(error){report.errors.push(String(error));for(const c of contexts){const p=c.pages()[0];if(p)await p.screenshot({path:'output/playwright/entry-failure.png'}).catch(()=>{});}}
 finally{for(const c of contexts)await c.close();}
 report.checks.push({name:'no-runtime-errors',passed:report.errors.length===0,detail:report.errors});await page.evaluate(report=>window.__ENTRY_REPORT__=report,report);return report;
}
