import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyAndroidUIPolish } from './android-ui-polish-cases.mjs';

const serial=process.argv[2];if(!serial)throw Error('Pass the connected Android device serial.');
const adbPath=path.resolve('mobile/.tools/android-sdk/platform-tools/adb');
const adb=(...args)=>{const r=spawnSync(adbPath,['-s',serial,...args],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const output=path.resolve(process.env.FUSHENG_ANDROID_OUTPUT||'output/mobile-display-qa');await fs.mkdir(output,{recursive:true});
const report={checks:[],errors:[],screens:[],metrics:null,storage:null};
const check=(name,passed,detail)=>{report.checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name+': '+JSON.stringify(detail));};
const pid=adb('shell','pidof','com.fusheng.paperhouse').trim();if(!/^\d+$/.test(pid))throw Error('Expected one running Fusheng app process.');
const forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid).trim();
let browser,page,client,storageScript;
try{
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+forward);
 page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://localhost/'));
 if(!page)throw Error('No https://localhost/ game WebView in the Fusheng app.');
 client=await page.context().newCDPSession(page);
}catch(error){await browser?.close().catch(()=>{});adb('forward','--remove','tcp:'+forward);throw error;}
// Read Chromium's actual backing store, so memory-only QA writes cannot conceal a save change.
const storage=async()=>{const {entries}=await client.send('DOMStorage.getDOMStorageItems',{storageId:{securityOrigin:'https://localhost',isLocalStorage:true}});return Object.fromEntries(entries.filter(([k])=>/^fs\./.test(k)).sort(([a],[b])=>a.localeCompare(b)));};
const isolateStorage=()=>{
 if(window.__FUSHENG_QA_STORAGE_ISOLATED__)return;
 const proto=Storage.prototype,get=proto.getItem,set=proto.setItem,remove=proto.removeItem,clear=proto.clear;
 const memory=new Map(Object.keys(localStorage).filter(k=>/^fs\./.test(k)).map(k=>[k,get.call(localStorage,k)]));
 const isolated=(target,key)=>target===localStorage&&/^fs\./.test(String(key));
 proto.getItem=function(key){return isolated(this,key)?memory.get(String(key))??null:get.call(this,key);};
 proto.setItem=function(key,value){if(isolated(this,key))memory.set(String(key),String(value));else set.call(this,key,value);};
 proto.removeItem=function(key){if(isolated(this,key))memory.delete(String(key));else remove.call(this,key);};
 proto.clear=function(){if(this!==localStorage){clear.call(this);return;}memory.clear();for(const key of Object.keys(this))if(!/^fs\./.test(key))remove.call(this,key);};
 window.__FUSHENG_QA_STORAGE_ISOLATED__=true;
};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
let beforeHash;
try{const before=await storage();beforeHash=hash(before);report.storage={beforeHash,keyCount:Object.keys(before).length};}
catch(error){await client.detach().catch(()=>{});await browser.close().catch(()=>{});adb('forward','--remove','tcp:'+forward);throw error;}
const shot=async name=>{const file=path.join(output,name+'.png'),pixels=spawnSync(adbPath,['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16*1024*1024});if(pixels.status!==0)throw Error('Android screenshot failed');await fs.writeFile(file,pixels.stdout);report.screens.push(file);};
async function tap(point){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function tapScene(x,y){await tap(await page.evaluate(({x,y})=>{const f=__FUSHENG__.ui.sceneFrame,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+(f.x+(x-640)*f.scaleX)*s,y:innerHeight/2-(f.y+(360-y)*f.scaleY)*s};},{x,y}));}
const ready=()=>page.waitForFunction(()=>window.__FUSHENG__&&__FUSHENG__.artPending===0&&__FUSHENG__.frameCount>10&&!document.getElementById('fusheng-loading'),null,{timeout:45000});
try{
 storageScript=(await client.send('Page.addScriptToEvaluateOnNewDocument',{source:'('+isolateStorage.toString()+')()'})).identifier;
 await page.evaluate(isolateStorage);
 await page.goto('https://localhost/?test=1');await ready();
 // Exercise the actual game and WebView while routing test saves to memory.
 await page.evaluate(()=>{const ui=__FUSHENG__.ui,copy=new Map(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]));Object.assign(ui.platform.storage,{get:k=>copy.get(k)??null,set:(k,v)=>copy.set(k,v),setSync:(k,v)=>copy.set(k,v),remove:k=>copy.delete(k)});ui.platform.query.set('origin','normal');ui.debugStart();});
 await ready();
 check('jump-and-interact-buttons-removed',await page.evaluate(()=>__FUSHENG__.ui.touch.children.length===0));
 for(const house of ['rental','flat','villa']){
  await page.evaluate(house=>{const ui=__FUSHENG__.ui,s=ui.sim.state;s.house=house;s.placed=JSON.parse(JSON.stringify(ui.sim.house.placed));ui.sim.resetPlayer();},house);await page.waitForTimeout(200);await ready();
  for(const expanded of [true,false]){
  if(!expanded){await tap(await page.evaluate(()=>{const n=__FUSHENG__.ui.statusToggle.node,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+n.worldPosition.x*s,y:innerHeight/2-n.worldPosition.y*s};}));await page.waitForTimeout(200);}
  const geometry=await page.evaluate(()=>{const ui=__FUSHENG__.ui,f=ui.sceneFrame,v=__FUSHENG__.display.visible,safe=ui.platform.viewport.safe,r=f.room;const overlaps=[ui.hudTop,ui.statusTray,ui.needLabels[0].node.parent,ui.weeklyHint.node,ui.weeklyButton,...ui.touch.children].filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.UITransform').getBoundingBoxToWorld()).filter(b=>Math.min(r.right,b.x+b.width)>Math.max(r.left,b.x)+.1&&Math.min(r.top,b.y+b.height)>Math.max(r.bottom,b.y)+.1);const rendered=ui.root.parent.getChildByName('SceneView');return{expanded:ui.statusExpanded,leftAligned:Math.abs(r.left-(-v.width/2+safe.x+8))<.1,coverage:(r.right-r.left)*(r.top-r.bottom)/(safe.width*safe.height),renderMatches:Math.abs(rendered.position.y-f.y)<.1&&Math.abs(rendered.scale.x-f.scaleX)<.0001,room:r,overlapCount:overlaps.length,inside:r.left>=-v.width/2+safe.x&&r.right<=-v.width/2+safe.x+safe.width&&r.top<=-v.height/2+safe.y+safe.height&&r.bottom>=-v.height/2+safe.y};});
  check(house+'-'+expanded+'-room-completely-visible',geometry.inside,geometry);check(house+'-'+expanded+'-HUD-does-not-cover-room',geometry.overlapCount===0,geometry);
  check(house+'-'+expanded+'-fold-touch-updates-render',geometry.expanded===expanded&&geometry.leftAligned&&geometry.renderMatches,geometry);
  check(house+'-'+expanded+'-room-is-primary',geometry.coverage>.75,geometry);
  await shot('phone-house-'+house+(expanded?'-expanded':'-folded'));
  }
  await tap(await page.evaluate(()=>{const n=__FUSHENG__.ui.statusToggle.node,s=Math.min(innerWidth/1280,innerHeight/720);return{x:innerWidth/2+n.worldPosition.x*s,y:innerHeight/2-n.worldPosition.y*s};}));await page.waitForTimeout(200);check(house+'-restores-expanded',await page.evaluate(()=>__FUSHENG__.ui.statusExpanded));
 }
 await page.evaluate(()=>{const ui=__FUSHENG__.ui;ui.content.rules.event.chance=0;ui.sim.paused=false;ui.sim.dispatch({type:'Travel',scene:'street'});});await ready();await page.waitForTimeout(300);
 await page.waitForFunction(()=>__FUSHENG__.state.player.grounded);
 const swipe=await page.evaluate(()=>{const f=__FUSHENG__.ui.sceneFrame,s=Math.min(innerWidth/1280,innerHeight/720),p=__FUSHENG__.state.player;return{x:innerWidth/2+(f.x+(p.x-640)*f.scaleX)*s,y:innerHeight/2-(f.y+(360-p.y+20)*f.scaleY)*s};});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[swipe]});
 for(let i=1;i<=4;i++){await page.waitForTimeout(25);await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipe.x,y:swipe.y-i*16}]});}
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>__FUSHENG__.state.player.vy<0&&!__FUSHENG__.state.player.grounded);
 check('native-swipe-jump',true);await page.waitForFunction(()=>__FUSHENG__.state.player.grounded);
 await tapScene(440,618);await page.waitForFunction(()=>Math.abs(__FUSHENG__.state.player.x-440)<18,{},{timeout:20000});check('native-tap-ground-walks',true);
 await tapScene(720,550);await page.waitForFunction(()=>__FUSHENG__.state.scene==='book',{},{timeout:20000});await ready();check('native-tap-door-enters-bookshop',true);
 await tapScene(440,345);await page.waitForFunction(()=>__FUSHENG__.state.player.y<370&&Math.abs(__FUSHENG__.state.player.x-440)<20,{},{timeout:20000});check('native-tap-upstairs-climbs',true);
 report.metrics=await page.evaluate(()=>({display:__FUSHENG__.display,frameTimes:__FUSHENG__.frameTimes,canvas:{width:GameCanvas.width,height:GameCanvas.height},nativeButtonHidden:document.getElementById('fusheng-fullscreen').hidden}));
 check('native-canvas-at-device-density',report.metrics.canvas.width>=2607&&report.metrics.canvas.height===1200,report.metrics.canvas);
 check('native-browser-fullscreen-button-hidden',report.metrics.nativeButtonHidden);
 adb('shell','am','start','-W','-a','android.intent.action.MAIN','-c','android.intent.category.HOME');await page.waitForTimeout(300);adb('shell','am','start','-W','-n','com.fusheng.paperhouse/.MainActivity');await page.waitForTimeout(700);
 const windows=adb('shell','dumpsys','window');
 check('status-bar-hidden-after-resume',/InsetsSource id=.*type=statusBars[^\n]*visible=false/.test(windows));
 check('navigation-bar-hidden-after-resume',/InsetsSource id=.*type=navigationBars[^\n]*visible=false/.test(windows));
 if(process.env.FUSHENG_ANDROID_UI==='1')await verifyAndroidUIPolish({page,client,check,shot,report});
 report.storage.afterTestsHash=hash(await storage());check('original-saves-unchanged-during-tests',report.storage.afterTestsHash===beforeHash);
}catch(error){report.errors.push(String(error));}
finally{
 await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});
 try{
  if(storageScript)await client.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:storageScript});
  await page.goto('https://localhost/');await page.waitForFunction(()=>!document.getElementById('fusheng-loading'),null,{timeout:45000});
  report.storage.afterReloadHash=hash(await storage());
  check('original-saves-unchanged-after-reload',report.storage.afterReloadHash===beforeHash);
 }catch(error){report.errors.push('Cleanup/storage verification: '+String(error));}
 try{await client.detach();await browser.close();}catch(error){report.errors.push('CDP cleanup: '+String(error));}
 try{adb('forward','--remove','tcp:'+forward);}catch(error){report.errors.push('Forward cleanup: '+String(error));}
 report.passed=report.errors.length===0&&report.checks.every(c=>c.passed);
 await fs.writeFile(path.join(output,'phone-room-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,output}));if(!report.passed)process.exitCode=1;
}
