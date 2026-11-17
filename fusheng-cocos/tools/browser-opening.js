// Native Cocos opening regression, run with Playwright CLI run-code --filename.
async (page) => {
 const report={checks:[],errors:[],traces:[]};let mobile=false,context;const host=page;
 const check=(name,passed,detail)=>report.checks.push({name,passed:!!passed,detail});
 const ready=async()=>{await page.waitForSelector('#fusheng-loading',{state:'detached'});await page.waitForFunction(()=>window.__FUSHENG__?.artPending===0);await page.waitForFunction(()=>window.__FUSHENG__.ui.root.getComponentsInChildren('cc.UIOpacity').every(c=>!c.node.activeInHierarchy||c.node.name==='PlacementGhost'||c.opacity===255));};
 const click=async key=>{
  report.stage=(mobile?'touch-':'mouse-')+key;
  let b=await page.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key===key),key);if(!b)throw Error('Missing '+key);
  if(key!=='entry.skip'&&await page.evaluate(()=>!!window.__FUSHENG__.ui.scroll))for(let i=0;i<6&&(b.y<-240||b.y>280);i++){
   await page.evaluate(key=>{const ui=window.__FUSHENG__.ui,b=ui.buttons.find(b=>b.key===key);if(ui.scroll){const y=b.node.worldPosition.y,target=y<0?-180:220;ui.scroll.scrollToOffset({x:0,y:Math.max(0,ui.scroll.getScrollOffset().y+target-y)},0);}},key);
   await page.waitForTimeout(50);b=await page.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key===key),key);
  }
  const v=page.viewportSize(),s=Math.min(v.width/1280,v.height/720);if(mobile)await page.touchscreen.tap(v.width/2+b.x*s,v.height/2-b.y*s);else await page.mouse.click(v.width/2+b.x*s,v.height/2-b.y*s);
 };
 const trace=async(key,name,stable=false)=>{
  name=(mobile?'touch-':'mouse-')+name;await ready();await page.evaluate(()=>{
   const ui=window.__FUSHENG__.ui;
   const sample=()=>{const n=ui.surface.children[0],cover=ui.pagePaper;return {page:ui.activePage,beat:ui.proBeat,root:n?.uuid,opacity:n?.getComponent('cc.UIOpacity')?.opacity??255,cover:!!cover?.activeInHierarchy&&(cover.getComponent('cc.UIOpacity')?.opacity??255)===255};};
   window.__openingTrace={before:sample(),frames:[],done:false};
   const tick=()=>{window.__openingTrace.frames.push(sample());if(window.__openingTrace.frames.length<35)requestAnimationFrame(tick);else window.__openingTrace.done=true;};requestAnimationFrame(tick);
  });
  await click(key);await page.waitForFunction(()=>window.__openingTrace.done);const t=await page.evaluate(()=>window.__openingTrace);
  const switched=t.frames.filter(f=>f.root!==t.before.root||f.page!==t.before.page);
  const exposed=t.frames.filter(f=>!f.cover&&f.opacity<255).length;
  report.traces.push({name,exposed,minimumOpacity:Math.min(...t.frames.map(f=>f.opacity)),changedFrames:switched.length});
  check(name+'-opaque-paper',exposed===0,{exposed});
  if(stable){check(name+'-stable-scaffold',t.frames.every(f=>f.root===t.before.root));check(name+'-single-advance',t.frames.at(-1).beat===t.before.beat+1);}
 };
 try{
  for(mobile of [false,true]){context=await host.context().browser().newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:8088/'+(mobile?'web-mobile':'web-desktop')+'/?test=1&origin=normal'+(mobile?'&touch=1':''));await page.waitForFunction(()=>window.__FUSHENG__?.frameCount>10);await ready();
  await trace('ui.new','new-game');await trace('ui.begin','begin-prologue');
  for(let i=1;i<=5;i++)await trace('ui.next','narrative-'+i,true);await page.screenshot({path:'output/playwright/opening-'+(mobile?'mobile':'desktop')+'.png'});
  await trace('ui.next','origin-confirmation');await ready();await click('ui.start');await page.waitForFunction(()=>window.__FUSHENG__.screen==='Entry');await click('entry.skip');await page.waitForFunction(()=>window.__FUSHENG__.screen===null);
  check((mobile?'touch':'mouse')+'-opening-completes',await page.evaluate(()=>window.__FUSHENG__.state.introSeen===true));await context.close();context=null;}
 }catch(e){report.errors.push(String(e));await page.screenshot({path:'output/playwright/opening-failure.png'}).catch(()=>{});}finally{if(context)await context.close();}
 check('no-runtime-errors',report.errors.length===0,report.errors);return report;
}
