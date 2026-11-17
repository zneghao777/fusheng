async page => {
 const report={checks:[],errors:[],failedRequests:[],performance:{},screens:[]};
 const check=(name,passed,detail)=>{report.checks.push({name,passed,detail});if(!passed)throw new Error(name+': '+JSON.stringify(detail));};
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 const wait=ms=>page.waitForTimeout(ms);
 const load=async(query='',width=1280,height=720,target='web-mobile')=>{await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8088/'+target+'/?test=1'+query);await page.waitForFunction(()=>!!window.__FUSHENG__);await wait(350);};
 const info=()=>page.evaluate(()=>({screen:window.__FUSHENG__.screen,state:window.__FUSHENG__.state,buttons:window.__FUSHENG__.buttons}));
 const click=async(key)=>{
  let b=await page.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key===key),key);if(!b)throw Error('Missing button '+key);
  const size=page.viewportSize(),scale=Math.min(size.width/1280,size.height/720);
  let x=size.width/2+b.x*scale,y=size.height/2-b.y*scale;
  for(let tries=0;tries<18&&(y>size.height/2+230*scale||y<size.height/2-180*scale);tries++){
   if(['ui.new','ui.begin','ui.back','ui.male','ui.female'].includes(key)||key.startsWith('@characters'))break;
   await page.mouse.move(size.width/2,size.height*.6);await page.mouse.wheel(0,y>size.height/2+230*scale?350:-350);await wait(280);b=await page.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key===key),key);x=size.width/2+b.x*scale;y=size.height/2-b.y*scale;
  }
  await page.mouse.click(x,y);await wait(300);
 };
 const shot=async name=>{await page.screenshot({path:'output/playwright/'+name+'.png'});report.screens.push(name);};
 try {
  await load();await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('fs.'))localStorage.removeItem(k);});
  check('native-title',(await info()).screen==='Title');await shot('desktop-title');await click('ui.new');check('native-create',(await info()).screen==='Create');await click('ui.male');await click('@characters.5.name');await shot('desktop-create');await click('ui.begin');
  check('six-beat-prologue',(await info()).screen==='Prologue');for(let i=0;i<6;i++){await page.keyboard.press('Space');await wait(120);}await wait(350);check('origin-after-prologue',(await info()).screen==='Origin');check('selected-character',(await info()).state.charId==='wu');await click('ui.start');check('origin-continue',(await info()).screen===null);
  const before=(await info()).state.player.x;await page.keyboard.down('d');await wait(700);await page.keyboard.up('d');const after=(await info()).state.player.x;check('keyboard-walk',after>before+80,{before,after});
  await page.keyboard.press('Space');await wait(100);check('keyboard-jump',(await info()).state.player.y<600);await wait(700);
  await page.keyboard.press('Escape');await wait(250);check('keyboard-pause',(await info()).screen==='Pause');await shot('desktop-pause');await click('ui.save');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fs.slot.1')));check('manual-save-v3',saved.schema===3&&saved.revision>=2);
  await click('ui.continue');await page.keyboard.press('c');await wait(300);check('keyboard-character',(await info()).screen==='Character');await shot('desktop-character');await page.keyboard.press('Escape');await page.keyboard.press('h');await wait(300);check('keyboard-help',(await info()).screen==='Help');await shot('desktop-help');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__FUSHENG__.ui.open('Pause'));await wait(300);await click('ui.export');check('native-code-panel',(await info()).screen==='Code');await shot('desktop-export');check('export-code',await page.evaluate(()=>window.__FUSHENG__.ui.code.startsWith('FS1.')));await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await load('&skip=1&origin=normal&house=villa&hour=10');await shot('desktop-villa');await page.mouse.click(640,650);
  const cdp=await page.context().newCDPSession(page);
  const tap=async(x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await wait(90);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(180);};
  // Reach the door by keyboard, then use E to travel.
  await page.keyboard.down('d');await wait(3800);await page.keyboard.up('d');await page.keyboard.press('e');await wait(250);check('door-keyboard-travel',(await info()).state.scene==='street');
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await load('&skip=1&origin=normal&house=rental&hour=7&touch=1',844,390);await shot('mobile-844-home');let initial=(await info()).state.player.x;const scale=390/720;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:844/2-325*scale,y:390/2+240*scale}]});await wait(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('touch-walk',(await info()).state.player.x>initial+80);await tap(844/2+370*scale,390/2+280*scale);check('touch-jump',(await info()).state.player.y<600);
  const controls=await page.evaluate(()=>window.__FUSHENG__.ui.touch.children.map(n=>({name:n.name,w:n.getComponent('cc.UITransform').width,h:n.getComponent('cc.UITransform').height})));check('touch-targets-44px',controls.every(c=>c.w*scale>=44&&c.h*scale>=44),controls);
  await tap(844/2+505*scale,390/2-310*scale);check('touch-menu',(await info()).screen==='Pause');await shot('mobile-844-pause');await page.mouse.move(422,270);await page.mouse.wheel(0,1300);await wait(400);await shot('mobile-844-panel-scroll');
  await load('&skip=1&origin=normal&touch=1&hour=7',667,375);await shot('mobile-667-home');const minScale=375/720;check('small-phone-button-size',100*minScale>=44);await tap(667/2+505*minScale,375/2-310*minScale);check('small-phone-menu',(await info()).screen==='Pause');await shot('mobile-667-pause');
  await load('&touch=1',390,844);await shot('mobile-390-rotate');check('portrait-prompt',await page.evaluate(()=>window.__FUSHENG__.ui.rotate.active));await tap(195,844/2+200*(390/1280));check('portrait-opt-in',await page.evaluate(()=>!window.__FUSHENG__.ui.rotate.active));await shot('mobile-390-opt-in');
  await load('&skip=1&origin=normal&house=flat&hour=10',1280,720,'web-desktop');await shot('desktop-build-target');const canvas=await page.locator('canvas').boundingBox();check('desktop-canvas-1280x720',canvas.width===1280&&canvas.height===720,canvas);
  const panels=['origin','summary','birthday','event','twist','story','legacy','build','prologue'];
  for(const panel of panels){await load('&skip=1&origin=normal&panel='+panel,1280,720);await shot('panel-'+panel);check('panel-'+panel,(await info()).screen!==null);}
  // A real 7 -> 30 lifecycle through commands, selecting the Cocos panel options.
  await load('&skip=1&origin=normal&hour=7');const cycle=await page.evaluate(()=>{const d=window.__FUSHENG__,seen=new Set(),trace=[];for(let day=0;day<168;day++){d.command({type:'Sleep'});let guard=0;while(d.state.panel&&d.state.panel.kind!=='Legacy'&&guard++<8){seen.add(d.state.panel.kind);const n=d.ui.sim.narrative();d.command(n?{type:'ChooseOption',id:n.options[0].id}:{type:'Continue'});}if(d.state.panel?.kind==='Legacy')break;}const before={age:d.state.age,gen:d.state.gen,panel:d.state.panel?.kind};d.command({type:'Legacy',creedId:'eat'});return {before,after:{age:d.state.age,gen:d.state.gen,creed:d.state.creedId},seen:Array.from(seen)};});check('browser-7-to-30-and-inherit',cycle.before.age===30&&cycle.before.panel==='Legacy'&&cycle.after.age===7&&cycle.after.gen===2&&cycle.after.creed==='eat',cycle);await wait(300);await shot('inheritance-reply');
  const measure=()=>page.evaluate(async()=>{const d=window.__FUSHENG__,start=performance.now(),before=d.frameCount;await new Promise(resolve=>setTimeout(resolve,3500));const elapsed=performance.now()-start;return {fps:(d.frameCount-before)*1000/elapsed,frames:d.frameCount-before,elapsed};});
  await load('&skip=1&origin=normal&hour=7&selftest=1',1280,720,'web-desktop');check('runtime-selftest',await page.evaluate(()=>window.__FUSHENG__.selftest.every(x=>x.passed)));const desktop=await measure();report.performance.desktop=desktop;check('desktop-fps',desktop.fps>=55,desktop);
  await load('&skip=1&origin=normal&hour=7&touch=1',667,375);const mobile=await measure();report.performance.mobileEmulation=mobile;check('mobile-emulation-fps',mobile.fps>=30,mobile);
  check('no-page-or-console-errors',report.errors.length===0,report.errors);check('no-failed-asset-requests',report.failedRequests.length===0,report.failedRequests);
 }catch(error){report.failure=String(error);}
 return report;
}
