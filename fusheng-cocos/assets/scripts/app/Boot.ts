import { _decorator, Canvas, Camera, Color, Component, Director, JsonAsset, Label, Layers, Node, ResolutionPolicy, UITransform, director, profiler, resources, view } from 'cc';
import { runSelfTest } from '../core/SelfTest';
import { Content, Command } from '../core/Types';
import { I18n } from '../data/I18n';
import { SaveService } from '../platform/SaveService';
import { WebPlatform } from '../platform/WebPlatform';
import type { MusicCatalog } from '../platform/GameMusic';
import { UIFactory } from '../ui/UIFactory';
import { GameUI } from '../ui/GameUI';
import { ArtAssets } from '../view/ArtAssets';
import { WorldView } from '../view/WorldView';
import { displayLayout } from '../platform/DisplayLayout';
const {ccclass}=_decorator;
@ccclass('Boot')
export class Boot extends Component {
 private loadingNotified=false;
 private ui:GameUI|null=null;private world:WorldView|null=null;private lastSim:GameUI['sim']|null=null;private frameTimes:number[]=[];private frameCount=0;private platform:WebPlatform|null=null;
 async start():Promise<void>{
  view.enableRetina(true);view.resizeWithBrowserSize(true);
  const root=new Node('Canvas');root.layer=Layers.Enum.UI_2D;this.node.addChild(root);root.addComponent(UITransform).setContentSize(1280,720);
  const fit=()=>{const frame=view.getFrameSize(),size=displayLayout(frame.width,frame.height);view.setDesignResolutionSize(size.width,size.height,ResolutionPolicy.SHOW_ALL);root.getComponent(UITransform)!.setContentSize(size.width,size.height);};
  fit();view.on('canvas-resize',fit,this);this.node.once(Node.EventType.NODE_DESTROYED,()=>view.off('canvas-resize',fit,this));
  const cameraNode=new Node('Camera');root.addChild(cameraNode);cameraNode.setPosition(0,0,1000);const camera=cameraNode.addComponent(Camera);camera.projection=Camera.ProjectionType.ORTHO;camera.orthoHeight=360;camera.near=1;camera.far=2000;camera.clearFlags=Camera.ClearFlag.SOLID_COLOR;camera.clearColor=new Color('#f3eddf');camera.visibility=Layers.Enum.UI_2D;root.addComponent(Canvas).cameraComponent=camera;
  const platform=new WebPlatform();this.platform=platform;if(platform.query.get('profiler')!=='1')profiler.hideStats();
  const asset=await new Promise<JsonAsset>((resolve,reject)=>resources.load('config/content',JsonAsset,(error,asset)=>error?reject(error):resolve(asset)));
  const music=await new Promise<JsonAsset>((resolve,reject)=>resources.load('config/music',JsonAsset,(error,asset)=>error?reject(error):resolve(asset)));platform.audio.configure(music.json as MusicCatalog);
  const content=asset.json as Content;const i18n=new I18n(content.i18n),factory=new UIFactory(i18n,platform.touch);await factory.load();
  const saves=new SaveService(platform.storage,content,()=>platform.now(),()=>platform.id());const migrationErrors=saves.migrateAll();
  const displayPaper=new Node('DisplayPaper');displayPaper.layer=Layers.Enum.UI_2D;root.addChild(displayPaper);factory.background(displayPaper);
  const worldRoot=new Node('SceneView');worldRoot.layer=Layers.Enum.UI_2D;root.addChild(worldRoot);const uiRoot=new Node('UILayer');uiRoot.layer=Layers.Enum.UI_2D;root.addChild(uiRoot);
  const ui=new GameUI(uiRoot,content,factory,i18n,saves,platform);this.ui=ui;this.lastSim=ui.sim;this.world=new WorldView(worldRoot,factory,i18n,ui.sim);
  const fitScene=()=>{const frame=ui.sceneFrame;worldRoot.setPosition(frame.x,frame.y);worldRoot.setScale(frame.scaleX,frame.scaleY,1);this.world!.setHorizontalCompensation(frame.scaleY/frame.scaleX);};ui.layoutChanged=fitScene;fitScene();platform.resize(fitScene);
  const q=platform.query;if(q.get('skip')==='1'||q.get('selftest')==='1')ui.debugStart();if(q.get('screen')==='load')ui.renderSaveSelect();if(q.get('screen')==='create')ui.activate('ui.new');
  const selftest=q.get('selftest')==='1'?runSelfTest(content):null;
  platform.exposeDebug({selftest,get display(){return {visible:view.getVisibleSize(),viewport:view.getViewportRect(),scale:view.getScaleX(),dpr:view.getDevicePixelRatio(),safe:platform.viewport.safe};},get music(){return platform.audio.status;},get artPending(){return ArtAssets.pending;},get state(){return ui.sim.state;},get settings(){return ui.sim.settings;},get screen(){return ui.activePage;},get buttons(){return ui.buttonInfo;},get frameTimes(){return thisBoot.frameTimes.slice();},get frameCount(){return thisBoot.frameCount;},command:(command:Command)=>ui.sim.dispatch(command),click:(key:string)=>ui.activate(key),save:()=>ui.save(),content,saves,ui});const thisBoot=this;
  if(migrationErrors.length)ui.toast('ui.corrupt');if(selftest)ui.toast('ui.selftest',{passed:selftest.filter(c=>c.passed).length,total:selftest.length});
 }
 onDestroy():void{this.platform?.audio.dispose();}
 update(dt:number):void {if(!this.ui||!this.world)return;this.frameCount++;this.frameTimes.push(dt);if(this.frameTimes.length>300)this.frameTimes.shift();this.ui.update(dt);this.ui.sim.advance(dt);this.ui.handleEvents();if(this.lastSim!==this.ui.sim){this.lastSim=this.ui.sim;this.world.setSim(this.ui.sim);}this.world.update(dt);
  if(!this.loadingNotified&&this.frameCount>1&&ArtAssets.pending===0&&this.world.ready){this.loadingNotified=true;director.once(Director.EVENT_AFTER_DRAW,()=>window.dispatchEvent(new Event('fusheng:ready')));}
 }
}
