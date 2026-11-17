async page => {
 const report={checks:[],screens:[],clicks:[],errors:[],stage:'load',boundary:'844×390 browser emulation; UI controls are clicked at real screen coordinates. Later years use legal simulation commands.'};
 const base='http://127.0.0.1:8919/web-mobile/?test=1&touch=1&skip=1&origin=normal';
 const check=(name,ok,detail)=>{report.checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));};
 page.on('pageerror',error=>report.errors.push(String(error)));
 const ready=async()=>{
  await page.waitForSelector('#fusheng-loading',{state:'detached'});
  await page.waitForFunction(()=>window.__FUSHENG__?.frameCount>10&&window.__FUSHENG__.artPending===0);
  await page.waitForTimeout(100);
 };
 const screen=async kind=>{await page.waitForFunction(kind=>window.__FUSHENG__.screen===kind,kind,{timeout:15000});await ready();};
 const text=async(key,params={})=>page.evaluate(({key,params})=>{const d=window.__FUSHENG__;return (d.content.i18n[key]??key).replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??'{'+name+'}'));},{key,params});
 const rawClick=async button=>{
  const viewport=page.viewportSize(),scale=Math.min(viewport.width/1280,viewport.height/720);
  const x=viewport.width/2+button.x*scale,y=viewport.height/2-button.y*scale;
  check('visible-coordinate-'+report.clicks.length,Math.abs(button.x)+button.width/2<=640.1&&Math.abs(button.y)+button.height/2<=360.1&&x>=0&&x<=viewport.width&&y>=0&&y<=viewport.height,{key:button.key,x,y,width:button.width*scale,height:button.height*scale});
  report.clicks.push({stage:report.stage,key:button.key,x,y});
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  await ready();
 };
 const visible=async key=>page.evaluate(key=>window.__FUSHENG__.buttons.find(button=>button.key===key),key);
 const firstPage=async()=>{for(let i=0;i<16;i++){const previous=await visible('ui.pagePrevious');if(!previous)return;await rawClick(previous);}throw Error('Pagination did not return to its first page');};
 const click=async key=>{
  report.stage='click '+key;
  let button=await visible(key);
  if(!button){await firstPage();for(let i=0;i<16;i++){button=await visible(key);if(button)break;const next=await visible('ui.pageNext');if(!next)break;await rawClick(next);}}
  if(!button)throw Error('Missing reachable button '+key+'; visible='+JSON.stringify(await page.evaluate(()=>window.__FUSHENG__.buttons.map(button=>button.key))));
  await rawClick(button);
 };
 const clickText=async(key,params={})=>click(await text('life.ui.'+key,params));
 const allActions=async()=>{
  const keys=[];await firstPage();
  for(let i=0;i<16;i++){
   keys.push(...await page.evaluate(()=>window.__FUSHENG__.buttons.map(button=>button.key)));
   const next=await visible('ui.pageNext');if(!next){await firstPage();return [...new Set(keys)];}await rawClick(next);
  }
  throw Error('Pagination exceeded sixteen pages');
 };
 const audit=async name=>{
  const buttons=await page.evaluate(()=>window.__FUSHENG__.ui.buttons.filter(button=>button.node.isValid&&button.node.activeInHierarchy).map(button=>{
   let inScroll=false;for(let node=button.node.parent;node;node=node.parent)if(node.getComponent('cc.ScrollView'))inScroll=true;
   const tr=button.node.getComponent('cc.UITransform'),position=button.node.worldPosition,scale=button.node.worldScale;
   return {key:button.key,text:button.label.string,x:position.x,y:position.y,width:tr.width*scale.x,height:tr.height*scale.y,inScroll};
  }));
  const fixed=buttons.filter(button=>!button.inScroll),scrolling=buttons.filter(button=>button.inScroll);
  check(name+'-scrolling-buttons-are-artwork',scrolling.every(button=>button.key.startsWith('artwork.inspect.')),scrolling);
  check(name+'-fixed-visible-actions',fixed.length>0&&fixed.every(button=>Math.abs(button.x)+button.width/2<=640.1&&Math.abs(button.y)+button.height/2<=360.1),fixed);
 };
 const shot=async name=>{await ready();await audit(name);const path='output/playwright/life-course/journey-'+name+'.png';await page.screenshot({path});report.screens.push(path);};
 const dispatch=async command=>{
  report.stage='command '+command.type+(command.action?'.'+command.action:'');
  await page.evaluate(command=>{const ui=window.__FUSHENG__.ui;ui.sim.paused=false;ui.sim.dispatch(command);ui.lastPanel='';},command);await ready();
 };
 const close=async()=>{const kind=await page.evaluate(()=>window.__FUSHENG__.screen);if(kind===null)return;await click('ui.close');await screen(null);};
 const travel=async scene=>{await close();await dispatch({type:'Travel',scene});check('arrived-'+scene,await page.evaluate(scene=>window.__FUSHENG__.state.scene===scene,scene));};
 const openNeighbor=async id=>{await dispatch({type:'Life',action:'neighbor',id});await screen('Neighbor');};
 const compose=async(subjectKey,styleKey)=>{
  await travel('home');await dispatch({type:'Life',action:'compose'});await screen('Compose');
  await clickText('compose.subject',{name:await text(subjectKey)});
  await clickText('compose.paintStyle',{style:await text(styleKey)});await screen('Artwork');
  return page.evaluate(()=>window.__FUSHENG__.state.life.works.at(-1).id);
 };
 const rest=async()=>{
  await close();const day=await page.evaluate(()=>window.__FUSHENG__.state.day);
  await dispatch({type:'Sleep'});
  if(await page.evaluate(()=>window.__FUSHENG__.screen==='RestConfirm'))await clickText('rest.sleep');
  await screen('DaySummary');await click(day===7?'ui.nextWeek':'ui.nextDay');
  await screen(day===7?'WeekRecap':null);
 };
 try{
  await page.setViewportSize({width:844,height:390});await page.goto(base);await ready();
  await page.evaluate(()=>{window.__FUSHENG__.settings.reduceMotion=true;window.__FUSHENG__.content.rules.event.chance=0;});
  report.input=await page.evaluate(()=>({maxTouchPoints:navigator.maxTouchPoints,touchLayout:window.__FUSHENG__.ui.platform.touch,viewport:{width:innerWidth,height:innerHeight}}));
  check('touch-layout-at-seven',await page.evaluate(()=>window.__FUSHENG__.state.age===7&&window.__FUSHENG__.ui.platform.touch),report.input);

  await dispatch({type:'Course',action:'open'});await screen('LifeChoice');
  const firstChoice=await page.evaluate(()=>window.__FUSHENG__.ui.sim.course.milestone.choices[0]);
  await click(firstChoice.label);await shot('first-choice-detail');await clickText('choice.confirm');await screen('Reply');await click('ui.replyContinue');await screen(null);
  await dispatch({type:'Life',action:'journal'});await screen('Journal');await shot('journal');
  await clickText('journal.course');await screen('LifeCourse');await shot('daily-arrangements');
  const activity=await page.evaluate(()=>window.__FUSHENG__.ui.sim.course.activities[0]);await click(activity.label);await shot('activity-detail');
  const beforeActivity=await page.evaluate(()=>({focus:window.__FUSHENG__.state.life.focus,learning:window.__FUSHENG__.ui.sim.course.data.metrics.learning}));
  await clickText('course.startActivity');await screen('Reply');await shot('activity-result');
  check('activity-uses-focus-and-gains-learning',await page.evaluate(before=>{const d=window.__FUSHENG__;return d.state.life.focus===before.focus-1&&d.ui.sim.course.data.metrics.learning>before.learning;},beforeActivity));
  await click('ui.replyContinue');await screen(null);

  const wallId=await compose('week.copy.0ca678346f42','week.copy.1a407ccbb6dc');await shot('created-artwork');
  await clickText('artwork.transfer');await shot('artwork-disposition');
  const disposition=await allActions();check('minor-sale-is-family-assisted',disposition.some(key=>key.startsWith('请家人代售'))&&!disposition.some(key=>key.startsWith('直接出售')),disposition);
  await clickText('artwork.back');await clickText('artwork.hang');await shot('wall-position');await clickText('artwork.wallSlot',{slot:1,current:await text('life.ui.artwork.emptySlot')});await screen('Artwork');
  check('wall-art-has-one-owner',await page.evaluate(id=>window.__FUSHENG__.state.life.works.find(work=>work.id===id).status==='displayed'&&window.__FUSHENG__.state.life.works.find(work=>work.id===id).slot===0,wallId));
  await clickText('backCollection');await screen('Collection');await shot('collection-groups');await clickText('collection.allWorks');
  const ownWork=await page.evaluate(()=>window.__FUSHENG__.buttons.find(button=>button.key.startsWith('artwork.inspect.')).key);await click(ownWork);await screen('Artwork');await close();

  await openNeighbor('zhou');const childActions=await allActions();check('child-dialogue-has-no-personal-debt',!childActions.some(key=>/借款|归还|周转|60文/.test(key)),childActions);await shot('child-neighbor');await close();
  await travel('street');await dispatch({type:'Life',action:'explore',id:'alley'});await screen('Reply');await click('ui.replyContinue');await screen(null);
  await travel('store');await openNeighbor('lin');
  const projectName=await page.evaluate(()=>window.__FUSHENG__.ui.sim.course.stage.commissionName);await clickText('neighbor.viewProject',{name:projectName});await shot('child-project');await clickText('neighbor.acceptProject');await screen('Reply');await click('ui.replyContinue');await screen(null);
  check('accepted-child-project',await page.evaluate(()=>window.__FUSHENG__.state.life.commission.id==='lin'&&window.__FUSHENG__.state.life.commission.status==='accepted'));
  await rest();check('one-day-ends-without-aging',await page.evaluate(()=>window.__FUSHENG__.state.age===7&&window.__FUSHENG__.state.day===2));
  const commissionId=await compose('week.copy.b305b6e93a60','week.copy.1a407ccbb6dc');await close();await rest();
  await travel('store');await openNeighbor('lin');await clickText('neighbor.deliver');await screen('Reply');await shot('child-project-delivery');
  check('child-project-delivered-on-wednesday',await page.evaluate(id=>{const s=window.__FUSHENG__.state;return s.day===3&&s.life.commission.status==='done'&&s.life.works.find(work=>work.id===id).status==='gifted';},commissionId));await click('ui.replyContinue');await screen(null);

  const marketWork=await compose('week.copy.0ca678346f42','week.copy.1a407ccbb6dc');
  const marketName=await page.evaluate(()=>window.__FUSHENG__.ui.sim.course.stage.marketName);await clickText('artwork.reserve',{name:marketName});await screen('Artwork');await close();
  while(await page.evaluate(()=>window.__FUSHENG__.state.day<7))await rest();
  await travel('street');await dispatch({type:'Life',action:'market'});await screen('Market');await shot('child-market');
  await clickText('market.pricing');await shot('market-pricing');await clickText('market.setPrice',{name:await text('life.ui.price.friendly'),current:''});await screen('Market');
  await clickText('market.pickOffer');await shot('market-offer');
  const offer=await page.evaluate(()=>window.__FUSHENG__.buttons.find(button=>button.key.startsWith('推荐《')).key);await click(offer);
  while(await page.evaluate(()=>window.__FUSHENG__.state.life.market.status==='open'))await clickText('market.pass');
  await shot('market-settlement');
  check('child-market-settles-and-keeps-wall-art',await page.evaluate(({marketWork,wallId})=>{const l=window.__FUSHENG__.state.life;return l.market.status==='complete'&&l.market.sold===1&&l.works.find(work=>work.id===marketWork).status==='sold'&&l.works.find(work=>work.id===wallId).status==='displayed';},{marketWork,wallId}));
  await close();await rest();await shot('seventh-year-recap');
  check('recap-is-still-seven',await page.evaluate(()=>window.__FUSHENG__.state.age===7&&window.__FUSHENG__.screen==='WeekRecap'));
  await clickText('recap.continue',{age:8});await screen('Journal');await shot('eighth-year-journal');
  check('eighth-year-keeps-art-and-memories',await page.evaluate(({wallId,commissionId})=>{const s=window.__FUSHENG__.state;return s.age===8&&s.week===2&&s.day===1&&s.life.works.find(work=>work.id===wallId).status==='displayed'&&s.life.works.find(work=>work.id===commissionId).status==='gifted'&&s.life.neighbors.lin.memories.length>0&&s.life.course.years.some(year=>year.age===7);},{wallId,commissionId}));
  await close();

  report.stage='legal-fast-forward-eight-to-thirty';
  const passage=await page.evaluate(()=>{
   const d=window.__FUSHENG__,sim=d.ui.sim,s=sim.state;sim.paused=false;let days=0;const choices=[];
   const resolve=()=>{for(let guard=0;guard<12&&s.panel&&!sim.course.finished;guard++){
    if(s.panel.kind==='LifeChoice'){const milestone=sim.course.milestone;if(!milestone)throw Error('Choice without milestone');choices.push(milestone.age);sim.dispatch({type:'Course',action:'choose',id:milestone.choices[0].id});}
    else if(s.panel.kind==='RestConfirm')sim.dispatch({type:'Life',action:'rest'});
    else sim.dispatch({type:'Continue'});
   }};
   while(!sim.course.finished&&days<162){
    resolve();if(sim.course.finished)break;
    if(sim.course.milestone){sim.course.openYear();resolve();}
    sim.paused=false;sim.dispatch({type:'Course',action:'open'});sim.dispatch({type:'Course',action:'activity',id:sim.course.activities[0].id});resolve();
    sim.dispatch({type:'Sleep'});days++;resolve();
   }
   d.ui.lastPanel='';return {days,age:s.age,day:s.day,week:s.week,panel:s.panel?.kind,years:sim.course.data.years.length,choices,completed:sim.course.finished};
  });
  check('legal-path-completes-all-twenty-four-years',passage.days===161&&passage.age===30&&passage.day===7&&passage.years===24&&passage.panel==='LifeEnding'&&passage.completed,passage);
  await screen('LifeEnding');await shot('thirty-year-ending');
  const frozen=await page.evaluate(()=>JSON.stringify(window.__FUSHENG__.state));
  await clickText('ending.album');await shot('ending-album-stages');
  const childStage=await page.evaluate(()=>window.__FUSHENG__.ui.sim.course.content.stages[0].name);await click(childStage);await shot('ending-child-years');
  const seventhYear=await page.evaluate(()=>window.__FUSHENG__.buttons.find(button=>button.key.startsWith('7岁')).key);await click(seventhYear);await shot('ending-year-detail');await clickText('course.backAlbum');await clickText('ending.back');
  await clickText('ending.works');await shot('ending-representative-works');
  const representative=await page.evaluate(()=>window.__FUSHENG__.buttons.find(button=>button.key.startsWith('《')).key);await click(representative);await shot('ending-artwork-detail');await clickText('ending.back');
  check('ending-navigation-does-not-change-simulation',await page.evaluate(frozen=>JSON.stringify(window.__FUSHENG__.state)===frozen,frozen));
  await clickText('ending.titleBack');await screen('Title');await shot('saved-title');
  await click('ui.load');await screen('SaveSelect');await click('ui.load');await screen('LifeEnding');await shot('loaded-ending');
  const freezeCheck=await page.evaluate(()=>{const sim=window.__FUSHENG__.ui.sim;sim.paused=false;const before=JSON.stringify(sim.state);sim.dispatch({type:'Travel',scene:'park'});sim.dispatch({type:'Sleep'});sim.dispatch({type:'Continue'});sim.dispatch({type:'Course',action:'activity',id:sim.course.activities[0].id});return {unchanged:before===JSON.stringify(sim.state),age:sim.state.age,completed:sim.course.finished,panel:sim.state.panel?.kind};});
  check('loaded-ending-is-frozen-without-thirty-first-year',freezeCheck.unchanged&&freezeCheck.age===30&&freezeCheck.completed&&freezeCheck.panel==='LifeEnding',freezeCheck);
  check('no-runtime-errors',report.errors.length===0,report.errors);
  report.stage='complete';
 }catch(error){report.failure=String(error);report.stageAtFailure=report.stage;await page.screenshot({path:'output/playwright/life-course/journey-failure.png'}).catch(()=>{});}
 return report;
}
