import { BlockInputEvents, Button, Color, Graphics, HorizontalTextAlignment, instantiate, Label, Layers, Mask, Node, Prefab, resources, ScrollView, UITransform, UIOpacity, tween, Tween, Vec3, VerticalTextAlignment, view } from 'cc';
import { I18n } from '../data/I18n';
import { ArtAssets } from '../view/ArtAssets';
import { UI_COLORS as C, UI_METRICS as M } from './UITokens';
export interface UIButton {node:Node;label:Label;key:string;activate:()=>void;primary:boolean;focus:(focused:boolean)=>void;select:(selected:boolean)=>void;adjust?:(delta:number)=>void;tone?:(dark:boolean)=>void;resize?:(width:number,height:number)=>void;setEnabled?:(enabled:boolean)=>void;}
export interface UIControlState {width:number;height:number;hovered:boolean;pressed:boolean;focused:boolean;selected:boolean;enabled:boolean;dark:boolean;}
export interface UIControlStyle {primary?:boolean;round?:boolean;quiet?:boolean;inset?:number;textOnly?:boolean;bare?:boolean;contentCard?:boolean;}
export type UIControlPainter = (graphics:Graphics,label:Label,state:Readonly<UIControlState>)=>void;
export const SERIF='"Songti SC","STSong","Noto Serif SC",serif';
export const SANS='"PingFang SC","Microsoft YaHei",sans-serif';
export class UIFactory {
 private readonly fullSurfaces=new Map<Node,{color?:string;stroke?:string;paper?:boolean}>();
 readonly prefabs=new Map<string,Prefab>();
 motionPreference:(()=>boolean)|null=null;
 private reducedMotion=false;
 constructor(readonly i18n:I18n,readonly touch=false){view.on('design-resolution-changed',()=>this.fitSurfaces());}
 async load():Promise<void>{await Promise.all([ArtAssets.frame('ui/paper'),new Promise<void>((resolve,reject)=>resources.loadDir('prefabs',Prefab,(error,assets)=>{if(error){reject(error);return;}for(const p of assets)this.prefabs.set(p.name,p);resolve();}))]);}
 create(name:string,parent:Node,x=0,y=0,w?:number,h?:number):Node{const p=this.prefabs.get(name);if(!p)throw new Error('Missing prefab '+name);const n=instantiate(p);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,y);if(w!==undefined)n.getComponent(UITransform)!.setContentSize(w,h??80);return n;}
 clear(n:Node):void{for(const child of n.children.slice()){child.active=false;child.removeFromParent();child.destroy();}}
 box(n:Node,w:number,h:number,color:string=C.paper,stroke:string=C.border,radius:number=M.paperRadius):Graphics{const g=n.getComponent(Graphics)??n.addComponent(Graphics);g.clear();g.fillColor=new Color(color);g.roundRect(-w/2,-h/2,w,h,Math.max(0,Math.min(radius,w/2,h/2)));g.fill();g.strokeColor=new Color(stroke);g.lineWidth=M.border;g.stroke();return g;}
 paper(n:Node,w:number,h:number):void{
  const g=this.box(n,w,h,C.paper,C.rule,M.paperRadius);
  // Sparse fibres retain the paper material without a ruled-paper texture.
  g.strokeColor=new Color(113,100,81,9);g.lineWidth=.5;
  for(let row=0,y=-h/2+23;y<h/2-12;row++,y+=37){const start=-w/2+18+(row%3)*13;g.moveTo(start,y);g.lineTo(Math.min(w/2-18,start+w*.18),y+.4);g.moveTo(w/2-20-w*.13,y+9);g.lineTo(w/2-20,y+9.3);}g.stroke();
 }
 divider(parent:Node,x:number,y:number,width:number):Node{const n=this.create('PaperRow',parent,x,y,width,1),g=n.getComponent(Graphics)??n.addComponent(Graphics);g.strokeColor=new Color(C.rule);g.lineWidth=.75;g.moveTo(-width/2,0);g.lineTo(width/2,0);g.stroke();return n;}
 background(n:Node):void{const size=view.getVisibleSize(),paper=this.create('PaperRow',n,0,0,size.width,size.height);paper.name='FullPaperBackground';this.fullSurfaces.set(paper,{paper:true});void ArtAssets.paint(paper,'ui/paper',size.width,size.height).then(()=>this.fitSurfaces());}
 fullSurface(n:Node,color?:string,stroke='#00000000'):void{this.fullSurfaces.set(n,{color,stroke});this.fitSurfaces();}
 private fitSurfaces():void{const size=view.getVisibleSize();for(const[n,fill]of this.fullSurfaces){if(!n.isValid){this.fullSurfaces.delete(n);continue;}n.getComponent(UITransform)!.setContentSize(size.width,size.height);if(fill.color)this.box(n,size.width,size.height,fill.color,fill.stroke);}}
 block(n:Node):void{if(!n.getComponent(BlockInputEvents))n.addComponent(BlockInputEvents);}
 label(parent:Node,key:string,x:number,y:number,w:number,h:number,size=14,align:HorizontalTextAlignment=HorizontalTextAlignment.LEFT,params:Record<string,string|number>={}):Label {
  const n=this.create('PaperLabel',parent,x,y,w,h),l=n.getComponent(Label)!;l.string=this.i18n.plain(key,params);l.fontSize=size;l.lineHeight=Math.round(size*1.8);l.color=new Color('#2b2a26');l.fontFamily=SANS;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=true;l.horizontalAlign=align;l.verticalAlign=VerticalTextAlignment.CENTER;return l;
 }
 display(parent:Node,key:string,x:number,y:number,w:number,h:number,size=24,align=HorizontalTextAlignment.LEFT):Label{const l=this.label(parent,key,x,y,w,h,size,align);l.fontFamily=SERIF;return l;}
 sceneLabel(parent:Node,key:string,x:number,y:number,w=96,h=26,dark=false):Label {
  const text=this.i18n.plain(key),size=this.touch?18:14,lines=text.split('\n'),width=Math.min(w,Math.max(...lines.map(line=>line.length))*size+20),height=Math.max(h,lines.length*(size+5)+6);
  const n=this.create('PaperRow',parent,x,y,width,height);n.name='SceneSign_'+key;
  // Open corners keep the scene visible instead of covering it with a plaque.
  const g=n.addComponent(Graphics);g.strokeColor=new Color(dark?'#f3e4c0a0':'#74675165');g.lineWidth=.75;
  for(const side of [-1,1]){const xx=side*width/2;g.moveTo(xx-side*6,height/2);g.lineTo(xx,height/2);g.lineTo(xx,-height/2);g.lineTo(xx-side*6,-height/2);}g.stroke();
  const label=this.display(n,key,0,0,width-12,height,size,HorizontalTextAlignment.CENTER);label.lineHeight=size+5;label.color=new Color(dark?'#fff0d4':'#443b2d');return label;
 }
 button(parent:Node,key:string,x:number,y:number,w:number,h:number,activate:()=>void,params:Record<string,string|number>={},primary=false,round=false,quiet=false,inset=0,textOnly=false):UIButton{
  return this.control(parent,key,x,y,w,h,activate,params,{primary,round,quiet,inset,textOnly});
 }
 /** Shared input and state handling; decorators only draw the control's content. */
 control(parent:Node,key:string,x:number,y:number,w:number,h:number,run:()=>void,params:Record<string,string|number>={},style:UIControlStyle={},decorate?:UIControlPainter):UIButton{
  const n=this.create('PaperButton',parent,x,y,w,h),transform=n.getComponent(UITransform)!,component=n.getComponent(Button)!;
  const base=this.create('PaperRow',n,0,0,w,h),face=this.create('PaperRow',n,0,0,w,h);base.name='ButtonBase';face.name='ButtonFace';
  const baseGraphics=base.addComponent(Graphics),g=face.addComponent(Graphics);
  const l=this.label(n,key,0,0,Math.max(1,w-M.labelInsetX),Math.max(1,h-M.labelInsetY),h<=32?12:14,HorizontalTextAlignment.CENTER,params);
  let hovered=false,pressed=false,focused=false,selected=false,enabled=true,dark=false,mouseButton=0,action=run,lastWidth=w,lastHeight=h;
  const origins=new Map<Node,Vec3>(),motions=new Map<Node,Tween<Node>>();
  component.transition=Button.Transition.NONE;
  const paint=()=>{if(!n.isValid||!face.isValid)return;const state:UIControlState={width:transform.width,height:transform.height,hovered,pressed,focused,selected,enabled,dark};baseGraphics.clear();this.paintControlBase(baseGraphics,l,state,style);g.clear();this.paintControl(g,l,state,style);decorate?.(g,l,state);if(!enabled)l.color=new Color(C.disabledInk);};
  const moveVisuals=(down:boolean,animate=true)=>{
   if(!n.isValid)return;
   const distance=(this.touch?M.touchDepth:M.depth)-1,reduced=this.motionPreference?.()??this.reducedMotion;
   for(const child of n.children){
    if(child===base||!child.isValid)continue;
    motions.get(child)?.stop();motions.delete(child);
    const origin=origins.get(child)??child.position.clone();origins.set(child,origin);
    const target=new Vec3(origin.x,origin.y-(down?distance:0),origin.z);
    if(reduced||!animate){child.setPosition(target);if(!down)origins.delete(child);continue;}
    const motion=tween(child).to(down?.055:.18,{position:target},{easing:down?'quadOut':'backOut'}).call(()=>{if(motions.get(child)===motion){motions.delete(child);if(!down)origins.delete(child);}});
    motions.set(child,motion);motion.start();
   }
  };
  const press=(value:boolean)=>{if(!enabled)value=false;if(pressed===value)return;pressed=value;paint();moveVisuals(value);};
  const resizeLabel=()=>{const labelTransform=l.node.getComponent(UITransform)!;labelTransform.setContentSize(Math.max(1,labelTransform.width+transform.width-lastWidth),Math.max(1,labelTransform.height+transform.height-lastHeight));for(const layer of [base,face])layer.getComponent(UITransform)!.setContentSize(transform.width,transform.height);lastWidth=transform.width;lastHeight=transform.height;paint();};
  const invoke=(callback:()=>void)=>{if(enabled&&component.interactable&&n.isValid&&n.activeInHierarchy)callback();};
  const activate=()=>{if(!enabled||!component.interactable||!n.isValid||!n.activeInHierarchy)return;moveVisuals(true,false);moveVisuals(false);invoke(action);};
  const cursor=(inside:boolean)=>{if(typeof document!=='undefined')document.body.style.cursor=inside?(enabled?'pointer':'not-allowed'):'default';};
  // Keep pointer click and an optional keyboard activation override distinct (sliders use both).
  n.on(Button.EventType.CLICK,()=>{if(mouseButton===0)invoke(run);});
  n.on(Node.EventType.MOUSE_DOWN,(event:{getButton:()=>number})=>{mouseButton=event.getButton();if(mouseButton===0)press(true);});
  n.on(Node.EventType.MOUSE_UP,()=>press(false));
  n.on(Node.EventType.TOUCH_START,()=>{if(!enabled)return;mouseButton=0;press(true);});
  n.on(Node.EventType.TOUCH_END,()=>press(false));n.on(Node.EventType.TOUCH_CANCEL,()=>press(false));
  n.on(Node.EventType.MOUSE_ENTER,()=>{hovered=true;paint();cursor(true);});
  n.on(Node.EventType.MOUSE_LEAVE,()=>{hovered=false;press(false);paint();cursor(false);});
  // Panel actions set their final font and text box after creation; repaint that geometry once.
  l.node.on(Node.EventType.SIZE_CHANGED,paint);
  n.on(Node.EventType.SIZE_CHANGED,resizeLabel);paint();
  return {node:n,label:l,key,primary:!!style.primary,get activate(){return activate;},set activate(value:()=>void){action=value;},
   focus:value=>{focused=value&&enabled;paint();},select:value=>{selected=value;paint();},
   tone:value=>{if(dark!==value){dark=value;paint();}},
   resize:(width,height)=>{transform.setContentSize(Math.max(1,width),Math.max(1,height));paint();},
   setEnabled:value=>{enabled=value;component.interactable=value;if(!value){pressed=false;focused=false;moveVisuals(false,false);}if(hovered)cursor(true);paint();}};
 }
 private controlGeometry(s:UIControlState,style:UIControlStyle,label:Label):{w:number;h:number;radius:number;depth:number}{
  const inset=Math.max(0,style.inset??0),depth=s.enabled?(this.touch?M.touchDepth:M.depth):1;
  const w=Math.max(1,s.width-Math.max(inset,M.faceInsetX)*2);
  if(style.round){const diameter=Math.max(1,Math.min(w,s.height-inset*2,s.height*M.faceRatio));return {w:diameter,h:diameter,depth,radius:diameter/2};}
  // Artwork/portrait cards need their full height. Only ordinary text controls become pills.
  const card=style.contentCard??s.height>128;
  let h=Math.max(1,Math.min(s.height-inset*2,s.height*(card?1:s.height>104?.9:M.faceRatio))-(card?6:0));
  if(!card&&label.node.active&&label.string){
   const textWidth=Math.max(1,Math.min(label.node.getComponent(UITransform)!.width,w-16));
   const lines=label.string.split('\n').reduce((count,line)=>count+Math.max(1,label.enableWrapText?Math.ceil(Array.from(line).reduce((sum,char)=>sum+(char.charCodeAt(0)>255?1:.56),0)*label.fontSize/textWidth):1),0);
   const lineHeight=Math.max(label.lineHeight,label.fontSize*1.2);
   h=Math.min(Math.max(1,s.height-6),Math.max(h,lines*lineHeight+12));
  }
  return {w,h,depth,radius:Math.min(card?(this.touch?M.touchRadius:M.radius):h/2,w/2,h/2)};
 }
 private paintControlBase(g:Graphics,label:Label,s:UIControlState,style:UIControlStyle):void{
  const {w,h,radius,depth}=this.controlGeometry(s,style,label);
  if(s.enabled){for(const [spread,alpha] of [[3,4],[1,7]]){g.fillColor=new Color(97,69,40,alpha);g.roundRect(-w/2-spread,-h/2-depth-1-spread/2,w+spread*2,h+spread,radius+spread);g.fill();}}
  g.fillColor=new Color(!s.enabled?C.disabledBorder:style.primary?C.accentBase:s.dark?C.darkBase:C.surfaceBase);g.roundRect(-w/2,-h/2-depth,w,h,radius);g.fill();
 }
 private paintControl(g:Graphics,label:Label,s:UIControlState,style:UIControlStyle):void{
  const active=s.enabled&&(s.hovered||s.focused),pressed=s.enabled&&s.pressed,light=style.quiet||style.textOnly||style.bare;
  const {w,h,radius}=this.controlGeometry(s,style,label);
  let fill:string=C.surface,border:string=C.border,ink:string=C.ink;
  if(s.dark&&light){fill=C.darkSurface;border=C.darkBorder;ink=C.darkInk;}
  if(light){fill=s.dark?C.darkSurface:C.surface;border=s.dark?C.darkBorder:C.rule;}
  if(s.selected){fill=s.dark?C.darkHover:C.selected;border=C.accent;ink=s.dark?C.darkInk:C.accent;}
  if(active){fill=s.dark&&light?C.darkHover:C.hover;border=s.dark&&light?C.darkBorder:C.border;ink=s.dark&&light?C.darkInk:C.accent;}
  if(pressed){fill=s.dark&&light?C.darkPressed:C.pressed;border=s.dark&&light?C.darkInk:C.accent;ink=s.dark&&light?C.darkInk:C.accentPressed;}
  if(style.primary){fill=pressed?C.accentPressed:active?C.accentHover:C.accent;border=fill;ink=C.onAccent;}
  if(!s.enabled){fill=C.disabled;border=C.disabledBorder;ink=C.disabledInk;}
  g.fillColor=new Color(fill);g.strokeColor=new Color(border);g.lineWidth=s.selected?2:M.border;g.roundRect(-w/2,-h/2,w,h,radius);g.fill();g.stroke();label.color=new Color(ink);
  if(s.enabled&&!pressed&&w>12&&h>12){
   // A restrained upper rim follows both curves instead of drawing a glossy flat stripe.
   const rim=Math.max(1,radius-2),cy=h/2-radius,left=-w/2+radius,right=w/2-radius;
   g.strokeColor=new Color(style.primary?'#e9b59b80':'#ffffffa0');g.lineWidth=1;
   for(let i=0;i<=8;i++){const a=Math.PI*(.88-i*.38/8),x=left+Math.cos(a)*rim,y=cy+Math.sin(a)*rim;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}
   for(let i=0;i<=8;i++){const a=Math.PI*(.5-i*.38/8);g.lineTo(right+Math.cos(a)*rim,cy+Math.sin(a)*rim);}g.stroke();
  }
  if(s.selected&&!style.bare){const length=Math.max(1,Math.min(w-24,Math.max(24,label.string.length*label.fontSize*.7))),y=-h/2+7;g.strokeColor=new Color(s.enabled?(s.dark?C.darkInk:C.accent):C.disabledInk);g.lineWidth=2;g.moveTo(-length/2,y);g.lineTo(length/2,y);g.stroke();}
  if(s.focused&&s.enabled&&w>8&&h>8){g.strokeColor=new Color(style.primary?C.onAccent:s.dark?C.darkInk:C.accent);g.lineWidth=M.focus;g.roundRect(-w/2+3,-h/2+3,w-6,h-6,Math.max(1,radius-3));g.stroke();}
 }
 closeButton(parent:Node,x:number,y:number,w:number,h:number,activate:()=>void):UIButton{
  const inset=Math.max(0,(Math.min(w,h)-(this.touch?52:36))/2);
  return this.control(parent,'ui.close',x,y,w,h,activate,{}, {quiet:true,inset,round:true},(g,label,state)=>{
   label.node.active=false;
   const size=Math.min(this.touch?11:9,state.width/4,state.height/4),halfStroke=this.touch?1.6:1.25;
   g.fillColor=new Color(state.enabled?(state.pressed?C.accentPressed:state.hovered||state.focused?C.accent:C.ink):C.disabledInk);
   // Filled strokes remain visible after the game canvas scales down on phones.
   for(const direction of [-1,1]){const offset=halfStroke/Math.SQRT2;g.moveTo(-size-direction*offset,-direction*size+offset);g.lineTo(size-direction*offset,direction*size+offset);g.lineTo(size+direction*offset,direction*size-offset);g.lineTo(-size+direction*offset,-direction*size-offset);g.close();g.fill();}
  });
 }
 scroll(parent:Node,x:number,y:number,w:number,h:number,contentHeight:number):{root:Node;content:Node;scroll:ScrollView}{const n=this.create('PaperScroll',parent,x,y,w,h);const viewport=this.create('PaperRow',n,0,0,w,h);const mask=viewport.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_RECT;const content=this.create('PaperRow',viewport,0,h/2,w,Math.max(h,contentHeight));content.getComponent(UITransform)!.setAnchorPoint(.5,1);const scroll=n.addComponent(ScrollView);scroll.content=content;scroll.horizontal=false;scroll.vertical=true;scroll.inertia=true;scroll.elastic=true;scroll.brake=.6;return {root:n,content,scroll};}
 setReducedMotion(value:boolean):void{this.reducedMotion=value;}
 transition(n:Node,reduceMotion=false):void{this.reducedMotion=reduceMotion;if(reduceMotion)return;const opacity=n.getComponent(UIOpacity)??n.addComponent(UIOpacity);opacity.opacity=225;tween(opacity).to(.16,{opacity:255}).start();}
}
