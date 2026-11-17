import { BufferAsset, game, Game, resources, sys, view } from 'cc';
import { StorageDriver } from './SaveService';
import { GameMusic } from './GameMusic';
export class WebPlatform {
 private readonly insets=document.createElement('div');
 readonly kind='web';
 constructor(){game.canvas?.focus();this.insets.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding: max(env(safe-area-inset-top,0px),var(--native-safe-top,0px)) max(env(safe-area-inset-right,0px),var(--native-safe-right,0px)) max(env(safe-area-inset-bottom,0px),var(--native-safe-bottom,0px)) max(env(safe-area-inset-left,0px),var(--native-safe-left,0px))';document.body.appendChild(this.insets);}
 readonly storage:StorageDriver={get:key=>sys.localStorage.getItem(key),set:(key,value)=>sys.localStorage.setItem(key,value),setSync:(key,value)=>sys.localStorage.setItem(key,value),remove:key=>sys.localStorage.removeItem(key)};
 readonly audio=new GameMusic(resource=>new Promise<ArrayBuffer>((resolve,reject)=>resources.load(resource,BufferAsset,(error,asset)=>{if(error){reject(error);return;}const buffer=asset.buffer().slice(0);resources.release(resource,BufferAsset);resolve(buffer);})));
 readonly query=new URLSearchParams(window.location.search);
 readonly touch=sys.isMobile||this.query.get('touch')==='1'||(navigator.maxTouchPoints>0&&window.matchMedia('(pointer: coarse)').matches);
 get portrait():boolean{return window.innerHeight>window.innerWidth;}
 get reducedMotion():boolean{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
 get viewport():{width:number;height:number;scale:number;safe:{x:number;y:number;width:number;height:number}}{const frame=view.getFrameSize(),size=view.getVisibleSize(),scale=Math.min(frame.width/1280,frame.height/720),style=getComputedStyle(this.insets),left=parseFloat(style.paddingLeft)||0,right=parseFloat(style.paddingRight)||0,top=parseFloat(style.paddingTop)||0,bottom=parseFloat(style.paddingBottom)||0;return {width:frame.width,height:frame.height,scale,safe:{x:left/scale,y:bottom/scale,width:size.width-(left+right)/scale,height:size.height-(top+bottom)/scale}};}
 now():number{return Date.now();}
 id():string{const bytes=crypto.getRandomValues(new Uint8Array(12));return 'sv_'+Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');}
 blockContextMenu(when:()=>boolean):void{game.canvas?.addEventListener('contextmenu',event=>{if(when())event.preventDefault();});}
 onHide(cb:()=>void):void{game.on(Game.EVENT_HIDE,cb);window.addEventListener('blur',cb);window.addEventListener('pagehide',cb);window.addEventListener('beforeunload',cb);}
 onShow(cb:()=>void):void{game.on(Game.EVENT_SHOW,cb);window.addEventListener('focus',cb);}
 async copy(text:string):Promise<boolean>{try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
 async paste():Promise<string|null>{try{return await navigator.clipboard.readText();}catch{return null;}}
 exposeDebug(value:unknown):void{if(this.query.get('test')==='1'||this.query.get('selftest')==='1')(window as unknown as Record<string,unknown>).__FUSHENG__=value;}
 resize(cb:()=>void):void{view.on('canvas-resize',cb);window.addEventListener('resize',cb);window.addEventListener('fusheng:insets',cb);window.visualViewport?.addEventListener('resize',cb);}
}
