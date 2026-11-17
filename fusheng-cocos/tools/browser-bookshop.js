async (page) => {
 const report={checks:[],errors:[],screens:[]},contexts=[];
 const check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name);};
 const ready=async p=>{await p.waitForSelector('#fusheng-loading',{state:'detached'});await p.waitForFunction(()=>window.__FUSHENG__?.frameCount>20&&window.__FUSHENG__.artPending===0);};
 const tap=async(p,x,y,mobile)=>{const v=p.viewportSize(),s=Math.min(v.width/1280,v.height/720);x=(v.width-1280*s)/2+x*s;y=(v.height-720*s)/2+y*s;if(mobile)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);};
 try{
  for(const mobile of [false,true]){
   const context=await page.context().browser().newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
   const kind=mobile?'mobile':'desktop';await p.goto('http://127.0.0.1:8088/'+(mobile?'web-mobile':'web-desktop')+'/?test=1&skip=1&scene=book&hour=10'+(mobile?'&touch=1':''));await ready(p);
   check(kind+'-two-floors-low-shelves-seating',await p.evaluate(()=>{const d=window.__FUSHENG__,s=d.content.scenes.book;return JSON.stringify(d.ui.sim.floorHeights)==='[620,350]'&&s.decor.filter(x=>x.kind==='shelf').every(x=>x.h<=145)&&s.decor.filter(x=>x.kind==='table').length===2&&s.decor.filter(x=>x.kind==='chair').length===4&&d.ui.root.parent.getChildByName('SceneView').getComponentsInChildren('cc.Graphics').some(g=>g.node.name==='BookshopStructure');}));
   await p.waitForTimeout(600);await p.screenshot({path:'output/playwright/bookshop-'+kind+'.png'});report.screens.push('bookshop-'+kind);
   // A real click on the upstairs reading table must route through the stairwell.
   const focus=await p.evaluate(()=>window.__FUSHENG__.state.life.focus);await tap(p,740,322,mobile);
   await p.waitForFunction(()=>window.__FUSHENG__.state.panel?.kind==='Reply',null,{timeout:20000});
   check(kind+'-walks-upstairs-and-reads-once',await p.evaluate(f=>{const s=window.__FUSHENG__.state;return s.player.y===350&&Math.abs(s.player.x-740)<16&&s.life.focus===f-1&&s.life.subjects.includes('book');},focus));
   await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__FUSHENG__.screen===null);
   await p.screenshot({path:'output/playwright/bookshop-upstairs-'+kind+'.png'});report.screens.push('bookshop-upstairs-'+kind);
   await p.evaluate(()=>window.__FUSHENG__.save());await p.goto('http://127.0.0.1:8088/'+(mobile?'web-mobile':'web-desktop')+'/?test=1'+(mobile?'&touch=1':''));await ready(p);
   await p.evaluate(()=>window.__FUSHENG__.ui.load(1));await p.waitForFunction(()=>window.__FUSHENG__.screen==='Entry');await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__FUSHENG__.screen===null);
   check(kind+'-reload-keeps-upstairs',await p.evaluate(()=>window.__FUSHENG__.state.scene==='book'&&window.__FUSHENG__.state.player.y===350));
   await tap(p,980,588,mobile);await p.waitForFunction(()=>window.__FUSHENG__.state.panel?.kind==='Neighbor',null,{timeout:16000});
   check(kind+'-walks-downstairs-to-neighbor',await p.evaluate(()=>window.__FUSHENG__.state.player.y===620&&window.__FUSHENG__.state.panel.id==='ye'));
   await p.keyboard.press('Escape');await p.waitForFunction(()=>window.__FUSHENG__.screen===null);
   await tap(p,120,515,mobile);await p.waitForFunction(()=>window.__FUSHENG__.state.scene==='street',null,{timeout:15000});check(kind+'-street-exit-works',true);
   await context.close();contexts.splice(contexts.indexOf(context),1);
  }
 }catch(e){report.errors.push(String(e));for(const c of contexts){const p=c.pages()[0];if(p)report.failureState=await p.evaluate(()=>({player:window.__FUSHENG__?.state.player,screen:window.__FUSHENG__?.screen,destination:window.__FUSHENG__?.ui.destination})).catch(()=>null);if(p)await p.screenshot({path:'output/playwright/bookshop-failure.png'}).catch(()=>{});}}
 finally{for(const c of contexts)await c.close();}
 report.checks.push({name:'no-runtime-errors',passed:report.errors.length===0,detail:report.errors});return report;
}
