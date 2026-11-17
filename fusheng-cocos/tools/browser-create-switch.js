// Playwright CLI: run-code --filename tools/browser-create-switch.js
async (page) => {
 const report={checks:[],errors:[],traces:[]},contexts=[];
 const check=(name,passed,detail)=>report.checks.push({name,passed:!!passed,...(detail===undefined?{}:{detail})});
 const ready=async p=>{await p.waitForSelector('#fusheng-loading',{state:'detached'});await p.waitForFunction(()=>window.__FUSHENG__?.screen==='Create'&&window.__FUSHENG__.artPending===0&&(window.__FUSHENG__.ui.surface.children[0]?.getComponent('cc.UIOpacity')?.opacity??255)===255);const frame=await p.evaluate(()=>window.__FUSHENG__.frameCount);await p.waitForFunction(n=>window.__FUSHENG__.frameCount>n+3,frame);};
 const point=async(p,key,index=0)=>{const b=await p.evaluate(({key,index})=>window.__FUSHENG__.buttons.filter(b=>b.key===key)[index],{key,index});if(!b)throw Error('Missing button '+key);const v=p.viewportSize(),s=Math.min(v.width/1280,v.height/720);return {x:v.width/2+b.x*s,y:v.height/2-b.y*s};};
 const click=async(p,key,mobile=false,index=0)=>{const b=await point(p,key,index);if(mobile)await p.touchscreen.tap(b.x,b.y);else{await p.mouse.move(b.x,b.y);const frame=await p.evaluate(()=>window.__FUSHENG__.frameCount);await p.waitForFunction(n=>window.__FUSHENG__.frameCount>n,frame);await p.mouse.click(b.x,b.y);}};
 const beginTrace=async p=>p.evaluate(()=>{
  const ui=window.__FUSHENG__.ui;
  const state=()=>{const n=ui.surface.children[0],body=ui.preview?.node.getChildByName('InkCharacterSprite');return {id:n?.uuid,paper:n?.children[0]?.uuid,opacity:n?.getComponent('cc.UIOpacity')?.opacity??255,preview:!!body?.getComponent('cc.Sprite')?.spriteFrame,previewId:body?.uuid,scroll:ui.scroll?.uuid??null,offset:ui.scroll?.getScrollOffset().y??0};};
  window.__createTrace={before:state(),frames:[],done:false};
  const sample=()=>{const t=window.__createTrace;t.frames.push(state());if(t.frames.length<30)requestAnimationFrame(sample);else t.done=true;};requestAnimationFrame(sample);
 });
 const finishTrace=async(p,name)=>{await p.waitForFunction(()=>window.__createTrace.done);const trace=await p.evaluate(()=>window.__createTrace),before=trace.before;
  const detail={minOpacity:Math.min(...trace.frames.map(f=>f.opacity)),surfaceStable:trace.frames.every(f=>f.id===before.id&&f.paper===before.paper),previewStable:trace.frames.every(f=>f.preview&&f.previewId===before.previewId),scrollStable:trace.frames.every(f=>f.scroll===before.scroll&&Math.abs(f.offset-before.offset)<1)};
  report.traces.push({name,...detail});check(name,detail.minOpacity===255&&detail.surfaceStable&&detail.previewStable&&detail.scrollStable,detail);
 };
 const choose=async(p,key,name,mobile=false,index=0)=>{await ready(p);await beginTrace(p);await click(p,key,mobile,index);await finishTrace(p,name);await ready(p);};
 const selectionMatches=async(p,id)=>p.evaluate(id=>{
  const d=window.__FUSHENG__,ui=d.ui,c=d.content.characters.find(c=>c.id===id),card=ui.buttons.find(b=>b.key===c.name);
  const preview=ui.preview.node.getChildByName('InkCharacterSprite').getComponent('cc.Sprite')?.spriteFrame;
  const thumbnail=card.node.getComponentsInChildren('cc.Sprite').find(s=>s.node.name==='InkCharacterSprite')?.spriteFrame;
  return ui.selectedChar===id&&ui.previewLook===c&&preview===thumbnail&&ui.surface.getComponentsInChildren('cc.Label').some(l=>l.string===ui.i18n.plain(c.tag));
 },id);
 try{
  for(const mobile of [false,true]){
   const context=await page.context().browser().newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});contexts.push(context);
   const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
   const prefix=mobile?'touch':'mouse';await p.goto('http://127.0.0.1:8088/'+(mobile?'web-mobile':'web-desktop')+'/?test=1&screen=create'+(mobile?'&touch=1':''));await ready(p);
   for(const [key,id]of [['@characters.1.name','shuang'],['@characters.2.name','xin'],['@characters.3.name','liu'],['ui.male','kang'],['@characters.5.name','wu'],['ui.female','ding']]){
    await choose(p,key,prefix+'-'+id+'-no-flash',mobile);check(prefix+'-'+id+'-portrait-and-copy',await selectionMatches(p,id));
   }
   await choose(p,'ui.slot',prefix+'-save-slot-no-flash',mobile,2);check(prefix+'-selected-save-slot',await p.evaluate(()=>window.__FUSHENG__.ui.pendingSlot===3));
   await choose(p,'@characters.0.name',prefix+'-same-selection-no-flash',mobile);
   if(mobile){
    await p.evaluate(()=>window.__FUSHENG__.ui.scroll.scrollToOffset({x:0,y:100},0));await ready(p);
    await choose(p,'@characters.1.name','touch-scroll-position-preserved',true);check('touch-scrolled-selection',await selectionMatches(p,'shuang'));
   }else{
    await p.keyboard.press('Tab');await p.keyboard.press('Enter');check('keyboard-selection-works',await p.evaluate(()=>window.__FUSHENG__.ui.pendingSlot===2));
   }
   await beginTrace(p);for(const key of ['ui.male','ui.female','ui.male','@characters.5.name'])await click(p,key,mobile);await finishTrace(p,prefix+'-rapid-switch-no-flash');await ready(p);check(prefix+'-latest-portrait-wins',await selectionMatches(p,'wu'));
   await p.evaluate(()=>window.__FUSHENG__.settings.reduceMotion=true);await choose(p,'ui.female',prefix+'-reduced-motion-no-flash',mobile);
   await p.screenshot({path:'output/playwright/create-switch-'+prefix+'.png'});
   if(mobile){await p.evaluate(()=>window.__FUSHENG__.ui.scroll.scrollToOffset({x:0,y:190},0));await ready(p);}
   await click(p,'ui.begin',mobile);await p.waitForFunction(()=>window.__FUSHENG__.screen==='Prologue');check(prefix+'-start-keeps-character-and-slot',await p.evaluate(mobile=>window.__FUSHENG__.state.charId==='ding'&&window.__FUSHENG__.ui.slot===(mobile?3:2),mobile));
  }
 }catch(error){report.errors.push(String(error));}
 finally{for(const context of contexts)await context.close();}
 check('no-runtime-errors',report.errors.length===0,report.errors);await page.evaluate(report=>window.__CREATE_SWITCH_REPORT__=report,report);return report;
}
