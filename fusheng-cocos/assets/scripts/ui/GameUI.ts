import { lifePanel } from '../core/WeekLife';
import { EntryKind, entryForLoad } from '../core/EntryMotion';
import { musicForScene } from '../core/MusicScene';
import { EntryView } from './EntryView';
import { SettingsView, settingsEntry } from './SettingsView';
import { renderWeekPanel, PanelPresentation } from './WeekPanels';
import { renderPanel } from './PanelView';
import { ArtAssets } from '../view/ArtAssets';
import { drawArtwork } from '../view/ArtworkView';
import { Button, Color, EditBox, EventKeyboard, EventMouse, EventTouch, Graphics, HorizontalTextAlignment, Input, KeyCode, Label, Node, ScrollView, UITransform, VerticalTextAlignment, input, view } from 'cc';
import { sceneGesture } from '../platform/SceneGesture';
import { gameSceneLayout, houseSceneBounds, scenePoint } from '../platform/DisplayLayout';
import { Sim } from '../core/Sim';
import { Content, Command, copy, GameSettings, Look, NEED_KEYS, SKILL_KEYS, SceneId, SimPanel } from '../core/Types';
import { I18n } from '../data/I18n';
import { SaveData, SaveError, SaveService } from '../platform/SaveService';
import { WebPlatform } from '../platform/WebPlatform';
import { BuildView } from '../view/BuildView';
import { CharacterView } from '../view/CharacterView';
import { UIButton, UIFactory, SERIF } from './UIFactory';
interface Action {key:string;run:()=>void;params?:Record<string,string|number>;primary?:boolean;}
export class GameUI {
 sim:Sim;slot=0;saveData:SaveData|undefined;
 layoutChanged:(()=>void)|null=null;
 private sceneLayoutKey='';private statusExpanded=true;private statusChevron:Graphics|null=null;private gestureHint:Label|null=null;private statusToggle:UIButton|null=null;private statusTray:Node|null=null;private topControls:UIButton[]=[];
 private entry:EntryView|null=null;
 private settingsReturnButtons:UIButton[]=[];
 private panelPreview={x:0,y:0,width:0,height:0};
 private weeklyControl:UIButton|null=null;private touchJump:UIButton|null=null;private weeklyHint:Label|null=null;private weeklyButton:Node|null=null;private taskCount:Label|null=null;private promptButton:UIButton|null=null;private buildPanel:Node|null=null;private destination:{x:number;y:number;interact:boolean;scene:SceneId;crossing?:number}|null=null;
 private controlPositions=new Map<Node,{x:number;y:number}>();
 private hudTop:Node|null=null;private hudAnchors=new Map<Node,{x:number;y:number}>();
 private buildCatalogExpanded=true;private buildView:BuildView;private buildPointNow={x:640,y:600};
 private page:string|null='Title';private overlay:string|null=null;private overlayBack:string|null=null;
 private pagePaper:Node;private prologueCopy:Node|null=null;private prologueDots:Label|null=null;
 private surface:Node;private hud:Node;private touch:Node;private panels:Node;private toasts:Node;private rotate:Node;
 private buttons:UIButton[]=[];private focus=0;private scroll:ScrollView|null=null;private header:Label|null=null;private needLabels:Label[]=[];private needBars:Graphics[]=[];private shownNeeds=[0,0,0,0];private taskLabels:Label[]=[];private moodLabel:Label|null=null;private prompt:Label|null=null;private actionLabel:Label|null=null;private touchAction:UIButton|null=null;
 private lastPanel='';private selectedChar='ding';private selectedGender='f';private pendingSlot=1;private proBeat=0;private buildType:string|null=null;private buildMode=false;private held={left:false,right:false,up:false,down:false};private pointer:{x:number;y:number;time:number;removed:boolean;screenX:number;screenY:number;startedAt:number;touchId:number|null;touch:boolean}|null=null;private toastTTL=0;private hidden=false;private autosave=0;private lastHUD=0;private code='';private preview:CharacterView|null=null;private previewLook:Look|null=null;private promptTime=0;
 constructor(readonly root:Node,readonly content:Content,readonly ui:UIFactory,readonly i18n:I18n,readonly saves:SaveService,readonly platform:WebPlatform){
  this.sim=new Sim(content,{seed:platform.now()>>>0});this.pagePaper=this.ui.create('PaperRow',root,0,0,1280,720);this.pagePaper.name='PagePaper';this.ui.box(this.pagePaper,1280,720,'#f3eddf','#f3eddf');this.ui.background(this.pagePaper);this.surface=this.ui.create('Title',root);this.hud=this.ui.create('HUD',root);this.touch=this.ui.create('TouchControls',root);this.panels=this.ui.create('PaperRow',root);this.toasts=this.ui.create('PaperRow',root);this.rotate=this.ui.create('Rotate',root);this.buildView=new BuildView(root,i18n);
  this.sim.settings.musicVolume=this.platform.audio.volume;
  this.ui.motionPreference=()=>this.sim.settings.reduceMotion||this.platform.reducedMotion;
  this.setupHUD();this.bindInput();this.platform.onHide(()=>{this.save();this.hidden=true;this.resetInput();this.platform.audio.onHide();});this.platform.onShow(()=>{this.hidden=false;this.sim.resetInput();this.platform.audio.onShow();});this.platform.resize(()=>this.orientation());
  this.ui.fullSurface(this.pagePaper,'#f3eddf');this.renderTitle();this.orientation();
 }
 get activePage():string|null{return this.entry?'Entry':this.overlay??this.page??this.sim.state.panel?.kind??(this.buildMode?'Build':null);}
 get paused():boolean{return !!this.entry||this.hidden||!!this.page||!!this.overlay||this.buildMode||this.rotate.active;}
 get sceneFrame():ReturnType<typeof gameSceneLayout>{const size=view.getVisibleSize();return gameSceneLayout(size.width,size.height,this.platform.viewport.safe,this.platform.touch,this.sim.state.scene==='home'?houseSceneBounds(this.sim.house):undefined,this.statusExpanded,this.buildMode?(this.buildCatalogExpanded?176:100):0);}
 get buttonInfo():{key:string;text:string;x:number;y:number;width:number;height:number}[]{return this.buttons.filter(b=>b.node.isValid&&b.node.activeInHierarchy).map(b=>{const p=b.node.worldPosition,tr=b.node.getComponent(UITransform)!;return {key:b.key,text:b.label.string,x:p.x,y:p.y,width:tr.width,height:tr.height};});}
 activate(key:string):boolean{const b=this.buttons.find(b=>b.key===key);if(!b)return false;b.activate();return true;}
 private t(key:string,params:Record<string,string|number>={}):string{return this.i18n.plain(key,params);}
 private resetInput():void{this.pointer=null;this.destination=null;this.held={left:false,right:false,up:false,down:false};this.sim.resetInput();}
 private emitMove():void{this.sim.dispatch({type:'Move',x:Number(this.held.right)-Number(this.held.left),y:Number(this.held.down)-Number(this.held.up)});}
 private addButton(parent:Node,action:Action,x:number,y:number,w:number,h=42):UIButton {const b=this.ui.button(parent,action.key,x,y,w,h,action.run,action.params,action.primary);this.buttons.push(b);return b;}
 private clearPanels():void{this.ui.clear(this.panels);this.buttons=[];this.focus=0;this.scroll=null;this.preview=null;this.buildPanel=null;}
 private showSurface(kind:string):Node {this.prologueCopy=null;this.prologueDots=null;this.page=kind;this.overlay=null;this.buildMode=false;this.buildType=null;this.resetInput();this.ui.clear(this.surface);this.clearPanels();const n=this.ui.create(kind,this.surface);this.ui.background(n);this.ui.transition(n,this.sim.settings.reduceMotion);return n;}
 private panel(kind:string,title:string,body:string,actions:Action[],close?:()=>void,topInset=0,presentation?:PanelPresentation):Node {
  this.clearPanels();this.resetInput();
  const result=renderPanel(this.ui,this.panels,this.platform.touch,{kind,title:this.t(title),body:this.t(body),actions,close,previewHeight:topInset,presentation,fontScale:this.sim.settings.fontScale,reduceMotion:this.sim.settings.reduceMotion,buttonsChanged:buttons=>{this.buttons=buttons;this.focus=0;}});
  this.scroll=result.scroll;this.panelPreview=result.preview;return result.node;
 }
 renderTitle():void {
  const n=this.showSurface('Title');this.slot=0;this.saveData=undefined;
  this.ui.display(n,'ui.title',0,this.platform.touch?202:154,700,100,this.platform.touch?74:54,HorizontalTextAlignment.CENTER);
  this.ui.label(n,'ui.subtitle',0,this.platform.touch?138:107,400,40,this.platform.touch?25:12,HorizontalTextAlignment.CENTER).color=new Color('#756b5c');
  const seal=this.ui.create('PaperRow',n,0,this.platform.touch?84:57,40,40);seal.angle=4;this.ui.box(seal,40,40,'#a94b38','#b36c5a');this.ui.display(seal,'ui.artSeal',0,0,38,38,18,HorizontalTextAlignment.CENTER).color=new Color('#fdf7ec');
  for(const [key,y,run]of [['ui.new',-22,()=>this.openCreate()],['ui.load',-76,()=>this.renderSaveSelect()],['ui.help',-128,()=>this.open('Help')]] as const){const b=this.addButton(n,{key,run,primary:key==='ui.new'},0,this.platform.touch?(y===-22?-30:y===-76?-125:-220):y,this.platform.touch?320:184,this.platform.touch?92:44);b.label.fontFamily=SERIF;b.label.fontSize=this.platform.touch?30:16;}
  this.buttons.push(settingsEntry(this.ui,n,this.platform.touch,this.platform.viewport.scale,()=>{this.overlayBack=null;this.open('Settings');}));
  this.ui.label(n,'ui.titleFoot',0,this.platform.touch?-296:-181,900,36,this.platform.touch?23:11,HorizontalTextAlignment.CENTER).color=new Color('#756b5c');this.syncVisibility();
 }
 renderSaveSelect():void {
  const n=this.showSurface('SaveSelect'),mobile=this.platform.touch,w=mobile?1136:1000;
  this.ui.display(n,'ui.saveSelect',0,286,w,50,mobile?34:28);this.ui.label(n,'ui.loadSubtitle',0,242,w,36,mobile?25:16).color=new Color('#756b5c');
  this.saves.list().forEach((slot,i)=>{const y=140-i*148,box=this.ui.create('PaperRow',n,0,y,w,132);this.ui.box(box,w,132,'#fffaf0b0','#b7b0a1');this.ui.display(box,'0'+slot.slot,-w/2+44,0,58,58,mobile?32:26,HorizontalTextAlignment.CENTER);
   const title=slot.data?this.t('ui.saveMeta',{name:slot.data.meta.name,age:slot.data.meta.age,gen:slot.data.meta.gen,week:slot.data.meta.week,money:slot.data.meta.money,house:this.content.houses[slot.data.meta.house].name}):this.t(slot.error?slot.error==='future'?'ui.future':'ui.corrupt':'ui.slotEmpty');
   this.ui.label(box,title,-118,0,w-470,116,mobile?26:18);
   this.addButton(box,{key:slot.data?'ui.load':'ui.slotNew',run:()=>slot.data?this.load(slot.slot):!slot.error?this.openCreate(slot.slot):this.toast('ui.corrupt')},w/2-258,0,160,96).label.fontSize=mobile?27:18;
   if(slot.data||slot.error)this.addButton(box,{key:'ui.delete',run:()=>this.confirmDelete(slot.slot)},w/2-84,0,140,96).label.fontSize=mobile?25:17;
  });
  this.addButton(n,{key:'ui.back',run:()=>this.slot?this.resume():this.renderTitle()},-170,-282,300,88).label.fontSize=mobile?27:18;this.addButton(n,{key:'ui.import',run:()=>this.openCode(false)},170,-282,300,88).label.fontSize=mobile?27:18;this.syncVisibility();
 }
 private confirmDelete(slot:number):void{this.overlay='Confirm';this.panel('Confirm','ui.delete','ui.confirmDelete',[{key:'ui.confirm',run:()=>{this.saves.delete(slot);if(this.slot===slot){this.slot=0;this.saveData=undefined;this.renderTitle();}else this.renderSaveSelect();},primary:true},{key:'ui.cancel',run:()=>this.renderSaveSelect()}]);}
 private openCreate(slot?:number):void {const empty=this.saves.list().filter(s=>!s.data&&!s.error);this.pendingSlot=slot??empty[0]?.slot??0;if(!this.pendingSlot){this.toast('ui.full');this.renderSaveSelect();return;}this.selectedGender='f';this.selectedChar='ding';this.renderCreate();}
 private renderCreate():void {
  const n=this.showSurface('Create'),mobile=this.platform.touch,font=mobile?27:18;
  const slots:{slot:number;button:UIButton}[]=[],genders:{gender:string;button:UIButton}[]=[],cards:{id:string;gender:string;button:UIButton}[]=[];
  this.ui.display(n,'ui.create',0,300,1136,48,mobile?34:28);this.ui.label(n,'ui.createSubtitle',0,260,1136,36,mobile?25:16).color=new Color('#756b5c');
  this.saves.list().forEach((slot,i)=>{const b=this.addButton(n,{key:'ui.slot',params:{slot:slot.slot},run:()=>{if(slot.data||slot.error){this.toast('ui.full');return;}if(this.pendingSlot===slot.slot)return;this.pendingSlot=slot.slot;refresh();}},-380+i*380,192,356,mobile?88:76);b.label.fontSize=font;b.label.lineHeight=31;b.label.string=this.t('ui.slot',{slot:slot.slot})+' · '+this.t(slot.data?'ui.slotUsed':'ui.slotFree');slots.push({slot:slot.slot,button:b});if(slot.data||slot.error)b.setEnabled?.(false);});
  for(const [gender,x,key]of [['f',-464,'ui.female'],['m',-284,'ui.male']]as const){const b=this.addButton(n,{key,run:()=>{if(this.selectedGender===gender)return;this.selectedGender=gender;this.selectedChar=gender==='f'?'ding':'kang';refresh();}},x,96,160,88);b.label.fontSize=font;genders.push({gender,button:b});}
  this.content.characters.forEach(c=>{const i=this.content.characters.filter(other=>other.gender===c.gender).indexOf(c);const b=this.addButton(n,{key:c.name,run:()=>{if(this.selectedChar===c.id)return;this.selectedChar=c.id;refresh();}},-464+i*180,-45,160,184);b.label.node.setPosition(0,-64);b.label.node.getComponent(UITransform)!.setContentSize(148,44);b.label.fontSize=font;b.label.lineHeight=32;cards.push({id:c.id,gender:c.gender,button:b});
   const holder=this.ui.create('PaperRow',b.node,0,-38,100,124),portrait=this.ui.create('PaperRow',holder),view=portrait.addComponent(CharacterView);holder.setScale(1.1,1.1,1);view.setup();view.present(this.sim,this.i18n,1,false,c);});
  const rule=this.ui.create('PaperRow',n,210,-15,1,268);this.ui.box(rule,1,268,'#c4bcaa80','#00000000');
  const name=this.ui.display(n,'',390,94,286,48,mobile?32:25),tag=this.ui.label(n,'',390,24,286,100,font),bonusLabel=this.ui.label(n,'',390,-90,286,100,mobile?25:17);tag.lineHeight=38;tag.color=new Color('#625849');bonusLabel.color=new Color('#a6402f');bonusLabel.lineHeight=36;
  this.ui.label(n,'week.ageStart',-150,-184,810,36,mobile?25:17).color=new Color('#756b5c');
  this.addButton(n,{key:'ui.back',run:()=>this.renderTitle()},-410,-270,268,96).label.fontSize=font;this.addButton(n,{key:'ui.begin',run:()=>this.newGame(),primary:true},390,-270,300,96).label.fontSize=font;
  const allButtons=this.buttons.slice();
  const refresh=()=>{
   const selected=this.content.characters.find(c=>c.id===this.selectedChar)!,focused=this.buttons[this.focus];
   slots.forEach(({slot,button})=>button.select(slot===this.pendingSlot));genders.forEach(({gender,button})=>button.select(gender===this.selectedGender));
   cards.forEach(({id,gender,button})=>{button.node.active=gender===this.selectedGender;button.select(id===this.selectedChar);});
   this.buttons=allButtons.filter(b=>b.node.active);const index=this.buttons.indexOf(focused);this.focus=index>=0?index:0;allButtons.filter(b=>!b.node.active).forEach(b=>b.focus(false));
   name.string=this.t(selected.name);tag.string=this.t(selected.tag);
   const b=selected.bonus;bonusLabel.string=b.skill?this.t('ui.bonusSkill',{skill:this.content.skills.find(s=>s.id===b.skill)!.name}):b.need?this.t('ui.bonusNeed',{need:'ui.'+b.need,value:b.v??0}):b.warm?this.t('ui.bonusWarm',{value:b.warm}):this.t('ui.bonusMoney',{value:b.money??0});
  };
  refresh();this.syncVisibility();
 }
 private newGame():void{const origin=this.platform.query.get('origin'),settings=copy(this.sim.settings);this.sim=new Sim(this.content,{seed:this.platform.now()>>>0,charId:this.selectedChar,originId:origin??undefined});this.sim.settings=settings;this.sim.state.introSeen=false;this.sim.state.panel={kind:'Origin'};this.slot=this.pendingSlot;this.saveData=undefined;this.save();this.proBeat=0;this.renderPrologue();}
 private renderPrologue():void {
  const existing=this.page==='Prologue'&&this.prologueCopy?.isValid;
  if(!existing){
   const n=this.showSurface('Prologue');
   this.ui.display(n,'ui.proSeal',-544,235,80,70,24,HorizontalTextAlignment.CENTER).color=new Color('#a7a092');
   const mark=this.ui.create('PaperRow',n,-544,105,2,160);this.ui.box(mark,2,160,'#8b837260','#00000000');
   this.prologueCopy=this.ui.create('PaperRow',n);this.prologueCopy.name='PrologueCopy';
   this.prologueDots=this.ui.label(n,'',-370,-190,340,40,this.platform.touch?26:14);this.prologueDots.color=new Color('#a6402f');
   const next=this.addButton(n,{key:'ui.next',run:()=>this.proNext()},-170,-276,400,this.platform.touch?88:48);next.label.color=new Color('#756957');next.label.fontSize=this.platform.touch?27:16;
   this.addButton(n,{key:'ui.skip',run:()=>this.endPrologue()},510,286,160,this.platform.touch?92:48);
   n.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{let target=event.target as Node|null;while(target&&target!==n){if(target.getComponent(Button))return;target=target.parent;}this.proNext();});
  }
  const s=this.sim.state,c=this.content.characters.find(c=>c.id===s.charId)!,beats=s.life?Array.from({length:6},(_,i)=>({v:1,lines:['week.prologue'+i],final:i===5})):this.content.prologue[s.house+'.'+s.originId],beat=beats[this.proBeat];
  // Keep the page, its opaque paper and input targets mounted between beats.
  this.ui.clear(this.prologueCopy!);
  beat.lines.forEach((line,i)=>{const text=this.ui.display(this.prologueCopy!,this.t(line,{name:c.name,tag:c.tag}),-112,(beat.lines.length-1)*23-i*46,788,130,this.platform.touch?36:24);if(beat.final)text.color=new Color('#a6402f');});
  this.prologueDots!.string=beats.map((_,i)=>i<=this.proBeat?'●':'○').join('　');
  this.syncVisibility();
 }
 private proNext():void{if(this.proBeat>=5)this.endPrologue();else{this.proBeat++;this.renderPrologue();}}
 private endPrologue():void{this.page=null;this.ui.clear(this.surface);this.clearPanels();this.sim.dispatch({type:'FinishPrologue'});this.lastPanel='';this.syncVisibility();}
 private send(command:Command):void{
  const panel=this.sim.state.panel?.kind,week=this.sim.state.week;
  this.sim.dispatch(command);this.lastPanel='';
  if(command.type==='Continue'&&panel==='Origin')this.startEntry('fold');
  else if(this.sim.state.life&&this.sim.state.week>week)this.startEntry('book');
 }
 private startEntry(kind:EntryKind):void{
  if(this.entry)return;
  this.page=null;this.overlay=null;this.overlayBack=null;this.buildMode=false;this.resetInput();
  this.ui.clear(this.surface);this.clearPanels();this.ui.clear(this.toasts);this.toastTTL=0;
  this.entry=new EntryView(this.root,kind,this.sim,this.ui,this.i18n,this.sim.settings.reduceMotion||this.platform.reducedMotion,this.platform.touch,()=>{
   this.entry=null;this.clearPanels();this.lastPanel='';this.resetInput();
   if(kind==='fold'){this.sim.state.introSeen=true;this.save();}
   if(this.sim.state.panel){this.corePanel(this.sim.state.panel);this.lastPanel=JSON.stringify(this.sim.state.panel);}
   this.sim.paused=this.paused;this.syncVisibility();
  });
  this.entry.node.setSiblingIndex(this.rotate.getSiblingIndex());
  this.buttons=[this.entry.skipButton];this.sim.paused=true;this.syncVisibility();
 }
 private load(slot:number):void{try{const d=this.saves.load(slot);if(!d)return;this.sim=new Sim(this.content,{state:d.state});this.sim.settings=d.settings;this.sim.settings.musicVolume=this.platform.audio.volume;this.slot=slot;this.saveData=d;if(this.sim.state.age===7&&this.sim.state.introSeen===false&&!this.sim.state.panel)this.sim.state.panel={kind:'Origin'};this.page=null;this.overlay=null;this.buildMode=false;this.ui.clear(this.surface);this.clearPanels();this.lastPanel='';this.syncVisibility();const entry=entryForLoad(this.sim.state);if(entry)this.startEntry(entry);}catch(error){this.toast(error instanceof SaveError&&error.code==='future'?'ui.future':'ui.corrupt');}}
 save():void{if(!this.slot)return;try{this.saveData=this.saves.write(this.slot,this.sim.state,this.sim.settings,this.saveData);}catch(error){this.toast(error instanceof SaveError&&error.code==='future'?'ui.future':'ui.storageError');}}
 private resume():void{this.overlay=null;this.overlayBack=null;this.page=null;this.ui.clear(this.surface);this.clearPanels();this.lastPanel='';this.resetInput();this.syncVisibility();}
 private close():void{if(this.page==='Title'&&this.overlay==='Help'){this.renderTitle();return;}if(!this.overlay&&['LifeChoice','LifeEnding'].includes(this.sim.state.panel?.kind??''))return;if(this.overlay==='Settings'){this.closeSettings();return;}if(this.overlay==='MusicCredits'){this.open('Settings');return;}if(this.sim.state.life&&this.sim.state.panel&&lifePanel(this.sim.state.panel.kind)&&this.sim.state.panel.kind!=='WeekRecap'){this.sim.state.panel=null;this.lastPanel='';this.clearPanels();this.syncVisibility();return;}if(this.overlay){const back=this.overlayBack;this.overlayBack=null;if(back==='Pause')this.open('Pause');else {this.overlay=null;this.clearPanels();}}else if(this.sim.state.panel&&['Reply','Birthday','Origin'].includes(this.sim.state.panel.kind)){this.send({type:'Continue'});}else if(this.buildMode)this.toggleBuild();this.syncVisibility();}
 open(kind:'Pause'|'Character'|'Help'|'Settings'):void{if(kind==='Pause')this.overlayBack=null;if(this.buildMode){this.buildMode=false;this.buildType=null;this.safeLayout();this.layoutChanged?.();}if(kind==='Settings'){if(this.page&&!this.overlay)this.settingsReturnButtons=this.buttons.slice();if(this.overlay==='Pause')this.overlayBack='Pause';this.overlay='Settings';this.clearPanels();this.resetInput();const settings=new SettingsView(this.ui,this.panels,this.platform.touch,this.platform.viewport.scale,this.sim.settings,this.platform.audio,()=>this.save(),()=>this.closeSettings(),()=>this.openMusicCredits());this.buttons=settings.buttons;this.syncVisibility();return;}if(this.overlay==='Pause'&&kind!=='Pause')this.overlayBack='Pause';this.overlay=kind;const s=this.sim.state,c=this.content.characters.find(c=>c.id===s.charId)!,house=this.content.houses[s.house],origin=this.content.origins.find(o=>o.id===s.originId)!;
 if(kind==='Pause')this.renderPause();
 if(kind==='Help')this.panel(kind,'ui.help',s.life?'week.help':'ui.helpBody',[{key:'ui.continue',run:()=>this.close(),primary:true}],()=>this.close());
 if(kind==='Character'){const mood=this.sim.mood(),classicBody=this.t('ui.characterBody',{name:c.name,age:s.age,stage:'ui.'+this.sim.stage,origin:origin.name,house:house.name,wealth:house.tierName,body:s.growth.body,mind:s.growth.mind,charm:s.growth.charm,mood:this.t('ui.mood',{mood:'ui.'+mood.key,v:Math.round(mood.v),a:Math.round(mood.a)}),moodDesc:'ui.'+mood.key+'Desc',skills:SKILL_KEYS.map(k=>this.t('ui.skill',{name:this.content.skills.find(d=>d.id===k)!.name,lv:s.skills[k].lv,xp:Math.round(s.skills[k].xp),need:this.sim.xpNeed(s.skills[k].lv)})).join('\n'),warm:Math.round(s.rel.warm),trust:Math.round(s.rel.trust),tension:Math.round(s.rel.tension),paintings:s.stats.paintings,earned:s.stats.earned,rep:s.stats.rep,gen:s.gen,creed:this.content.creeds.find(c=>c.id===s.creedId)?.name??'ui.noCreed',buffs:s.buffs.map(b=>this.t('ui.buff',{name:b.nameKey,v:b.v,a:b.a})).join('\n')});const body=s.life?this.t('ui.courseCharacter',{name:c.name,age:s.age,stage:this.sim.course.stage.name,home:this.sim.course.stage.home,goal:this.sim.course.stage.goal,direction:this.sim.course.text('course.direction.'+this.sim.course.data.direction),metrics:this.sim.course.text('course.stats',this.sim.course.data.metrics),works:s.stats.paintings,skills:SKILL_KEYS.map(k=>this.t('ui.skill',{name:this.content.skills.find(d=>d.id===k)!.name,lv:s.skills[k].lv,xp:Math.round(s.skills[k].xp),need:this.sim.xpNeed(s.skills[k].lv)})).join('\n')}):classicBody;this.panel(kind,'ui.character',body,[{key:'ui.continue',run:()=>this.close(),primary:true}],()=>this.close());}
 this.syncVisibility();}
 private corePanel(panel:SimPanel):void{const s=this.sim.state,h=this.sim.house;this.overlay=null;this.buildMode=false;
 if(panel.kind==='LifeEnding'&&!s.life){this.panel('Legacy','course.endingTitle',this.t('course.endingBody')+'\n\n'+this.t('ui.classicEndingStats',{age:s.age,works:s.stats.paintings,money:s.money}),[{key:'course.home',primary:true,run:()=>{this.save();this.renderTitle();}}]);return;}
 if(s.life&&lifePanel(panel.kind)){renderWeekPanel(this.sim,panel,{show:(kind,title,body,actions,preview,presentation)=>{const n=this.panel(kind,title,body,actions,['WeekRecap','LifeChoice','LifeEnding'].includes(kind)?undefined:()=>this.close(),preview?130:0,presentation);if(preview){const art=this.ui.create('PaperRow',n,this.panelPreview.x,this.panelPreview.y,this.platform.touch?188:154,this.platform.touch?116:94);drawArtwork(art,preview,this.platform.touch?188:154,this.platform.touch?116:94);}},send:command=>this.send(command),close:()=>{this.close();this.sim.paused=this.paused;},finish:()=>{this.save();this.renderTitle();}});return;}
 const proceed:Action={key:'ui.continue',run:()=>this.send({type:'Continue'}),primary:true};
 if(['Story','Event','Twist'].includes(panel.kind)){const n=this.sim.narrative(panel);if(n)this.panel(panel.kind,n.title,this.sim.body(n),n.options.map(o=>({key:this.t(o.label)+(o.hint?'\n'+this.t(o.hint):''),run:()=>{this.sim.dispatch({type:'ChooseOption',id:o.id});this.lastPanel='';},params:{},primary:false})));return;}
 if(panel.kind==='Origin'){const o=s.life?this.sim.course.origin:this.content.origins.find(o=>o.id===s.originId)!;const body=this.t(s.life?'ui.childOriginStats':'ui.originStats',{origin:o.name,stars:'★'.repeat(o.diff)+'☆'.repeat(5-o.diff),desc:o.desc,money:s.money,house:h.name,wealth:h.tierName,skills:SKILL_KEYS.map(k=>this.t('ui.skill',{name:this.content.skills.find(d=>d.id===k)!.name,lv:s.skills[k].lv,xp:Math.round(s.skills[k].xp),need:this.sim.xpNeed(s.skills[k].lv)})).join(' / '),intro:this.t(s.life?'week.originIntro':'ui.originIntro')+(o.diff>=4?'\n'+this.t('ui.originHard'):'')});this.panel('Origin','ui.origin',body,[{...proceed,key:'ui.start'}]);}
 if(panel.kind==='Reply')this.panel('Reply',this.t(panel.title??'ui.reply',{gen:s.gen}),this.t(panel.body??'',{gen:s.gen,creed:this.content.creeds.find(c=>c.id===s.creedId)?.name??''}),[{...proceed,key:'ui.replyContinue'}]);
 if(panel.kind==='DaySummary'&&s.life){const prefix=this.t('week.recordPrefix',{week:s.week,day:s.day}),body=this.t('week.daySummary',{day:s.day,used:3-s.life.focus,delta:Number(panel.data!.delta),records:s.life.log.filter(line=>line.startsWith(prefix+' ')||line.startsWith(this.sim.course.text('course.dayLog',{age:s.age,day:s.day,text:''}))).map(line=>line.startsWith(prefix+' ')?line.slice(prefix.length+1):line.slice(this.sim.course.text('course.dayLog',{age:s.age,day:s.day,text:''}).length)).join('\n')||this.t('week.dayQuiet')});this.panel('DaySummary',this.t('ui.dayTitle',{day:s.day}),body,[{...proceed,key:s.day>=7?'ui.nextWeek':'ui.nextDay'}]);return;}
 if(panel.kind==='DaySummary'){const d=panel.data!,done=Number(d.done),line=d.auto?'ui.dayAuto':done===3?'ui.dayAll':done===2?'ui.dayTwo':done===1?'ui.dayOne':'ui.dayNone';const body=this.t('ui.dayStats',{done,total:s.tasks.length,delta:Number(d.delta),mood:'ui.'+this.sim.mood().key,age:s.age,week:s.week,tasks:s.tasks.map(t=>(t.done?'✓ ':'✗ ')+this.t(t.text)).join('\n'),line});this.panel('DaySummary',this.t('ui.dayTitle',{day:s.day}),body,[{...proceed,key:s.day>=7?'ui.nextWeek':'ui.nextDay'}]);}
 if(panel.kind==='Birthday'){const d=panel.data!,body=this.t('ui.birthdayStats',{line:'ui.birthday'+(this.sim.stage==='kid'?'Kid':this.sim.stage==='young'?'Young':'Mid'),body:Number(d.body),mind:Number(d.mind),charm:Number(d.charm),totalBody:s.growth.body,totalMind:s.growth.mind,totalCharm:s.growth.charm,house:h.name,wealth:h.tierName,move:d.moved?this.t('ui.moveLine',{house:h.name}):''});this.panel('Birthday',this.t(d.moved?'ui.moved':'ui.birthday',{age:s.age}),body,[proceed]);}
 if(panel.kind==='Legacy'){const body=this.t('ui.legacyBody',{age:s.age,house:h.name,years:s.age-7,paintings:s.stats.paintings,money:s.money,body:s.growth.body,mind:s.growth.mind,charm:s.growth.charm,earned:s.stats.earned,rep:s.stats.rep,warm:Math.round(s.rel.warm),ending:'ui.ending'+this.sim.ending(),fair:s.story.fair?'ui.fairEnding':''});this.panel('Legacy',this.t('ui.legacy',{gen:s.gen}),body,this.content.creeds.map(c=>({key:this.t(c.name)+'\n'+this.t(c.desc),run:()=>{this.sim.dispatch({type:'Legacy',creedId:c.id});this.lastPanel='';},primary:false})));}
 }
 private renderPause():void {
  this.clearPanels();this.resetInput();const touch=this.platform.touch,w=1064,h=620;
  const shade=this.ui.create('PaperRow',this.panels);this.ui.fullSurface(shade,'#29251f78');this.ui.block(shade);
  const n=this.ui.create('Pause',this.panels,0,0,w,h);n.name='PauseMenu';this.ui.paper(n,w,h);this.ui.block(n);
  this.ui.display(n,'ui.pause',-36,260,w-168,54,touch?34:30);
  this.buttons.push(this.ui.closeButton(n,466,260,88,88,()=>this.resume()));this.ui.divider(n,0,220,w-64);
  const s=this.sim.state,c=this.content.characters.find(c=>c.id===s.charId)!,left=-352,right=174,rw=648;
  this.ui.display(n,c.name,left,166,296,52,34);
  const detail=this.ui.label(n,this.t('ui.pauseSummary',{age:s.age,day:s.day,house:this.sim.house.name,money:s.money}),left,74,296,132,touch?27:23);detail.lineHeight=42;detail.verticalAlign=VerticalTextAlignment.TOP;
  const primary=this.addButton(n,{key:'ui.continue',run:()=>this.resume(),primary:true},left,-52,264,88);primary.label.fontSize=touch?28:23;
  const saved=this.ui.label(n,'ui.pauseAutosave',left,-132,296,48,touch?22:17);saved.lineHeight=30;saved.color=new Color('#756957');
  const back=this.addButton(n,{key:'ui.titleBack',run:()=>{this.save();this.renderTitle();}},left,-230,264,88);back.label.fontSize=touch?25:20;
  const heading=(key:string,y:number)=>{const l=this.ui.label(n,key,right,y,rw,32,touch?22:17);l.color=new Color('#8b533f');};
  const add=(action:Action,x:number,y:number,bw:number)=>{const b=this.addButton(n,action,x,y,bw,88);b.label.fontSize=touch?26:20;b.label.lineHeight=32;return b;};
  const life=(action:'journal'|'collection')=>this.openLife(action);
  heading('ui.menuLife',188);
  const day:Action[]=[{key:'ui.character',run:()=>this.open('Character')},...(s.life?[{key:'week.journal',run:()=>life('journal')},{key:'week.collection',run:()=>life('collection')}]:[{key:'ui.help',run:()=>this.open('Help')}]),{key:'ui.sleep',run:()=>{this.overlay=null;this.sim.paused=this.paused;this.sim.dispatch({type:'Sleep'});this.lastPanel='';this.syncVisibility();}}];
  day.forEach((a,i)=>add(a,right+(i%2?1:-1)*(rw/4+3),128-Math.floor(i/2)*100,264));
  heading('ui.menuSave',-40);
  [{key:'ui.save',run:()=>{this.save();this.toast('ui.saved');}},{key:'ui.load',run:()=>{this.save();this.renderSaveSelect();}},{key:'ui.export',run:()=>this.openCode(true)}].forEach((a,i)=>add(a,right-rw/2+(rw-24)/6+i*((rw-24)/3+12),-100,188));
  this.ui.divider(n,right,-164,rw);
  add({key:'ui.settings',run:()=>this.open('Settings')},right-rw/4-3,-230,264);
  add({key:'ui.help',run:()=>this.open('Help')},right+rw/4+3,-230,264);
  this.ui.transition(n,this.sim.settings.reduceMotion);
 }
 private closeSettings():void{if(this.page){this.overlay=null;this.clearPanels();this.buttons=this.settingsReturnButtons.filter(b=>b.node.isValid);this.settingsReturnButtons=[];this.focus=0;this.syncVisibility();}else this.open('Pause');}
 private openMusicCredits():void{this.overlay='MusicCredits';const body=this.platform.audio.tracks.map(track=>this.t('ui.musicCreditLine',{title:track.title,author:track.author})+'\n'+track.source).join('\n\n');this.panel('Help','ui.musicCredits',body,[{key:'ui.back',run:()=>this.open('Settings')}],()=>this.open('Settings'));this.syncVisibility();}
 private openCode(exporting:boolean):void{this.overlayBack=this.overlay;this.overlay='Code';if(exporting){this.save();this.code=this.saveData?this.saves.export(this.saveData):'';}else this.code='';const actions:Action[]=exporting?[{key:'ui.copy',run:()=>{void this.platform.copy(this.code).then(ok=>{if(!ok)this.toast('ui.codeHint');});}}]:[1,2,3].map(slot=>({key:'ui.importSlot',params:{slot},run:()=>{const run=()=>{try{this.saves.import(this.code,slot);if(this.slot===slot){this.slot=0;this.saveData=undefined;}this.renderSaveSelect();this.toast('ui.imported');}catch{this.toast('ui.codeError');}};if(this.saves.list()[slot-1].data){this.overlay='Confirm';this.panel('Confirm','ui.import','ui.confirmDelete',[{key:'ui.confirm',run,primary:true},{key:'ui.cancel',run:()=>this.openCode(false)}]);}else run();}}));const n=this.panel('Code','ui.codeTitle','ui.codeHint',[{key:'ui.paste',run:()=>{void this.platform.paste().then(value=>{if(value!==null){this.code=value;this.renderCodeInput(inputNode,value);}});}},...actions,{key:'ui.back',run:()=>this.slot?this.open('Pause'):this.renderSaveSelect()}],()=>this.slot?this.open('Pause'):this.renderSaveSelect(),110);
 const inputNode=this.ui.create('PaperRow',n,this.panelPreview.x,this.panelPreview.y,this.panelPreview.width,88);this.renderCodeInput(inputNode,this.code);
 }
 private renderCodeInput(n:Node,value:string):void {let edit=n.getComponent(EditBox);if(!edit){const width=n.getComponent(UITransform)!.width;this.ui.box(n,width,88,'#fff8eb','#b2a48c');const label=this.ui.label(n,'',0,0,width-20,80,this.platform.touch?25:14);edit=n.addComponent(EditBox);edit.textLabel=label;edit.inputMode=EditBox.InputMode.ANY;edit.maxLength=200000;n.on(EditBox.EventType.TEXT_CHANGED,()=>{this.code=edit!.string;});}edit.string=value;}
 private openLife(action:'journal'|'collection'):void{
  if(this.buildMode)this.toggleBuild();
  this.overlay=null;this.overlayBack=null;this.sim.paused=this.paused;
  this.sim.dispatch({type:'Life',action});this.lastPanel='';this.syncVisibility();
 }
 private setupHUD():void {
  const mobile=this.platform.touch,top=this.ui.create('PaperRow',this.hud,0,330,1280,60);this.hudTop=top;this.ui.block(top);
  this.header=this.ui.label(top,'',-300,0,700,52,mobile?23:20);this.header.enableWrapText=false;this.header.lineHeight=30;
  const topButton=(key:string,run:()=>void,params:Record<string,string|number>={})=>{const b=this.ui.button(top,key,0,0,96,mobile?88:60,run,params,false,false,true,0,true);this.topControls.push(b);b.label.fontSize=mobile?24:20;};
  topButton('ui.speed',()=>{const s=this.sim.settings,options=[1,2,4]as const;s.speed=options[(options.indexOf(s.speed)+1)%3];},{speed:1});
  topButton('week.journal',()=>this.sim.state.life?this.openLife('journal'):this.open('Character'));
  topButton('ui.build',()=>this.toggleBuild());topButton('ui.menu',()=>this.open('Pause'));
  this.statusTray=this.ui.create('PaperRow',this.hud);this.ui.block(this.statusTray);
  this.statusToggle=this.ui.button(this.hud,'ui.status',0,0,112,88,()=>{this.statusExpanded=!this.statusExpanded;this.resetInput();this.safeLayout();this.layoutChanged?.();},{},false,false,true,0,true);this.statusToggle.label.fontSize=mobile?23:20;const chevron=this.ui.create('PaperRow',this.statusToggle.node,0,0,12,12);this.statusChevron=chevron.addComponent(Graphics);
  const need=this.ui.create('PaperRow',this.hud,0,0,112,400);this.ui.block(need);
  NEED_KEYS.forEach((key,i)=>{this.needLabels.push(this.ui.label(need,'ui.'+key,0,174-i*68,88,30,mobile?22:19));const bar=this.ui.create('PaperRow',need,0,148-i*68,88,12).addComponent(Graphics);this.needBars.push(bar);});
  this.moodLabel=this.ui.label(need,'',0,-124,88,32,mobile?23:20);this.moodLabel.color=new Color('#625746');
  const collection=this.ui.button(this.hud,'week.collectionCompact',0,0,112,88,()=>this.openLife('collection'),{},false,false,true,0,true);collection.key='week.collection';collection.label.fontSize=mobile?23:19;this.weeklyButton=collection.node;this.weeklyControl=collection;
  this.weeklyHint=this.ui.label(this.hud,'',0,0,112,40,mobile?21:18);this.weeklyHint.lineHeight=26;this.weeklyHint.enableWrapText=false;
  this.gestureHint=this.ui.label(this.hud,mobile?'ui.swipeJump':'ui.keyboardJump',0,0,120,28,mobile?22:14,HorizontalTextAlignment.CENTER);this.gestureHint.color=new Color('#817563');
 }
 private toggleBuild():void{
  if(this.sim.state.scene!=='home'){this.toast('ui.buildOutside');return;}
  if(this.buildMode){this.buildMode=false;this.buildType=null;this.overlay=null;this.clearPanels();}
  else{this.buildMode=true;this.buildCatalogExpanded=true;this.overlay=null;this.renderBuildPanel();}
  this.safeLayout();this.layoutChanged?.();this.resetInput();this.syncVisibility();
 }
 private renderBuildPanel():void{
  this.clearPanels();const mobile=this.platform.touch,f=this.sceneFrame,safe=this.platform.viewport.safe,size=view.getVisibleSize();
  const h=this.buildCatalogExpanded?160:84,w=f.room.right-f.room.left,n=this.ui.create('Build',this.panels,(f.room.left+f.room.right)/2,-size.height/2+safe.y+h/2+8,w,h);this.buildPanel=n;n.name='FurnitureCatalog';this.ui.paper(n,w,h);this.ui.block(n);
  const add=(key:string,x:number,bw:number,run:()=>void)=>{const b=this.ui.button(n,key,x,0,bw,88,run,{},false,false,true);b.label.fontSize=mobile?25:19;this.buttons.push(b);return b;};
  if(this.buildCatalogExpanded){
   const title=this.ui.display(n,'ui.build',-w/2+84,42,136,40,mobile?30:24);title.lineHeight=38;
   const hint=this.ui.label(n,'ui.buildPick',-w/2+84,-24,136,60,mobile?22:17);hint.lineHeight=30;hint.color=new Color('#746653');
   const items=Object.entries(this.content.furniture).filter(([,d])=>d.buildable),available=w-264,gap=12,bw=(available-gap*(items.length-1))/items.length;
   items.forEach(([id,d],i)=>{
    const run=()=>{if(this.sim.state.money<d.price)return;this.buildType=id;this.buildCatalogExpanded=false;this.renderBuildPanel();};
    const x=-w/2+164+bw/2+i*(bw+gap),b=this.ui.button(n,'',x,0,bw,144,run,{},false,false,true);b.key='build.select.'+id;b.label.node.active=false;b.setEnabled?.(this.sim.state.money>=d.price);this.buttons.push(b);
    const art=this.ui.create('PaperRow',b.node,0,26,72,64),scale=Math.min(88/(d.w+32),64/(d.h+28));void ArtAssets.paint(art,'furniture/'+id,(d.w+32)*scale,(d.h+28)*scale);
    const name=this.ui.label(b.node,d.name,0,-20,bw-12,32,mobile?24:18,HorizontalTextAlignment.CENTER);name.lineHeight=30;
    const price=this.ui.label(b.node,this.t('ui.buildPrice',{price:d.price})+(this.sim.state.money<d.price?' · '+this.t('ui.buildUnaffordable'):''),0,-52,bw-10,28,mobile?20:15,HorizontalTextAlignment.CENTER);price.lineHeight=26;price.color=new Color(this.sim.state.money<d.price?'#9a735f':'#746653');
   });
   const done=this.ui.closeButton(n,w/2-50,0,88,88,()=>this.toggleBuild());this.buttons.push(done);
  }else{
   const d=this.content.furniture[this.buildType!];
   const chosen=this.ui.label(n,this.t('ui.buildSelected',{name:d.name,price:d.price}),-w/2+250,17,464,38,mobile?26:21);chosen.lineHeight=34;
   const hint=this.ui.label(n,mobile?'ui.buildPlaceHint':'ui.buildDesktopHint',-w/2+250,-20,464,32,mobile?22:16);hint.lineHeight=28;hint.enableWrapText=false;hint.color=new Color('#746653');
   add('ui.buildChange',w/2-370,160,()=>{this.buildCatalogExpanded=true;this.renderBuildPanel();});
   add('ui.cancel',w/2-194,160,()=>{this.buildType=null;this.buildCatalogExpanded=true;this.renderBuildPanel();});
   const done=add('ui.buildFinish',w/2-50,112,()=>this.toggleBuild());done.select(true);
  }
  this.safeLayout();this.layoutChanged?.();this.resetInput();
 }
 private buildPoint(event:EventTouch|EventMouse):{x:number;y:number}{const p=event.getUILocation(),size=view.getVisibleSize();return scenePoint(p.x,p.y,size.width,size.height,this.sceneFrame);}
 private overUI(p:{x:number;y:number}):boolean{
  if(this.platform.touch?(p.x<0||p.x>1280||p.y<0||p.y>720):p.y<56)return true;
  const frame=this.sceneFrame,x=frame.x+(p.x-640)*frame.scaleX,y=frame.y+(360-p.y)*frame.scaleY;
  if(x<frame.room.left||x>frame.room.right||y>frame.room.top||y<frame.room.bottom)return true;
  if(this.buildPanel?.activeInHierarchy){const tr=this.buildPanel.getComponent(UITransform)!;if(Math.abs(x-this.buildPanel.position.x)<=tr.width/2&&Math.abs(y-this.buildPanel.position.y)<=tr.height/2)return true;}
  return this.root.getComponentsInChildren(Button).some(b=>{if(!b.node.activeInHierarchy)return false;const t=b.node.getComponent(UITransform)!,pos=b.node.worldPosition,scale=b.node.worldScale;return Math.abs(x-pos.x)<=t.width*scale.x/2&&Math.abs(y-pos.y)<=t.height*scale.y/2;});
 }
 private place(x:number,y:number):void{if(this.buildType){this.sim.dispatch({type:'PlaceFurniture',furnitureId:this.buildType,x,y});if(this.sim.state.money<this.content.furniture[this.buildType].price){this.buildType=null;this.buildCatalogExpanded=true;this.renderBuildPanel();}}else this.toast('ui.buildChoose');}
 private pointerDown(event:EventTouch|EventMouse):void{
  const isTouch=event instanceof EventTouch&&this.platform.touch;
  if(isTouch&&event.getAllTouches().length>1){this.pointer=null;return;}
  const p=this.buildPoint(event);this.buildPointNow=p;if(this.entry||this.overUI(p)||this.page||this.overlay||this.sim.state.panel||this.rotate.active)return;
  const screen=event.getUILocation(),scale=this.platform.viewport.scale;
  this.pointer={...p,time:0,removed:false,screenX:screen.x*scale,screenY:screen.y*scale,startedAt:performance.now(),touchId:isTouch?event.getID():null,touch:isTouch};
 }
 private pointerUp(event:EventTouch|EventMouse):void{
  const start=this.pointer;this.pointer=null;if(!start||this.paused&&!this.buildMode||this.overUI(this.buildPoint(event)))return;
  if(start.touch&&(!(event instanceof EventTouch)||event.getID()!==start.touchId))return;
  const p=this.buildPoint(event);if(start.removed)return;
  if(this.buildMode){if(Math.hypot(p.x-start.x,p.y-start.y)<=16)this.place(p.x,p.y);return;}
  const screen=event.getUILocation(),scale=this.platform.viewport.scale;
  const gesture=sceneGesture({x:start.screenX,y:start.screenY,time:start.startedAt},{x:screen.x*scale,y:screen.y*scale,time:performance.now()});
  if(start.touch&&gesture==='jump'){this.resetInput();this.sim.dispatch({type:'Jump'});return;}
  if(gesture==='tap'&&!this.paused&&!this.sim.state.panel)this.walkTo(p.x,p.y);
 }
 private walkTo(x:number,y:number):void{
  const s=this.sim.state,h=this.sim.house;
  let tx=x,ty=this.sim.floorHeights.reduce((a,b)=>Math.abs(a-y)<Math.abs(b-y)?a:b),interact=false;
  if(s.scene==='home'){
   const candidates=s.placed.filter(f=>{const d=this.content.furniture[f.furnitureId];return d.use&&Math.abs(x-f.x)<d.w/2+10&&y>=f.y-d.h-12&&y<=f.y+10;}).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));
   if(candidates[0]){tx=candidates[0].x;ty=candidates[0].y;interact=true;}
   if(this.sim.npcActive()&&Math.abs(x-this.content.npc.x)<24&&y>h.f1-90&&y<h.f1+10){tx=this.content.npc.x;ty=h.f1;interact=true;}
   if(Math.abs(x-h.doorX+30)<40&&y>h.f1-130&&y<h.f1+10){tx=h.doorX-8;ty=h.f1;interact=true;}
   tx=Math.max(h.x1+24,Math.min(h.x2-24,tx));
  }else{
   const prop=this.content.scenes[s.scene].props.find(p=>Math.abs(x-p.x)<p.w/2&&y>p.y-p.h-10&&y<p.y+10);if(prop){tx=prop.x;ty=prop.y;interact=true;}
  }
  this.destination={x:tx,y:ty,interact,scene:s.scene};
 }
 private advancePointer():void{
  const d=this.destination,s=this.sim.state;if(!d)return;
  if(this.paused||s.panel||d.scene!==s.scene){this.destination=null;this.sim.dispatch({type:'Move',x:0,y:0});return;}
  const p=s.player,lad=this.sim.ladder;
  // Keep horizontal intent until both feet have crossed the ladder opening.
  if(lad&&d.crossing!==undefined){
   if(Math.abs(p.x-d.crossing)>12){this.sim.dispatch({type:'Move',x:Math.sign(d.crossing-p.x),y:0});return;}
   this.sim.dispatch({type:'Move',x:0,y:0});if(!p.grounded)return;delete d.crossing;
  }
  if(lad&&d.y<Math.max(...this.sim.floorHeights)&&Math.abs(p.y-d.y)<=15&&p.x>lad.x1-12&&p.x<lad.x2+12){
   const side=d.x<(lad.x1+lad.x2)/2?-1:1;
   d.crossing=side<0?lad.x1-35:lad.x2+35;
   this.sim.dispatch({type:'Jump'});this.sim.dispatch({type:'Move',x:side,y:0});return;
  }
  if(Math.abs(d.y-p.y)>8&&lad){
   const x=(lad.x1+lad.x2)/2;if(Math.abs(p.x-x)>12){this.sim.dispatch({type:'Move',x:Math.sign(x-p.x),y:0});return;}
   this.sim.dispatch({type:'Move',x:0,y:Math.sign(d.y-p.y)});return;
  }
  if(Math.abs(p.x-d.x)>12){this.sim.dispatch({type:'Move',x:Math.sign(d.x-p.x),y:0});return;}
  this.sim.dispatch({type:'Move',x:0,y:0});this.destination=null;if(d.interact)this.sim.dispatch({type:'Interact'});
 }
 private bindInput():void{
  this.platform.blockContextMenu(()=>this.buildMode);
  input.on(Input.EventType.MOUSE_MOVE,(e:EventMouse)=>{this.buildPointNow=this.buildPoint(e);});
  input.on(Input.EventType.TOUCH_MOVE,(e:EventTouch)=>{this.buildPointNow=this.buildPoint(e);});
  input.on(Input.EventType.KEY_DOWN,(e:EventKeyboard)=>this.keyDown(e));input.on(Input.EventType.KEY_UP,(e:EventKeyboard)=>this.keyUp(e));
  // Creator emits simulated touches before the matching mouse event.
  // A released pointer is consumed once; right mouse down cancels its simulated
  // touch so right mouse up cannot place the recycled item again.
  input.on(Input.EventType.TOUCH_START,(e:EventTouch)=>this.pointerDown(e));
  input.on(Input.EventType.TOUCH_END,(e:EventTouch)=>this.pointerUp(e));
  input.on(Input.EventType.TOUCH_CANCEL,()=>{this.pointer=null;this.resetInput();});
  input.on(Input.EventType.MOUSE_UP,(e:EventMouse)=>{if(e.getButton()===0)this.pointerUp(e);});
  input.on(Input.EventType.MOUSE_DOWN,(e:EventMouse)=>{
   if(e.getButton()===0){if(!this.pointer)this.pointerDown(e);return;}
   this.pointer=null;
   if(this.buildMode&&!this.overlay&&e.getButton()===2){const p=this.buildPoint(e);if(!this.overUI(p))this.sim.dispatch({type:'RemoveFurniture',x:p.x,y:p.y});}
  });
 }
 private direction(code:KeyCode):keyof typeof this.held|null{return ({[KeyCode.KEY_A]:'left',[KeyCode.ARROW_LEFT]:'left',[KeyCode.KEY_D]:'right',[KeyCode.ARROW_RIGHT]:'right',[KeyCode.KEY_W]:'up',[KeyCode.ARROW_UP]:'up',[KeyCode.KEY_S]:'down',[KeyCode.ARROW_DOWN]:'down'} as Partial<Record<KeyCode,keyof typeof this.held>>)[code]??null;}
 private keyDown(e:EventKeyboard):void{const code=e.keyCode;this.buttons=this.buttons.filter(b=>b.node.isValid&&b.node.activeInHierarchy&&b.node.getComponent(Button)?.interactable!==false);if(this.focus>=this.buttons.length)this.focus=0;if(this.entry){if(this.rotate.active)return;if([KeyCode.ESCAPE,KeyCode.ENTER,KeyCode.SPACE].includes(code))this.entry.skip();else if(code===KeyCode.TAB)this.entry.skipButton.focus(true);return;}if(this.overlay==='Code'&&code!==KeyCode.ESCAPE)return;if(this.rotate.active)return;if(this.page==='Prologue'&&[KeyCode.ENTER,KeyCode.SPACE,KeyCode.KEY_E].includes(code)){this.proNext();return;}if(this.page||this.overlay||this.sim.state.panel){if(code===KeyCode.ESCAPE){if(this.overlay||!this.page)this.close();else if(this.page!=='Title')this.renderTitle();return;}if(this.overlay==='Settings'&&[KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].includes(code)&&this.buttons[this.focus]?.adjust){this.buttons[this.focus].adjust!(code===KeyCode.ARROW_RIGHT?1:-1);return;}if(code===KeyCode.TAB||[KeyCode.ARROW_DOWN,KeyCode.ARROW_UP,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].includes(code)){const direction=code===KeyCode.ARROW_UP||code===KeyCode.ARROW_LEFT?-1:1;this.focus=(this.focus+direction+this.buttons.length)%this.buttons.length;this.highlightFocus();return;}if(code===KeyCode.ENTER||code===KeyCode.SPACE){this.buttons[this.focus]?.activate();return;}return;}if(this.direction(code))this.destination=null;if(code===KeyCode.KEY_B){this.toggleBuild();return;}if(code===KeyCode.ESCAPE){if(this.buildMode)this.toggleBuild();else this.open('Pause');return;}if(this.buildMode){if(code===KeyCode.TAB){this.focus=(this.focus+1)%Math.max(1,this.buttons.length);this.highlightFocus();}else if(code===KeyCode.ENTER)this.buttons[this.focus]?.activate();return;}if(this.sim.state.life&&code===KeyCode.KEY_J){this.openLife('journal');return;}if(this.sim.state.life&&code===KeyCode.KEY_I){this.openLife('collection');return;}const dir=this.direction(code);if(dir){this.held[dir]=true;this.emitMove();return;}if(code===KeyCode.SPACE)this.sim.dispatch({type:'Jump'});if(code===KeyCode.KEY_E)this.sim.dispatch({type:'Interact'});if(code===KeyCode.KEY_C)this.open('Character');if(code===KeyCode.KEY_H)this.open('Help');}
 private keyUp(e:EventKeyboard):void{const dir=this.direction(e.keyCode);if(dir){this.held[dir]=false;this.emitMove();}}
 private highlightFocus():void{this.buttons.forEach((b,i)=>{if(b.node.isValid)b.focus(i===this.focus);});}
 private orientation():void{this.safeLayout();this.ui.clear(this.rotate);this.rotate.active=this.platform.touch&&this.platform.portrait;if(this.rotate.active){this.resetInput();this.ui.fullSurface(this.rotate,'#f3eddf','#cbbda4');const title=this.ui.display(this.rotate,'ui.rotate',0,105,1060,130,72,HorizontalTextAlignment.CENTER);title.lineHeight=98;const hint=this.ui.label(this.rotate,'ui.rotateHint',0,-70,1020,220,48,HorizontalTextAlignment.CENTER);hint.lineHeight=70;hint.color=new Color('#756b5c');}this.syncVisibility();}
 private safeLayout():void{
  const f=this.sceneFrame,r=f.rail,size=view.getVisibleSize(),safe=this.platform.viewport.safe,safeLeft=-size.width/2+safe.x,headerRight=r.left;
  this.buildView.node.setPosition(f.x-640*f.scaleX,f.y+360*f.scaleY);this.buildView.node.setScale(f.scaleX,f.scaleY,1);this.buildView.setHorizontalCompensation(f.scaleY/f.scaleX);
  const headerWidth=headerRight-safeLeft;
  if(this.hudTop){this.hudTop.setPosition((safeLeft+headerRight)/2,r.top-f.headerHeight/2);this.hudTop.getComponent(UITransform)!.setContentSize(headerWidth,f.headerHeight);this.ui.box(this.hudTop,headerWidth,f.headerHeight,'#f6f0e4e8','#00000000');}
  this.header!.node.setPosition(-headerWidth/2+16+(headerWidth-420)/2,0);this.header!.node.getComponent(UITransform)!.setContentSize(headerWidth-420,52);
  this.topControls.forEach((b,i)=>b.node.setPosition(headerWidth/2-52-(3-i)*100,0));
  if(this.statusTray){this.statusTray.setPosition(r.x,(r.top+r.bottom)/2);this.statusTray.getComponent(UITransform)!.setContentSize(r.width,r.top-r.bottom);const g=this.ui.box(this.statusTray,r.width,r.top-r.bottom,'#f6f0e4ee','#00000000');g.strokeColor=new Color('#b9ad9666');g.lineWidth=1;g.moveTo(-r.width/2,-(r.top-r.bottom)/2);g.lineTo(-r.width/2,(r.top-r.bottom)/2);g.stroke();}
  if(this.statusToggle){this.statusToggle.node.setPosition(r.x,r.top-54);this.statusToggle.node.getComponent(UITransform)!.setContentSize(r.width-12,88);this.statusToggle.label.string=this.t(this.statusExpanded?'ui.status':'ui.statusExpand');this.statusToggle.select(false);this.statusToggle.label.node.setPosition(-10,0);this.statusToggle.label.node.getComponent(UITransform)!.setContentSize(r.width-40,48);if(this.statusChevron){const g=this.statusChevron;g.node.setPosition(r.width/2-18,0);g.clear();g.strokeColor=new Color('#625746');g.lineWidth=1.5;if(this.statusExpanded){g.moveTo(-4,2);g.lineTo(0,-2);g.lineTo(4,2);}else{g.moveTo(-2,-4);g.lineTo(2,0);g.lineTo(-2,4);}g.stroke();}}
  const needs=this.needLabels[0]?.node.parent;if(needs){needs.active=this.statusExpanded;needs.setPosition(r.x,r.top-300);needs.getComponent(UITransform)!.setContentSize(r.width-20,400);}
  for(const label of [...this.needLabels,this.moodLabel!])label.node.getComponent(UITransform)!.setContentSize(r.width-28,32);
  if(this.weeklyHint){this.weeklyHint.node.active=this.statusExpanded&&!!this.sim.state.life;this.weeklyHint.node.setPosition(r.x,r.top-478);this.weeklyHint.node.getComponent(UITransform)!.setContentSize(r.width-24,40);}
  if(this.weeklyButton){this.weeklyButton.active=this.statusExpanded&&!!this.sim.state.life;this.weeklyButton.setPosition(r.x,r.bottom+188);this.weeklyButton.getComponent(UITransform)!.setContentSize(r.width-16,88);}
  if(this.gestureHint){this.gestureHint.node.active=this.statusExpanded;this.gestureHint.node.setPosition(r.x,r.bottom+130);this.gestureHint.node.getComponent(UITransform)!.setContentSize(r.width-12,32);}
  document.documentElement.style.setProperty('--fusheng-rail-width',r.width*this.platform.viewport.scale+'px');
 }
 private syncVisibility():void{this.pagePaper.active=!!this.page&&!this.entry;this.surface.active=!!this.page&&!this.entry;this.panels.active=!this.entry;this.hud.active=!this.page&&!this.entry;this.touch.active=this.platform.touch&&!this.entry&&!this.page&&!this.overlay&&!this.sim.state.panel&&!this.buildMode;}
 toast(key:string,params:Record<string,string|number>={}):void{
  this.ui.clear(this.toasts);const text=this.t(key,params),w=Math.min(900,Math.max(160,text.length*(this.platform.touch?25:13)+38)),n=this.ui.create('PaperRow',this.toasts,0,this.platform.touch?-112:-244,w,this.platform.touch?76:34);
  this.ui.box(n,w,this.platform.touch?76:34,'#2b2a26ec','#2b2a26ec');this.ui.label(n,key,0,0,w-22,this.platform.touch?72:30,this.platform.touch?26:13,HorizontalTextAlignment.CENTER,params).color=new Color('#f6f0e4');this.toastTTL=3;
 }
 update(dt:number):void{const layoutKey=this.sim.state.scene+':'+this.sim.state.house+':'+this.buildMode+':'+this.buildCatalogExpanded;if(layoutKey!==this.sceneLayoutKey){this.sceneLayoutKey=layoutKey;this.safeLayout();this.layoutChanged?.();}this.platform.audio.sync(musicForScene(this.sim.state,this.page));if(this.entry){this.sim.paused=true;this.entry.update(dt,!this.hidden&&!this.rotate.active);return;}this.advancePointer();this.buildView.update(this.sim,this.buildMode&&!this.overlay,this.buildType,this.buildPointNow.x,this.buildPointNow.y);this.sim.paused=this.paused;this.autosave+=dt;if(this.autosave>=this.content.rules.autosaveSeconds){this.autosave=0;this.save();}if(this.toastTTL>0){this.toastTTL-=dt;if(this.toastTTL<=0)this.ui.clear(this.toasts);}if(this.pointer&&this.buildMode&&this.platform.touch){this.pointer.time+=dt;if(this.pointer.time>=this.content.rules.build.longPress&&!this.pointer.removed){this.sim.dispatch({type:'RemoveFurniture',x:this.pointer.x,y:this.pointer.y});this.pointer.removed=true;}}
  const signature=JSON.stringify(this.sim.state.panel);if(!this.page&&!this.overlay&&!this.buildMode&&signature!==this.lastPanel){this.lastPanel=signature;if(this.sim.state.panel)this.corePanel(this.sim.state.panel);else this.clearPanels();this.syncVisibility();}
  if(this.preview?.isValid&&this.previewLook)this.preview.present(this.sim,this.i18n,dt,false,this.previewLook);
  if(this.page)return;this.lastHUD+=dt;const s=this.sim.state;if(this.lastHUD>=.1){this.lastHUD=0;const c=this.content.characters.find(c=>c.id===s.charId)!;const clock=String(Math.floor(s.clock/60)%24).padStart(2,'0')+':'+String(Math.floor(s.clock%60)).padStart(2,'0');if(this.header)this.header.string=this.t('ui.hudMobile',{name:c.name,age:s.age,clock,money:s.money,week:s.week,day:s.day,scene:s.scene==='home'?'ui.home':this.content.scenes[s.scene].name});if(this.header&&s.action)this.header.string+=' · '+this.t(this.content.furniture[s.action.furnitureId].use!.label)+' '+Math.round(s.action.elapsed/s.action.duration*100)+'%';const speed=this.topControls.find(b=>b.key==='ui.speed')?.label;if(speed)speed.string=this.t('ui.speed',{speed:this.sim.settings.speed});const dark=this.sim.darkness()>.2;for(const b of [this.weeklyControl,this.promptButton,this.touchJump,this.touchAction])b?.tone?.(dark&&!this.platform.touch);if(this.weeklyHint){this.weeklyHint.color=new Color(dark&&!this.platform.touch&&this.content.scenes[s.scene]?.outdoor?'#fff0d4':'#443b2d');this.weeklyHint.node.active=!!s.life&&this.statusExpanded;this.weeklyHint.string=s.life?this.t('week.railFocus',{focus:s.life.focus,theme:this.sim.life.theme.name,day:s.day}):'';}if(this.weeklyButton)this.weeklyButton.active=!!s.life&&this.statusExpanded;if(s.life){const title=this.hud.getComponentsInChildren(Label).find(l=>l.string===this.t('ui.character')||l.string===this.t('week.journal'));if(title)title.string=this.t('week.journal');}const daily=this.taskLabels[0]?.node.parent;if(daily)daily.active=!s.life&&(!this.platform.touch||this.statusExpanded);if(this.moodLabel)this.moodLabel.string=this.t('ui.'+this.sim.mood().key);const near=this.sim.near();if(this.prompt&&this.promptButton){const show=!this.platform.touch&&!!near&&!this.overlay&&!s.panel&&!this.buildMode;this.promptButton.node.active=show;if(near&&show){const h=near.kind==='furniture'?this.content.furniture[near.id].h:near.kind==='npc'?84:70;this.promptButton.node.setPosition(Math.max(-560,Math.min(560,near.x-640)),360-near.y+h+22);this.prompt.string=(this.platform.touch?'':'[E] ')+this.t(near.label).split(' · ')[0];}}if(this.taskCount)this.taskCount.string=s.tasks.filter(t=>t.done).length+'/'+s.tasks.length;if(this.touchAction){const short=s.scene==='book'&&near?({book_0:'book.leaveAction',book_1:'book.readAction',book_2:'book.buyAction',book_3:'book.chatAction',book_read:'book.readAction'} as Record<string,string>)[near.id]:undefined;this.touchAction.label.string=this.t(short??near?.label??'ui.interact');}if(this.actionLabel)this.actionLabel.string=s.action?this.t(this.content.furniture[s.action.furnitureId].use!.label)+'　'+Math.round(s.action.elapsed/s.action.duration*100)+'%':'';}
  NEED_KEYS.forEach((k,i)=>{this.shownNeeds[i]+=(s.needs[k]-this.shownNeeds[i])*(1-Math.exp(-dt/.12));this.needLabels[i].string=this.t('ui.'+k);const g=this.needBars[i],w=this.sceneFrame.rail.width-28;g.clear();g.fillColor=new Color('#e8dfce');g.roundRect(-w/2,-5,w,10,5);g.fill();g.strokeColor=new Color('#b7ac9866');g.lineWidth=1;g.roundRect(-w/2,-5,w,10,5);g.stroke();g.fillColor=new Color(this.shownNeeds[i]<25?'#a6402f':['#98a18a','#ca9a82','#9bafb7','#c7ab74'][i]);const fill=Math.max(0,Math.min(w,w*this.shownNeeds[i]/100));if(fill>0){g.roundRect(-w/2,-5,fill,10,Math.min(5,fill/2));g.fill();}});
 }
 handleEvents():void{for(const e of this.sim.drainEvents()){if(e.type==='Toast')this.toast(e.key,e.params);if(e.type==='SaveRequested')this.save();}}
 debugStart():void{const q=this.platform.query;this.selectedChar=q.get('char')??'ding';this.pendingSlot=1;this.newGame();this.page=null;this.ui.clear(this.surface);this.clearPanels();this.sim.state.panel=null;const s=this.sim.state;s.introSeen=true;const house=q.get('house');if(house&&this.content.houses[house]){s.house=house as typeof s.house;s.placed=JSON.parse(JSON.stringify(this.sim.house.placed));this.sim.resetPlayer();}const age=Number(q.get('age'));if(age>=7&&age<=30){s.age=age;s.week=Math.max(1,age-6);s.growth={body:s.week,mind:s.week,charm:Math.max(0,s.week-7)};}const scene=q.get('scene');if(scene&&this.content.scenes[scene])this.sim.dispatch({type:'Travel',scene:scene as SceneId});const hour=q.get('hour');if(hour!==null&&Number.isFinite(Number(hour)))s.clock=Number(hour)*60;if(q.get('at')==='door'){s.player.x=this.sim.house.doorX-20;s.player.y=this.sim.house.f1;}
 const panel=q.get('panel');if(panel==='origin')s.panel={kind:'Origin'};if(panel==='char')this.open('Character');if(panel==='help')this.open('Help');if(panel==='pause')this.open('Pause');if(panel==='summary')this.sim.endDay(false);if(panel==='legacy')s.panel={kind:'Legacy'};if(panel==='birthday'){s.day=7;this.sim.endDay(false);this.sim.dispatch({type:'Continue'});}if(panel==='event')this.sim.triggerRandomEvent(true);if(panel==='twist')s.panel={kind:'Twist',id:this.content.twists[0].id};if(panel==='story')s.panel={kind:'Story',id:this.content.story[0].id};if(panel==='build')this.toggleBuild();if(panel==='prologue'){this.proBeat=Math.max(0,Math.min(5,Number(q.get('beat')??0)));this.renderPrologue();}this.lastPanel='';this.syncVisibility();}
}
