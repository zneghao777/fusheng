async (page) => {
 const report={checks:[],errors:[],screens:[],stage:"start"};
 const assert=(name,ok,detail)=>{report.checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));};
 const observe=p=>p.on('pageerror',e=>report.errors.push(String(e)));
 observe(page);
 const ready=async p=>{await p.waitForSelector('#fusheng-loading',{state:'detached'});const frame=await p.evaluate(()=>window.__FUSHENG__?.frameCount??0);await p.waitForFunction(frame=>(window.__FUSHENG__?.frameCount??0)>frame+4,frame);await p.waitForFunction(()=>window.__FUSHENG__?.frameCount>20&&window.__FUSHENG__.artPending===0);await p.evaluate(()=>window.__FUSHENG__.settings.reduceMotion=true);await p.waitForFunction(()=>window.__FUSHENG__.ui.root.getComponentsInChildren('cc.UIOpacity').every(c=>!c.node.activeInHierarchy||c.node.name==='PlacementGhost'||c.opacity===255));};
 const xy=(p,x,y)=>{const v=p.viewportSize(),scale=Math.min(v.width/1280,v.height/720);return {x:v.width/2+(x-640)*scale,y:v.height/2+(y-360)*scale};};
 const tap=async(p,x,y,mobile=false)=>{const pt=xy(p,x,y);if(mobile)await p.touchscreen.tap(pt.x,pt.y);else{await p.mouse.move(pt.x,pt.y);const f=await p.evaluate(()=>window.__FUSHENG__.frameCount);await p.waitForFunction(f=>window.__FUSHENG__.frameCount>f+1,f);await p.mouse.click(pt.x,pt.y);}};
 const key=async(p,prefix,mobile=false)=>{report.stage='key '+prefix;
  await p.waitForFunction(prefix=>window.__FUSHENG__.buttons.some(b=>b.key.startsWith(prefix)),prefix);
  let b=await p.evaluate(prefix=>window.__FUSHENG__.buttons.find(b=>b.key.startsWith(prefix)),prefix);
  for(let i=0;i<8&&(b.y< -240||b.y>265);i++){
   await p.evaluate(prefix=>{const d=window.__FUSHENG__,b=d.ui.buttons.find(b=>b.key.startsWith(prefix));d.ui.scroll?.scrollToOffset({x:0,y:Math.max(0,-b.node.position.y-160)},0);},prefix);
   b=await p.evaluate(prefix=>window.__FUSHENG__.buttons.find(b=>b.key.startsWith(prefix)),prefix);
  }
  await tap(p,b.x+640,360-b.y,mobile);await ready(p);
 };
 const screen=async(p,kind)=>p.waitForFunction(kind=>window.__FUSHENG__.screen===kind,kind);
 const close=async p=>{if(await p.evaluate(()=>!!window.__FUSHENG__.screen)){await p.keyboard.press('Escape');await screen(p,null);await ready(p);}};
 const command=async(p,c)=>p.evaluate(c=>window.__FUSHENG__.command(c),c);
 const travel=async scene=>{await close(page);await command(page,{type:'Travel',scene});await ready(page);assert('travel-'+scene,await page.evaluate(scene=>window.__FUSHENG__.state.scene===scene,scene));};
 const prop=async(id,kind)=>{
  const p=await page.evaluate(id=>{const d=window.__FUSHENG__;return d.content.scenes[d.state.scene].props.find(p=>p.id===id);},id);
  await tap(page,p.x,p.y-p.h/2);await screen(page,kind);await ready(page);
 };
 const npc=async()=>{
  await close(page);await page.evaluate(()=>{const d=window.__FUSHENG__;while(d.state.clock<550)d.ui.sim.tick();});
  const p=await page.evaluate(()=>({x:window.__FUSHENG__.content.npc.x,y:window.__FUSHENG__.ui.sim.house.f1}));await tap(page,p.x,p.y-42);await screen(page,'Neighbor');
 };
 const paint=async(subject,style)=>{
  await travel('home');const p=await page.evaluate(()=>{const d=window.__FUSHENG__,f=d.state.placed.find(f=>f.furnitureId==='easel');return {...f,h:d.content.furniture.easel.h};});
  await tap(page,p.x,p.y-p.h/2);await screen(page,'Compose');await key(page,'画《'+subject+'》');await key(page,style+' ·');await screen(page,'Artwork');await ready(page);
  return await page.evaluate(()=>window.__FUSHENG__.state.life.works.at(-1).id);
 };
 const rest=async()=>{
  await close(page);await page.keyboard.press('Escape');await screen(page,'Pause');await key(page,'ui.sleep');if(await page.evaluate(()=>window.__FUSHENG__.screen==='RestConfirm'))await key(page,'今天就休息');
  await screen(page,'DaySummary');await ready(page);const last=await page.evaluate(()=>window.__FUSHENG__.state.day===7);await key(page,last?'ui.nextWeek':'ui.nextDay');
  if(!last)await screen(page,null);else await screen(page,'WeekRecap');
 };
 const shot=async(p,name)=>{await ready(p);await p.screenshot({path:'output/playwright/'+name+'.png'});report.screens.push(name);};
 try {
  report.stage='initial-load';await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:8088/web-desktop/?test=1&origin=normal');await ready(page);await page.evaluate(()=>{for(const slot of [1,2,3])window.__FUSHENG__.saves.delete(slot);});report.stage='reload';await page.reload();await ready(page);
  await key(page,'ui.new');await key(page,'ui.begin');await screen(page,'Prologue');await key(page,'ui.skip');await screen(page,'Origin');await key(page,'ui.start');await screen(page,null);
  assert('new-game-at-eighteen',await page.evaluate(()=>window.__FUSHENG__.state.age===18));
  await page.keyboard.press('j');await screen(page,'Journal');await shot(page,'week-journal-desktop');await close(page);
  await travel('street');await prop('street_notice','Journal');await close(page);await prop('street_sketch','Reply');await close(page);
  await travel('store');await prop('store_3','Neighbor');await key(page,'接取「便利店');await close(page);
  const commission=await paint('旧巷灯火','暖色');await shot(page,'week-artwork-desktop');await close(page);await npc();await key(page,'认真聊一会儿');await close(page);await npc();await key(page,'答应帮忙备摊');await close(page);
  assert('day-one-choices-use-three-focus',await page.evaluate(()=>window.__FUSHENG__.state.life.focus===0));
  await rest();
  const wall=await paint('窗边日常','留白');await key(page,'挂在作品墙第1格');await close(page);await npc();await key(page,'现在一起备摊');await close(page);
  assert('help-promise-fulfilled',await page.evaluate(()=>window.__FUSHENG__.state.life.help==='done'));
  await rest();await travel('store');await prop('store_3','Neighbor');await key(page,'交付约好的画');await close(page);
  assert('commission-delivered-on-day-three',await page.evaluate(id=>window.__FUSHENG__.state.life.commission.status==='done'&&window.__FUSHENG__.state.life.works.find(w=>w.id===id).status==='gifted',commission));
  await rest();await travel('book');await prop('book_1','Reply');await close(page);const gift=await paint('旧书与信','水墨');await close(page);await travel('book');await command(page,{type:'Life',action:'collection'});await screen(page,'Collection');await key(page,'《旧书与信》 ·');await key(page,'当面送给叶婆婆');await close(page);
  assert('gift-produces-memory-and-keepsake',await page.evaluate(id=>{const l=window.__FUSHENG__.state.life;return l.works.find(w=>w.id===id).status==='gifted'&&l.neighbors.ye.memories.length>0&&l.keepsakes.some(k=>k.id==='ye');},gift));
  await rest();await paint('街坊肖像','留白');await key(page,'留到周日市集');await close(page);await paint('旧巷灯火','暖色');await key(page,'留到周日市集');await close(page);
  await page.keyboard.press('b');await screen(page,'Build');await key(page,'台灯');const placement=await page.evaluate(()=>{const d=window.__FUSHENG__;for(const y of d.ui.sim.house.floors)for(let x=150;x<900;x+=20){const p=d.ui.sim.canPlace('lamp',x,y);if(p.ok)return {...p,count:d.state.placed.length};}});await tap(page,placement.x,placement.y-2);await page.waitForFunction(n=>window.__FUSHENG__.state.placed.length===n+1,placement.count);await page.keyboard.press('b');await ready(page);
  assert('furniture-layout-works-with-collection',true);
  await rest();await paint('旧书与信','水墨');await key(page,'留到周日市集');await close(page);await rest();
  await travel('street');await prop('street_market','Market');await key(page,'改成珍藏价');await shot(page,'week-market-desktop');
  await key(page,'拿出《旧巷灯火》');await key(page,'拿出《旧书与信》');await key(page,'拿出《街坊肖像》');
  assert('market-sells-three-distinct-works',await page.evaluate(()=>{const m=window.__FUSHENG__.state.life.market;return m.status==='complete'&&m.sold===3&&m.earned>0;}));
  await shot(page,'week-market-result-desktop');await close(page);await rest();await shot(page,'week-recap-desktop');await key(page,'翻到下一周');await screen(page,'Journal');await shot(page,'week-followup-desktop');
  assert('next-week-remembers-help-gifts-and-commission',await page.evaluate(()=>{const d=window.__FUSHENG__,l=d.state.life;return d.state.week===2&&l.followup.includes('旧台灯')&&l.followup.includes('6文')&&l.neighbors.ye.memories.length>0;}));
  await close(page);await shot(page,'week-room-desktop');
  assert('wall-and-furniture-survive',await page.evaluate(id=>{const d=window.__FUSHENG__;return d.state.life.works.find(w=>w.id===id).status==='displayed'&&d.state.placed.some(f=>f.furnitureId==='lamp');},wall));
  const code=await page.evaluate(()=>{const d=window.__FUSHENG__;d.save();return d.saves.export(d.saves.load(d.ui.slot));});
  const context=await page.context().browser().newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});const mobile=await context.newPage();observe(mobile);
  await mobile.goto('http://127.0.0.1:8088/web-mobile/?test=1&touch=1');await ready(mobile);await mobile.evaluate(code=>window.__FUSHENG__.saves.import(code,1),code);await mobile.reload();await ready(mobile);await key(mobile,'ui.load',true);await key(mobile,'ui.load',true);await screen(mobile,null);
  await tap(mobile,1058,36,true);await screen(mobile,'Journal');await shot(mobile,'week-journal-mobile');await key(mobile,'打开画夹与作品墙',true);await key(mobile,'《窗边日常》 ·',true);await screen(mobile,'Artwork');await shot(mobile,'week-artwork-mobile');await key(mobile,'挂在作品墙第2格',true);await key(mobile,'ui.close',true);await shot(mobile,'week-room-mobile');
  assert('mobile-touch-loads-week-two-and-moves-wall-art',await mobile.evaluate(id=>{const d=window.__FUSHENG__;return d.state.week===2&&d.state.life.works.find(w=>w.id===id).slot===1;},wall));
  await context.close();assert('no-runtime-errors',report.errors.length===0,report.errors);
 }catch(error){report.errors.push(String(error));await page.screenshot({path:'output/playwright/week-failure.png'});}
 await page.evaluate(report=>{window.__WEEK_REPORT__=report;},report);return report;
}
