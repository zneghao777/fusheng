// Device-only UI checks. The caller owns the single CDP connection and fs.* isolation.
export async function verifyAndroidUIPolish({page,client,check,shot,report}) {
 const settle=async()=>{await page.waitForFunction(()=>window.__FUSHENG__?.frameCount>20&&__FUSHENG__.artPending===0&&!document.getElementById('fusheng-loading'),null,{timeout:45000});await page.waitForTimeout(260);};
 const controls=()=>page.evaluate(()=>{
  const ui=__FUSHENG__.ui,scale=Math.min(innerWidth/1280,innerHeight/720);
  return [...ui.buttons,...ui.topControls,ui.statusToggle,ui.weeklyControl].filter(b=>b?.node?.isValid&&b.node.activeInHierarchy).map(b=>{
   const n=b.node,t=n.getComponent('cc.UITransform'),p=n.worldPosition,s=n.worldScale;
   return {key:b.key,text:b.label.string,inPanel:ui.buttons.includes(b),enabled:n.getComponent('cc.Button')?.interactable!==false,x:innerWidth/2+p.x*scale,y:innerHeight/2-p.y*scale,width:t.width*s.x*scale,height:t.height*s.y*scale};
  });
 });
 const tap=async query=>{
  const all=await controls(),q=typeof query==='string'?{key:query}:query;
  const matches=all.filter(b=>(!q.key||b.key===q.key)&&(!q.prefix||b.key.startsWith(q.prefix))&&(!q.text||b.text.includes(q.text))&&b.enabled);
  const target=matches.find(b=>b.inPanel)||matches[0];
  if(!target)throw Error('Missing native UI action '+JSON.stringify(q)+'; available '+all.map(b=>b.key+'='+b.text).join(' | '));
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();return target;
 };
 const screen=()=>page.evaluate(()=>__FUSHENG__.screen);
 const capture=async name=>{
  await settle();const buttons=await controls();
  const state=await page.evaluate(()=>({screen:__FUSHENG__.screen,paused:__FUSHENG__.ui.paused,simulationPaused:__FUSHENG__.ui.sim.paused,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},sceneFrame:__FUSHENG__.ui.sceneFrame}));
  (report.uiViews??=[]).push({name,...state,buttons});await shot('phone-ui-'+name);
  const input=state.screen?buttons.filter(b=>b.inPanel):buttons;
  check('native-ui-'+name+'-actions-inside-viewport',input.every(b=>b.x-b.width/2>=-1&&b.y-b.height/2>=-1&&b.x+b.width/2<=state.viewport.width+1&&b.y+b.height/2<=state.viewport.height+1),input);
 };
 await page.evaluate(()=>{const ui=__FUSHENG__.ui;ui.platform.query.set('origin','normal');ui.platform.query.set('house','rental');ui.debugStart();});await settle();
 await capture('room');
 await tap('ui.menu');await capture('menu');
 const menuKeys=(await controls()).filter(b=>b.inPanel).map(b=>b.key);
 check('native-menu-frequent-actions-on-first-screen',['ui.settings','ui.help','ui.save','ui.load','ui.titleBack'].every(k=>menuKeys.includes(k))&&!menuKeys.includes('ui.pageNext'),menuKeys);
 const primaryBefore=(await controls()).find(b=>b.inPanel&&b.key==='ui.continue');
 check('native-menu-primary-available',!!primaryBefore,primaryBefore);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:primaryBefore.x,y:primaryBefore.y}]});
 await capture('menu-primary-pressed');
 const primaryHeld=(await controls()).find(b=>b.inPanel&&b.key==='ui.continue');
 check('native-pressed-primary-hitbox-stays-fixed',!!primaryHeld&&['x','y','width','height'].every(k=>Math.abs(primaryHeld[k]-primaryBefore[k])<.01),{normal:primaryBefore,pressed:primaryHeld});
 check('native-touch-hold-does-not-activate-primary',await screen()==='Pause');
 await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settle();
 check('native-touch-cancel-does-not-activate-primary',await screen()==='Pause');
 await shot('phone-ui-menu-primary-cancelled');
 await tap('ui.settings');await capture('settings');
 check('native-settings-opens',await screen()==='Settings');
 await tap('ui.fontLarge');
 check('native-large-font-choice',await page.evaluate(()=>__FUSHENG__.ui.sim.settings.fontScale===1.3));
 // Also exercises the direct fs.music path under the caller's memory-only shim.
 const wasMuted=await page.evaluate(()=>__FUSHENG__.ui.platform.audio.muted);
 await tap('ui.audio');check('native-audio-toggle',await page.evaluate(before=>__FUSHENG__.ui.platform.audio.muted!==before,wasMuted));
 await tap('ui.close');check('native-settings-close-returns-menu',await screen()==='Pause');
 await tap('ui.save');
 check('native-save-uses-isolated-driver',await page.evaluate(()=>!!__FUSHENG__.ui.saves.load(1)));
 await tap('week.journal');await capture('journal');
 check('native-journal-sections-present',await page.evaluate(()=>{const labels=__FUSHENG__.ui.panels.getComponentsInChildren('cc.Label').map(l=>l.string);return['今日','这一岁的心愿','约定与展出'].every(text=>labels.includes(text));}));
 await tap('ui.close');check('native-journal-close-returns-room',await screen()===null&&await page.evaluate(()=>!__FUSHENG__.ui.paused));
 await tap('week.collection');await capture('gallery-empty');
 const empty=(await controls()).find(b=>b.inPanel&&/画一幅新画|回家画一幅|准备好画架/.test(b.text));
 check('native-empty-gallery-creation-entry',!!empty,empty);
 await tap(empty.key);
 check('native-empty-gallery-opens-creation',await screen()==='Compose');
 await tap('ui.close');check('native-compose-close-returns-room',await screen()===null);
 await page.evaluate(()=>{__FUSHENG__.state.life.works=Array.from({length:3},(_,i)=>({id:`native-qa-art-${i}`,subject:['window','pond','book'][i],style:['warm','ink','quiet'][i],quality:60+i,value:50+i,week:1,status:'stored'}));});
 await tap('week.collection');await capture('gallery-with-works');
 const art=await tap({prefix:'artwork.inspect.'});await capture('artwork-inspect');
 check('native-artwork-inspect-real-id',await page.evaluate(id=>__FUSHENG__.screen==='Artwork'&&__FUSHENG__.state.panel.id===id,art.key.slice('artwork.inspect.'.length)));
 let back=(await controls()).find(b=>b.inPanel&&/返回画夹|回到画夹/.test(b.text));
 for(let i=0;!back&&i<4;i++){
  if(!(await controls()).some(b=>b.inPanel&&b.key==='ui.pageNext'))break;
  await tap('ui.pageNext');back=(await controls()).find(b=>b.inPanel&&/返回画夹|回到画夹/.test(b.text));
 }
 check('native-artwork-return-reachable',!!back);
 await tap(back.key);check('native-artwork-returns-gallery',await screen()==='Collection');
 await tap('ui.close');await tap('ui.menu');await tap('ui.load');
 check('native-load-list-opens',await screen()==='SaveSelect');
 await tap('ui.delete');await capture('short-confirm-large-font');
 const confirmation=(await controls()).filter(b=>b.inPanel).map(b=>b.key);
 check('native-confirm-and-cancel-visible',['ui.confirm','ui.cancel'].every(k=>confirmation.includes(k)),confirmation);
 await tap('ui.cancel');check('native-cancel-returns-save-list',await screen()==='SaveSelect');
 check('native-cancel-keeps-isolated-save',await page.evaluate(()=>!!__FUSHENG__.ui.saves.load(1)));
 await tap('ui.back');check('native-save-list-back-returns-title',await screen()==='Title');await capture('returned-title');
 await tap('ui.new');await capture('create-disabled-slot');
 const disabled=(await controls()).find(b=>b.inPanel&&b.key==='ui.slot'&&!b.enabled);
 check('native-occupied-slot-is-disabled',!!disabled,disabled);
 const disabledState=()=>page.evaluate(()=>({screen:__FUSHENG__.screen,pendingSlot:__FUSHENG__.ui.pendingSlot,toastCount:__FUSHENG__.ui.toasts.children.length}));
 const beforeDisabled=await disabledState();
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:disabled.x,y:disabled.y}]});await settle();
 await shot('phone-ui-disabled-slot-pressed');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();
 const afterDisabled=await disabledState();
 check('native-disabled-slot-does-not-activate',JSON.stringify(beforeDisabled)===JSON.stringify(afterDisabled),{before:beforeDisabled,after:afterDisabled});
 await tap('ui.back');check('native-create-back-returns-title',await screen()==='Title');
}
