async page=>{
 const report={checks:[],screens:[],errors:[]};page.on('pageerror',error=>report.errors.push(String(error)));
 const ready=async()=>{await page.waitForFunction(()=>window.__FUSHENG__?.frameCount>10&&window.__FUSHENG__.artPending===0);await page.waitForSelector('#fusheng-loading',{state:'detached'});await page.waitForTimeout(200);};
 const click=async key=>{const b=await page.evaluate(key=>window.__FUSHENG__.buttons.find(b=>b.key===key),key);if(!b)throw Error('Missing '+key);const v=page.viewportSize(),s=Math.min(v.width/1280,v.height/720);await page.mouse.click(v.width/2+b.x*s,v.height/2-b.y*s);await page.waitForTimeout(150);};
 const shot=async name=>{await ready();await page.waitForFunction(()=>window.__FUSHENG__.ui.toastTTL<=0);await page.screenshot({path:'output/playwright/life-course/'+name+'.png'});report.screens.push(name);};
 try{await page.setViewportSize({width:844,height:390});for(const [age,stage]of [[13,'teen'],[18,'youth'],[24,'adult'],[30,'midlife']]){
  await page.goto('http://127.0.0.1:8921/web-mobile/?test=1&touch=1&skip=1&origin=normal&age='+age);await ready();await page.evaluate(()=>{const d=window.__FUSHENG__;d.ui.sim.dispatch({type:'Course',action:'open'});});await ready();await shot('stage-'+stage+'-choice');await click(await page.evaluate(()=>window.__FUSHENG__.buttons[0].key));await click('就这样开始吧');await click('ui.replyContinue');await page.evaluate(()=>window.__FUSHENG__.ui.sim.dispatch({type:'Course',action:'open'}));await ready();const valid=await page.evaluate(stage=>window.__FUSHENG__.ui.sim.course.stage.id===stage&&window.__FUSHENG__.screen==='LifeCourse',stage);report.checks.push({name:stage+'-stage-visible',passed:valid});if(!valid)throw Error('Wrong stage '+stage);await shot('stage-'+stage+'-activities');
 }
 await page.evaluate(()=>window.__FUSHENG__.ui.open('Settings'));await shot('phone-settings');await click('ui.close');await page.evaluate(()=>window.__FUSHENG__.ui.open('Help'));await shot('phone-help');await page.evaluate(()=>window.__FUSHENG__.ui.renderSaveSelect());await shot('phone-save-select');
 }catch(e){report.failure=String(e);}return report;
}
